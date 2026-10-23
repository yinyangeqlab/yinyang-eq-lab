import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=fs.readFileSync('components/music-panel.tsx','utf8');
const ast=ts.createSourceFile('music-panel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),functions=[];
function visit(node){if(ts.isFunctionDeclaration(node)&&['refreshMusicVotes','voteForMusic'].includes(node.name?.text))functions.push(node.getText(ast));ts.forEachChild(node,visit)}visit(ast);
assert.equal(functions.length,2);
function fixture(){
 const state={agreement:{ask:async then=>then()},musicVoteRequest:{current:0},candidateUrl:'song',candidateUrlRef:{current:'song'},personalOnly:false,adminTestOnly:false,adminMusicChoices:()=>({}),musicSaving:false,requests:[],musicCounts:{},musicChoices:{}};
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
await new Promise(resolve=>setImmediate(resolve));
s.requests[3].resolve(snapshot(5));await voting;
s.requests[2].resolve(snapshot(4));await stale;
assert.equal(s.musicCounts.song.keep,5,'a read started before the vote must not undo its updated rank');
assert.equal(s.musicChoices.song,'keep');assert.equal(s.musicSaving,false);
assert.equal(s.requests[3].options.method,'POST');
const undo=s.voteForMusic(null);await new Promise(resolve=>setImmediate(resolve));s.requests[4].resolve({ok:true,json:async()=>({byTrack:{},mine:{},signedIn:true})});await undo;
assert.equal(s.musicCounts.song,undefined,'undo must remove an unrated recording from the community rank');
const personal=fixture();personal.personalOnly=true;
assert.equal(personal.requests.length,0,'Personal must not submit song ratings automatically');
const personalVote=personal.voteForMusic('keep');
await new Promise(resolve=>setImmediate(resolve));
assert.equal(personal.requests[0].url,'/api/music-votes');
assert.equal(personal.requests[0].options.method,'POST');
assert.deepEqual(JSON.parse(personal.requests[0].options.body),{trackUrl:'song',choice:'keep'});
personal.requests[0].resolve(snapshot(6));await personalVote;
assert.equal(personal.musicCounts.song.keep,6);assert.equal(personal.musicChoices.song,'keep');
console.log('PASS actual music snapshot/vote handlers: current community counts, out-of-order reads, vote/read races, undo and explicit Personal song ratings.');

for(const personalOnly of [false,true]) {
const admin=fixture();admin.personalOnly=personalOnly;let saved=0;admin.adminTestOnly=true;admin.saveAdminMusicChoice=(url,choice)=>{saved++;return {[url]:choice};};await admin.voteForMusic('keep');assert.equal(saved,1);assert.equal(admin.requests.length,0);assert.equal(admin.musicChoices.song,'keep');
}
console.log('PASS admin song choices use local test storage without any vote POST.');
