import {FIT_CANDIDATE_COUNT,WEB_FIT_CANDIDATE_COUNT,fitterLabel} from './fitter-settings';
import {collectEqCandidates} from './eq-candidate-core';
import {recommendCandidates,recommendDeviceFits,CLOSE_FIT_RMS_DB} from './eq-recommendation';
import {createFitRunner} from './autoeq-runner';
import {correction} from './autoeq-fit';
import {at,fitGrid,createEngine} from './peqdb-engine';
import {response} from './autoeq';
import {automaticChannelCorrection} from './channel-balance';
import {peakBoost} from './preference-finalize';
import wasmFactory from 'production-wasm';
import bytes from 'production-bytes';

const rate=48000,flat=[[20,0],[20000,0]];
const runner=createFitRunner(()=>createEngine(opts=>wasmFactory({...opts,locateFile:name=>new URL(name,'https://library.invalid/').href}),bytes));
function quantize(filters,plus){
  const out=[];
  for(const f of filters){
    const gain=Math.round(f.gain*10)/10,q=Math.round(f.q*1024)/1024,hz=Math.round(f.hz);
    if(![gain,q,hz].every(Number.isFinite)||q<10/1024||q>(plus?63:15)||hz<10||hz>22000||Math.abs(gain)>50)return null;
    if(gain!==0)out.push({...f,hz,q,gain});
  }
  return out;
}
const curve=filters=>fitGrid.map(hz=>filters.reduce((v,f)=>v+response(hz,f,rate),0));
// Evaluate filter boosts before preamp on a dense 20 Hz–20 kHz grid at the device fit rate.
const peakGrid=Array.from({length:4097},(_,i)=>20*1000**(i/4096));
const spectrum=filters=>peakGrid.map(hz=>filters.reduce((sum,f)=>sum+response(hz,f,rate),0));
function combinedPeak(a,b) {
  let peak=0;
  for(let i=0;i<peakGrid.length;i++)peak=Math.max(peak,a[i]+b[i]);
  return peak;
}
const gainOK=db=>Number.isFinite(db)&&Math.abs(db)<=24;
export async function search({raw,target,match,plus,type,allBand=false},progress=()=>{}){
  const includeAllBand=allBand===true;
  const fitCount=includeAllBand?WEB_FIT_CANDIDATE_COUNT:FIT_CANDIDATE_COUNT;
  const wanted=correction(raw,target,'export').map(p=>p[1]);
  const user=[], matches=[];
  const custom=match?.channelMatchMode==='custom' && match.channelMatchPreset;
  const auto=!custom && match?.leftPoints?.length && match?.rightPoints?.length;
  const delta=auto ? fitGrid.map(hz=>automaticChannelCorrection(hz,match.leftPoints,match.rightPoints,match.leftLevelDb||0,match.rightLevelDb||0)) : fitGrid.map(()=>0);
  const center=auto?at(fitGrid.map((hz,i)=>[hz,delta[i]]),1000):0;
  // Keep the absolute left/right level difference. Common headroom does not change tonal RMS.
  function addMatch(left,right,lp,rp,label){
    left=quantize(left,plus);right=quantize(right,plus);
    if(!left||!right||!gainOK(lp)||!gainOK(rp)||Math.max(left.length,right.length)>(plus?20:10))return;
    const balance=(Math.round(10*lp)-Math.round(10*rp))/20;
    matches.push({left,right,lp,rp,label,ls:spectrum(left),rs:spectrum(right),l:curve(left).map(v=>v+balance),r:curve(right).map(v=>v-balance)});
  }
  if(custom){
    const [l,r]=custom.channels;addMatch(l.filters,r.filters,l.preampDb,r.preampDb,'Saved channel match');
  }else if(auto){addMatch([],[],Math.min(0,2*center),Math.min(0,-2*center),'Level match');}
  else addMatch([],[],0,0,'No channel correction');
  const siteFits=await collectEqCandidates(async req=>(await runner(req)).results,raw,target,new AbortController().signal,
    n=>progress('Main EQ '+n+' / '+fitCount),type,includeAllBand);
  const awards=recommendCandidates(siteFits,{raw,target}),general=recommendCandidates(siteFits);
  const variants=awards.lowerBoost?.reducedBoost?[...siteFits,awards.lowerBoost]:siteFits;
  const options=[];
  for(const result of variants){
    const {method,bands}=result;
    const label=includeAllBand?fitterLabel(result):method+' · '+bands+' bands';
    progress(label);
    const req={raw,targets:[target],kind:'export',bands,method,headphoneType:type,sampleRate:rate,legacyPriority:'close'};
    const filters=quantize(result.filters,plus),index=options.length;
    const labels=[];
    if(result===awards.bestError)labels.push('Target match');
    if(result===awards.lowerBoost)labels.push('Lower boost');
    if(result===general.recommended)labels.push('Recommended');
    if(Math.abs(result.preamp-awards.leastHeadroom.preamp)<.05)labels.push('Least preamp reduction');
    options.push({label:fitterLabel(result), method,bands,labels,rms:result.rms,preamp:result.preamp,filters:result.filters,fallback:result.fallbackReason||''});
    if(filters && filters.length<=(plus?30:10) && gainOK(result.preamp))user.push({index,filters,preamp:result.preamp,label:fitterLabel(result),spectrum:spectrum(filters),y:curve(filters)});
    if(auto && !result.reducedBoost){
      const reqMatch={...req,raw:flat,targets:[fitGrid.map((hz,i)=>[hz,delta[i]])]};
      const [m]=(await runner(reqMatch)).results, left=m.filters, right=left.map(f=>({...f,gain:-f.gain}));
      const atten=Math.ceil((Math.max(0,center+peakBoost(left),-center+peakBoost(right))+1.5)*10)/10;
      addMatch(left,right,center-atten,-center-atten,includeAllBand?label:method+' · '+bands);
    }
  }
  const ranked=[];
  for(const [ui,u] of user.entries())for(const [mi,m] of matches.entries()){
    const q=u.filters.length,l=m.left.length,r=m.right.length;
    if(plus && Math.max(0,q-10)+Math.max(l,r)>20)continue;
    // A saved custom correction is the reference for that stage. Preserve it byte-for-byte after hardware quantization.
    let loss=0;
    for(let i=0;i<wanted.length;i++){
      const common=wanted[i]-u.y[i];
      const left=common+(custom?0:delta[i]-m.l[i]),right=common+(custom?0:-delta[i]-m.r[i]);
      loss+=left*left+right*right;
    }
    const rms=Math.sqrt(loss/(2*wanted.length));
    if(!Number.isFinite(rms))throw Error('Invalid fit response.');
    const peak=Math.max(combinedPeak(u.spectrum,m.ls),combinedPeak(u.spectrum,m.rs));
    ranked.push({rms,peak,count:q+l+r,ui,mi});
  }
  ranked.sort((a,b)=>a.rms-b.rms || a.count-b.count);
  const {best,close}=recommendDeviceFits(ranked);
  return {windowDb:CLOSE_FIT_RMS_DB,choices:[ranked.indexOf(best),ranked.indexOf(close)],options,ranked,user:user.map(({index,filters,preamp,label})=>({index,filters,preamp,label})),
    matches:matches.map(({left,right,lp,rp,label})=>({channels:[{filters:left,preamp:lp},{filters:right,preamp:rp}],label}))};

}
let candidates=[];
self.onmessage=async e=>{
  if(Array.isArray(e.data.allowed)){
    const allowed=e.data.allowed.map(index=>candidates[index]).filter(Boolean);
    const {best,close}=recommendDeviceFits(allowed);
    postMessage({choices:[candidates.indexOf(best),candidates.indexOf(close)]});return;
  }
  try{const result=await search(e.data,m=>postMessage({progress:m}));candidates=result.ranked;postMessage({result});}
  catch(e){postMessage({error:e.message||'The production fitter could not complete the comparison.'});}
};
