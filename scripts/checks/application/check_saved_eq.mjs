import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let writes = 0;
const cache = new Map(), localStorage = new class extends Map { getItem(k) { return this.get(k) ?? null; } setItem(k,v) { if (this.blocked) throw Error("Storage unavailable"); writes++; this.set(k,v); } };
const window = new EventTarget(); let changes = 0; window.addEventListener('library-eqs-changed', () => changes++);
function load(file) {
  file = path.resolve(file); if (cache.has(file)) return cache.get(file);
  const mod = { exports: {} }; cache.set(file, mod.exports);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,Float32Array,Float64Array,ArrayBuffer,DataView,Math,Number,Error,crypto,localStorage,window,Event,setTimeout,require(name){const resolved=name.startsWith('@/')?path.resolve('site',name.slice(2)):path.resolve(path.dirname(file),name);return load(resolved.endsWith('.ts')?resolved:resolved+'.ts');}});
  return mod.exports;
}
let sweeps = 0;
const finalizer = load('site/lib/preference-finalize.ts'), originalPeakBoost = finalizer.peakBoost;
finalizer.peakBoost = filters => { sweeps++; return originalPeakBoost(filters); };
const { safeLibraryEq, saveLibraryEq, readLibraryEqs, removeLibraryEq, removeLibraryEqs, measurementChannelMatch, parseLibraryEq, LIBRARY_EQ_KEY } = load('site/lib/music-library-eq.ts');
const { channelMatchWav, channelMatchIirText, safeChannelMatch } = load('site/lib/channel-match-export.ts');
const { parseChannelMatchPreset, presetFilterResponse, presetResponse } = load('site/lib/peq-preset.ts');
const { parseMeasurement } = load('site/lib/measurement.ts');
const { replaceEqStage } = load('site/lib/eq-playback.ts');
const points = Array.from({length:21},(_,i)=>[20*1000**(i/20),0]);
const model = {leftPoints:points,rightPoints:points.map(([hz])=>[hz,6]),channelMatchMode:'auto'};
const eq={id:'a',name:'Fixture EQ',source:'Tuning',filters:[{hz:1000,gain:2,q:1}],preamp:-4,channelMatch:measurementChannelMatch(model)};
saveLibraryEq(eq); assert.equal(changes,1); assert.equal(readLibraryEqs()[0].channelMatch.rightPoints[0][1],6);
model.rightPoints[0][1]=12; assert.equal(readLibraryEqs()[0].channelMatch.rightPoints[0][1],6,'Saved EQ keeps an immutable match snapshot');
assert.throws(()=>safeChannelMatch({...model,leftPoints:[[20,NaN]]}));
assert.throws(()=>saveLibraryEq({...eq,id:'invalid',channelMatch:{leftPoints:points}})); assert.equal(readLibraryEqs().length,1,'Invalid save preserves collection');
saveLibraryEq({...eq,id:'legacy',channelMatch:undefined}); assert.equal(readLibraryEqs().length,2,'Existing presets need no channel match');
removeLibraryEq('a'); assert.equal(changes,3); assert.deepEqual([...readLibraryEqs().map(row=>row.id)],['legacy']);
localStorage.setItem(LIBRARY_EQ_KEY,'broken'); assert.equal(readLibraryEqs().length,0); saveLibraryEq(eq);
assert.throws(()=>parseLibraryEq('CH: 0\nPreamp: -2 dB\nFilter 1: ON PK Fc 1000 Hz Gain 1 dB Q 1\nCH: 1\nPreamp: -2 dB','two-channel'),/channel-match/);
const broadLine = 'Filter 1: ON PK Fc 18000 Hz Gain -1 dB Q 0.074123';
const broadEq = parseLibraryEq('Preamp: -8.5 dB\n' + broadLine, 'Wide-Q synthetic EQ');
try {
  saveLibraryEq(broadEq);
  const restored = readLibraryEqs().find(row => row.id === broadEq.id);
  assert.equal(restored.filters[0].q, 0.074123, 'Collection round trip preserves imported Q');
  assert.equal(restored.preamp, -8.5, 'Collection keeps the supplied safe preamp');
} finally {
  removeLibraryEq(broadEq.id);
}
const broadChannels = parseChannelMatchPreset('CH: 0\nPreamp: -2 dB\n' + broadLine + '\nCH: 1\nPreamp: -2 dB');
const restoredMeasurement = parseMeasurement({ id: 'wide-q-fixture', name: 'Fixture', device: 'Fixture', type: 'oe', rig: 'Fixture', points, channelMatchPreset: broadChannels, channelMatchMode: 'custom' });
assert.equal(restoredMeasurement.channelMatchPreset.channels[0].filters[0].q, 0.074123, 'Measurement validation preserves imported channel-match Q');
const wav=channelMatchWav(eq.channelMatch), view=new DataView(wav);
assert.equal(view.getUint16(20,true),3);assert.equal(view.getUint16(22,true),2);assert.equal(view.getUint32(24,true),48000);assert.equal(view.getUint32(40,true),8192*8);
function magnitude(ch,hz){let re=0,im=0;for(let i=0;i<8192;i++){const value=view.getFloat32(44+i*8+ch*4,true),angle=2*Math.PI*hz*i/48000;re+=value*Math.cos(angle);im-=value*Math.sin(angle);}return 20*Math.log10(Math.hypot(re,im));}
assert.ok(Math.abs(magnitude(0,1000)-magnitude(1,1000)-6)<.05,'Stereo WAV corrects the 6 dB ear mismatch in the correct direction');
assert.ok(magnitude(0,1000)<-1.4,'WAV includes boost headroom');
const flatMatch = parseChannelMatchPreset(channelMatchIirText(eq.channelMatch));
assert.ok(Math.abs(flatMatch.channels[0].preampDb - flatMatch.channels[1].preampDb - 6) < .01, 'TXT preserves broadband left/right correction');
assert.equal(flatMatch.channels[0].filters.length, 0, 'Broadband imbalance only needs a level correction');
const shape = { type:'PK', hz:500, gain:5, q:1 };
const uneven = { ...model, leftLevelDb:-1, rightLevelDb:1, rightPoints:points.map(([hz])=>[hz, 2 * presetFilterResponse(hz, shape, 48000)]) };
const fitted = parseChannelMatchPreset(channelMatchIirText(uneven));
const residual = (hz, db) => 2 + db + presetResponse(hz, fitted, 1, 48000) - presetResponse(hz, fitted, 0, 48000);
assert.ok(uneven.rightPoints.reduce((error,[hz,db])=>error + residual(hz,db)**2,0) < 6, 'TXT corrects the shape and level of a synthetic mismatch');
for (const rate of [44100,48000,96000]) for (const [hz] of points) for (const channel of [0,1]) {
  assert.ok(presetResponse(hz,fitted,channel,rate) < -1.4,'TXT retains shared headroom for both channels');
}
const uploaded = parseChannelMatchPreset('CH: 0\nPreamp: -3 dB\nFilter 1: ON LSC Fc 80 Hz Gain 1 dB Q 0.7\nCH: 1\nPreamp: -2 dB');
assert.deepEqual(parseChannelMatchPreset(channelMatchIirText({channelMatchMode:'custom',channelMatchPreset:uploaded})),uploaded,'Uploaded TXT preserves its original settings');
assert.deepEqual(parseChannelMatchPreset(channelMatchIirText({...uneven,channelMatchPreset:uploaded})),fitted,'Auto mode exports its own correction even when an uploaded preset is attached');
assert.throws(()=>channelMatchIirText({...model,rightLevelDb:100}),/FIR WAV instead/,'TXT fails clearly when the required levels exceed its format');
const nodes=[];
function node(kind){const n={kind,connections:[],gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}},connect(...args){this.connections.push(args);},disconnect(){this.disconnected=true;}};nodes.push(n);return n;}
const context={sampleRate:48000,currentTime:0,createGain:()=>node('gain'),createIIRFilter:()=>node('iir'),createChannelSplitter:()=>node('splitter'),createChannelMerger:()=>node('merger'),createConvolver:()=>node('convolver'),createBuffer:(_channels,length)=>({copyToChannel(samples){assert.equal(samples.length,length);}})};
const upstream=node('upstream'),output=node('output');
const stage=replaceEqStage(context,upstream,output,eq.filters,undefined,eq.channelMatch);
assert.equal(stage.nodes.length,1);const convolvers=nodes.filter(n=>n.kind==='convolver');assert.equal(convolvers.length,2);assert.ok(convolvers.every(n=>n.normalize===false));assert.equal(convolvers[0].connections[0][2],0);assert.equal(convolvers[1].connections[0][2],1,'Right output stays on the right');
stage.dispose();assert.ok(convolvers.every(n=>n.disconnected));assert.ok(!output.disconnected);
const count=nodes.length; replaceEqStage(context,upstream,output,eq.filters);assert.equal(nodes.slice(count).filter(n=>n.kind==='convolver').length,0,'Match off fully bypasses channel convolution');
// Reuse the established actual-component hook harness without running its unrelated cases.
const harness=fs.readFileSync('scripts/checks/application/check_main_workflows.mjs','utf8');
const helperStart=harness.indexOf('const text='), helperEnd=harness.indexOf('class PlaybackTarget');
const helper=harness.slice(helperStart,helperEnd).replaceAll('import.meta.url',JSON.stringify(new URL('./check_main_workflows.mjs',import.meta.url).href));
const mount=vm.runInNewContext(helper+'\nmount',{fs,vm,ts,require,fileURLToPath,assert,console,URL,Blob,AbortController,Date,JSON,URLSearchParams,queueMicrotask,Error});
let playingEq;
const h=mount('site/components/library-eq-panel.tsx',{props:{onChange:eq=>playingEq=eq},globals:{crypto,localStorage,fetch:async()=>({ok:true,json:async()=>[]})},imports:{'@/lib/music-library-eq':{readLibraryEqs,removeLibraryEq,saveLibraryEq,measurementChannelMatch}}});
h.render();h.find(n=>n.type==='@/components/sound-setup').props.onMode('saved');h.render();h.find(n=>n.type==='@/components/sound-setup').props.onPreset('a');h.render();
h.find(n=>n.type==='input'&&n.props['aria-label']==='Enable EQ').props.onChange({target:{checked:true}});h.render();assert.ok(playingEq.channelMatch,'Channel matching starts on for paired saved responses');
const inputs=(()=>{const collect=(n)=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(collect):[n,...collect(n.props?.children)];return collect(h.tree).filter(n=>n.type==='input'&&n.props.type==='checkbox');})();inputs[1].props.onChange({target:{checked:false}});h.render();assert.equal(playingEq.channelMatch,undefined,'Channel matching can be independently bypassed');inputs[1].props.onChange({target:{checked:true}});h.render();assert.ok(playingEq.channelMatch);assert.equal(playingEq.filters[0].gain,2,'Match toggle preserves saved target EQ');
h.find(n=>n.props?.['aria-label']==='Enable EQ').props.onChange({target:{checked:false}});h.render();assert.equal(playingEq.filters.length,0,'EQ off removes target filters while channel match stays available');assert.ok(playingEq.channelMatch);assert.equal(playingEq.preamp,readLibraryEqs().find(row=>row.id==='a').preamp,'EQ comparison retains the same volume headroom');
removeLibraryEq('a');h.events.get('library-eqs-changed').forEach(fn=>fn());h.render();assert.equal(playingEq,null,'Deletion in My Collection stops a selected EQ in listening panels');h.unmount();
console.log('PASS saved EQ snapshots, legacy storage, validation, deletion notifications, stereo WAV response/headroom, isolated channel routing/disposal and actual listening controls.');

