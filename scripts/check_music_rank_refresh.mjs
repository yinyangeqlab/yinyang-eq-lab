import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=fs.readFileSync('components/music-panel.tsx','utf8');
const ast=ts.createSourceFile('music-panel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),functions=[];
function visit(node){if(ts.isFunctionDeclaration(node)&&['refreshMusicVotes','voteForMusic'].includes(node.name?.text))functions.push(node.getText(ast));ts.forEachChild(node,visit)}visit(ast);
assert.equal(functions.length,2);
function fixture(){
 const state={musicVoteRequest:{current:0},candidateUrl:'song',candidateUrlRef:{current:'song'},personalOnly:false,adminTestOnly:false,adminMusicChoices:()=>({}),musicSaving:false,requests:[],musicCounts:{},musicChoices:{}};
 state.fetch=(url,options)=>new Promise(resolve=>state.requests.push({url,options,resolve}));
 for(const key of ['AdminTestOnly','MusicCounts','MusicChoices','MusicSignedIn','MusicVotesReady','MusicVoteMessage','MusicSaving'])state['set'+key]=value=>state[key[0].toLowerCase()+key.slice(1)]=value;
 vm.createContext(state);vm.runInContext(ts.transpileModule(functions.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,state);
 return state;
}
const snapshot=keep=>({ok:true,json:async()=>({byTrack:{song:{keep,pass:0}},mine:{song:'keep'},signedIn:true})});
const s=fixture();
const first=s.refreshMusicVotes(),newer=s.refreshMusicVotes();
s.requests[1].resolve(snapshot(4));await newer;s.requests[0].resolve(snapshot(1));await first;
assert.equal(s.musicCounts.song.keep,4,'older rank read must not overwrite a newer snapshot');
assert.equal(s.musicVotesReady,true);
const stale=s.refreshMusicVotes(),voting=s.voteForMusic('keep');
s.requests[3].resolve(snapshot(5));await voting;
s.requests[2].resolve(snapshot(4));await stale;
assert.equal(s.musicCounts.song.keep,5,'a read started before the vote must not undo its updated rank');
assert.equal(s.musicChoices.song,'keep');assert.equal(s.musicSaving,false);
assert.equal(s.requests[3].options.method,'POST');
const undo=s.voteForMusic(null);s.requests[4].resolve({ok:true,json:async()=>({byTrack:{},mine:{},signedIn:true})});await undo;
assert.equal(s.musicCounts.song,undefined,'undo must remove an unrated recording from the community rank');
const local=fixture();local.personalOnly=true;await local.voteForMusic('keep');assert.equal(local.requests.length,0,'Personal must not gain automatic vote writes');
console.log('PASS actual music snapshot/vote handlers: current community counts, out-of-order reads, vote/read races, undo and Personal write protection.');

const admin=fixture();let saved=0;admin.adminTestOnly=true;admin.saveAdminMusicChoice=(url,choice)=>{saved++;return {[url]:choice};};await admin.voteForMusic('keep');assert.equal(saved,1);assert.equal(admin.requests.length,0);assert.equal(admin.musicChoices.song,'keep');
console.log('PASS admin song choices use local test storage without any vote POST.');