// Dates are created only for genuinely new saves; edits preserve known creation
// times and do not invent a date for older presets that never recorded one.
localStorage.setItem(LIBRARY_EQ_KEY, '[]');
saveLibraryEq({ ...eq, id: 'dated' });
const dated = readLibraryEqs()[0]; assert.ok(dated.createdAt > 0); assert.equal(dated.createdAt, dated.updatedAt);
saveLibraryEq({ ...dated, name: 'Edited', createdAt: 1 });
assert.equal(readLibraryEqs()[0].createdAt, dated.createdAt, 'Editing preserves the original creation time');
localStorage.setItem(LIBRARY_EQ_KEY, JSON.stringify([{ ...eq, id: 'old' }]));
assert.equal(readLibraryEqs()[0].createdAt, undefined, 'Existing EQs retain an honestly unknown saved date');
saveLibraryEq({ ...readLibraryEqs()[0], name: 'Legacy edited' });
assert.equal(readLibraryEqs()[0].createdAt, undefined); assert.ok(readLibraryEqs()[0].updatedAt > 0);
assert.equal(safeLibraryEq({ ...eq, createdAt: NaN, updatedAt: 9e15 }).createdAt, undefined);
assert.equal(safeLibraryEq({ ...eq, updatedAt: 9e15 }).updatedAt, undefined);
const oldSweeps = sweeps;
for (let i=0;i<5;i++) safeLibraryEq({ ...eq, name: 'Metadata edit '+i, preamp: 0 });
assert.equal(sweeps, oldSweeps, 'Unchanged filters reuse the computed safe headroom');
assert.ok(safeLibraryEq({ ...eq, preamp: 0 }).preamp <= -3.5, 'A forged preamp still gets safe attenuation');
safeLibraryEq({ ...eq, filters: [{ hz: 1234, gain: 7, q: 1 }] });
assert.equal(sweeps, oldSweeps + 1, 'Changed filter coefficients must get new headroom analysis');
assert.throws(() => safeLibraryEq({ ...eq, filters: [{ hz: 1000, gain: 2, q: 0 }] }));
const rows=Array.from({length:30},(_,i)=>({ ...eq, id:'bulk-'+i, name:'Bulk '+i, createdAt:1700000000000+i, extra:'preserve', filters:[{hz:1000+i,gain:2,q:1}] }));
localStorage.setItem(LIBRARY_EQ_KEY,JSON.stringify(rows)); readLibraryEqs();
const analysisBefore=sweeps,writesBefore=writes,eventsBefore=changes;
const deleteStart=performance.now();removeLibraryEqs(rows.slice(0,20).map(row=>row.id));const deleteMs=performance.now()-deleteStart;
assert.equal(writes,writesBefore+1,'A bulk delete commits once');assert.equal(changes,eventsBefore+1,'A bulk delete notifies all views once');
assert.equal(sweeps,analysisBefore,'Deletion performs no headroom analysis');
assert.equal(readLibraryEqs().length,10);assert.equal(sweeps,analysisBefore,'Survivors reuse existing safety analysis after refresh');
assert.equal(JSON.parse(localStorage.getItem(LIBRARY_EQ_KEY))[0].extra,'preserve','Deletion preserves every surviving stored field');
assert.equal(readLibraryEqs()[0].createdAt,rows[20].createdAt);
const beforeNoop=writes;removeLibraryEqs([]);removeLibraryEqs(['missing']);assert.equal(writes,beforeNoop);
const retained=localStorage.getItem(LIBRARY_EQ_KEY);localStorage.blocked=true;const eventCount=changes;
assert.throws(()=>removeLibraryEqs(['bulk-20']),/Storage unavailable/);localStorage.blocked=false;
assert.equal(localStorage.getItem(LIBRARY_EQ_KEY),retained);assert.equal(changes,eventCount,'A failed storage write must not notify a false deletion');
localStorage.setItem(LIBRARY_EQ_KEY,JSON.stringify([...JSON.parse(retained),{...eq,id:'other-tab'}]));removeLibraryEqs(['bulk-20']);
assert.ok(readLibraryEqs().some(row=>row.id==='other-tab'),'Deletion preserves an EQ added by another tab since the previous render');
localStorage.setItem(LIBRARY_EQ_KEY,'broken');assert.throws(()=>removeLibraryEqs(['old']));assert.equal(localStorage.getItem(LIBRARY_EQ_KEY),'broken');
// Execute actual collection handlers: individual selection, select all, cancel,
// one confirmed bulk write, and safe failure with the selection retained.
localStorage.setItem(LIBRARY_EQ_KEY,JSON.stringify(rows.slice(0,3)));
const collection=mount('site/components/saved-eq-collection.tsx',{props:{measurements:[],onUpdate(){}},globals:{localStorage,crypto},imports:{'@/lib/music-library-eq':{readLibraryEqs,removeLibraryEq,removeLibraryEqs,saveLibraryEq,measurementChannelMatch}}});
const fireRefresh=()=>{collection.events.get('library-eqs-changed').forEach(fn=>fn());collection.render();};
collection.render();
assert.ok(collection.button('Compare blind').props.disabled);
for (const name of ['Bulk 0','Bulk 1']) {
  collection.find(node=>node.props?.['aria-label']===`Select ${name}`).props.onChange({target:{checked:true}});
  collection.render();
}
assert.equal(collection.find(node=>node.props?.href?.startsWith('/eq-compare#')).props.href,'/eq-compare#saved-eq=bulk-0&saved-eq=bulk-1');
assert.equal(readLibraryEqs().length,3,'Selecting a pair does not write to the collection');
collection.button('Select all').props.onClick();collection.render();collection.button('Delete selected (3)').props.onClick();collection.render();
assert.equal(readLibraryEqs().length,3,'Opening confirmation does not delete anything');collection.button('Cancel').props.onClick();collection.render();assert.equal(readLibraryEqs().length,3);
collection.button('Delete selected (3)').props.onClick();collection.render();localStorage.blocked=true;collection.button('Delete 3 EQs').props.onClick();collection.render();localStorage.blocked=false;
assert.ok(collection.button('Delete 3 EQs'),'A failed write leaves confirmation available for retry');
collection.button('Delete 3 EQs').props.onClick();fireRefresh();assert.equal(readLibraryEqs().length,0);collection.unmount();
console.log('PASS saved EQ dates, cached safe headroom, coefficient invalidation, one-write/one-event bulk deletion, cross-tab preservation, storage failure and actual bulk confirmation/cancel handlers.');
console.log(`Bulk deletion of 20/30 synthetic EQs: ${deleteMs.toFixed(2)} ms; zero frequency sweeps.`);

// Import real settings, never reinterpret a target curve or discard DSP commands.
const text=n=>n==null||typeof n==='boolean'?'':typeof n!=='object'?String(n):Array.isArray(n)?n.map(text).join(''):text(n.props?.children);
const settings19 = '# Synthetic 19-band preset\nPreamp: -11.6 dB\n' + Array.from({length:19},(_,i)=>`Filter ${i+1}: ON PK Fc ${100+i*400} Hz Gain -1 dB Q ${.5+i/10}`).join('\n');
const imported19 = parseLibraryEq(settings19,'Uploaded headphones EQ');
assert.equal(imported19.filters.length,19);
assert.equal(imported19.preamp,-11.6);
assert.equal(imported19.target,undefined,'Import does not invent a target');
assert.equal(imported19.measurementId,undefined,'Import needs no measurement');
const aliases = parseLibraryEq('\uFEFF# APO/Peace export\nChannel: ALL\nPreamp: -6 dB # gain\nFilter: ON PEQ Fc 1000 Hz Gain -.5 dB Q .7\nFilter 2: ON LS Fc 80 Hz Gain 1 dB\nFilter 3: ON HS Fc 8000 Hz Gain -2 dB Q 0.5\nFilter 4: OFF PK Fc 400 Hz Gain 10 dB Q 1','Aliases');
assert.deepEqual([...aliases.filters.map(row=>row.type)],['PK','LSC','HSC']);
assert.equal(aliases.filters[0].q,.7);
assert.equal(aliases.filters[1].q,Math.SQRT1_2);
assert.equal(parseLibraryEq('Preamp: -2 dB\nPreamp: -3 dB\nFilter 1: ON PK Fc 1000 Hz Gain -1 dB Q 1','Cumulative preamp').preamp,-5);
for (const command of ['Include: another.txt','Convolution: impulse.wav','GraphicEQ: 20 1; 1000 0','Channel: R','CH: 2','Filter 20: ON HP Fc 100 Hz Q .7']) {
  assert.throws(()=>parseLibraryEq(settings19+'\n'+command,'Unsupported'),/Unsupported|separate Left\/Right/,'Unsupported processing must not be silently dropped');
}
assert.throws(()=>parseLibraryEq('20, 0\n1000, 2\n20000, 0','A target'),/target or measurement/);
assert.throws(()=>parseLibraryEq('Filter 1: ON PK Fc 1000 Hz Gain 2 dB','No Q'),/Q value/);

// Exercise the actual file input handler with shared storage and its publication event.
localStorage.setItem(LIBRARY_EQ_KEY,JSON.stringify([eq]));
const notificationsBefore=changes;
let chosenImport;
const uploader=mount('site/components/library-eq-upload.tsx',{props:{onImported:row=>chosenImport=row},globals:{localStorage,crypto},imports:{'@/lib/music-library-eq':{parseLibraryEq,saveLibraryEq}}});
const uploadFile = async file => {
  const input={files:[file],value:'chosen.txt'};
  uploader.find(n=>n.type==='input'&&n.props.type==='file').props.onChange({target:input});
  assert.equal(input.value,'','Input permits choosing the same file after an error');
  await new Promise(resolve=>setImmediate(resolve));uploader.render();
};
await uploadFile({name:'My actual EQ.txt',size:settings19.length,text:async()=>settings19});
assert.equal(changes,notificationsBefore+1,'Import notifies all listening areas once');
assert.equal(chosenImport.name,'My actual EQ');
const freshImport=readLibraryEqs().find(row=>row.id===chosenImport.id);
assert.deepEqual([...freshImport.filters.map(row=>[row.type,row.hz,row.gain,row.q])],[...imported19.filters.map(row=>[row.type,row.hz,row.gain,row.q])],'Reload uses every uploaded filter unchanged');
assert.ok(readLibraryEqs().some(row=>row.id===eq.id),'Import preserves existing EQs');
assert.match(text(uploader.tree),/Saved My actual EQ/);
const unchanged=localStorage.getItem(LIBRARY_EQ_KEY), selectedBefore=chosenImport;
await uploadFile({name:'target.txt',size:24,text:async()=>'20 0\n1000 2\n20000 0'});
assert.match(text(uploader.tree),/target or measurement/);
assert.equal(localStorage.getItem(LIBRARY_EQ_KEY),unchanged);
assert.equal(chosenImport,selectedBefore,'Failed import leaves listening selection intact');
let fileRead=false;
await uploadFile({name:'too-large.txt',size:100001,text:async()=>{fileRead=true;return settings19;}});
assert.equal(fileRead,false,'Oversize files are rejected before reading');
localStorage.blocked=true;
await uploadFile({name:'valid.txt',size:settings19.length,text:async()=>settings19});
localStorage.blocked=false;
assert.match(text(uploader.tree),/Storage unavailable/);
assert.equal(localStorage.getItem(LIBRARY_EQ_KEY),unchanged);
assert.equal(chosenImport,selectedBefore);
const full = JSON.stringify(Array.from({length:30}, (_, i) => ({...eq, id:`existing-${i}`})));
localStorage.setItem(LIBRARY_EQ_KEY,full);
await uploadFile({name:'new.txt',size:settings19.length,text:async()=>settings19});
assert.match(text(uploader.tree),/30 saved EQs/);
assert.equal(localStorage.getItem(LIBRARY_EQ_KEY),full,'A full collection rejects an import rather than evicting a preset');
uploader.unmount();

const soundImport=mount('site/components/sound-setup.tsx',{props:{mode:'saved',onMode(){},onPreset:id=>chosenImport=id,headphones:null,target:null,presets:[],presetId:''},imports:{'./library-eq-upload':{default:'upload-fixture'}}});
soundImport.find(n=>n.type==='upload-fixture').props.onImported(freshImport);
assert.equal(chosenImport,freshImport.id,'Tuning and Music library select an imported EQ immediately');
soundImport.unmount();
const emptyCollection=mount('site/components/saved-eq-collection.tsx',{props:{measurements:[],onUpdate(){}},imports:{'./library-eq-upload':{default:'upload-fixture'},'@/lib/music-library-eq':{readLibraryEqs:()=>[],measurementChannelMatch}}});
emptyCollection.find(n=>n.type==='upload-fixture');
assert.match(text(emptyCollection.tree),/Upload an EQ TXT above/,'Empty collection exposes the full-EQ importer');
emptyCollection.unmount();
console.log('PASS full-EQ file import, 19-filter fidelity, APO/Peace syntax, fail-closed DSP/channel validation, target-file guidance, storage failure, selection and empty-collection upload.');
console.log(`Bulk deletion of 20/30 synthetic EQs: ${deleteMs.toFixed(2)} ms; zero frequency sweeps.`);
