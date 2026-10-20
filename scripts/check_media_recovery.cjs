const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),ts=require('typescript');
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/media-recovery.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,URL,setTimeout,clearTimeout,AbortSignal,fetch:async()=>({ok:true})});
const {attachMediaRecovery,cancelMediaRecovery}=mod.exports;
class Audio extends EventTarget {
 src='https://example.test/api/listening-audio/test';paused=false;currentTime=120;duration=241;readyState=4;error=null;seeking=false;volume=.37;playbackRate=1.25;loads=0;plays=0;
 event(name){this.dispatchEvent(new Event(name))}
 load(){this.loads++;this.playbackRate=1;this.error=null;this.currentTime=0;this.paused=true;this.readyState=0;this.event('loadstart')}
 async play(){this.plays++;this.paused=false;this.event('play')}
 metadata(){this.readyState=4;this.event('loadedmetadata')}
 fail(){this.error={code:2};this.paused=true;this.event('pause')}
}
const delay=ms=>new Promise(done=>setTimeout(done,ms));
(async()=>{
 let a=new Audio(),events=[],r=attachMediaRecovery(a,{retryDelayMs:1,stallMs:1000,onRecovering:()=>events.push('retry'),onRecovered:()=>events.push('recovered'),onFailure:()=>events.push('failed')});
 a.event('play');a.currentTime=175;a.event('seeking');a.fail();assert.equal(r.handleError(),true);await delay(8);assert.equal(a.loads,1);a.metadata();await delay(0);assert.equal(a.currentTime,175);assert.equal(a.paused,false);assert.equal(a.volume,.37);assert.equal(a.playbackRate,1.25);a.event('playing');assert.deepEqual(events,['retry','recovered']);r.dispose();
 // A paused listener stays paused after an interrupted seek.
 a=new Audio();a.paused=true;r=attachMediaRecovery(a,{retryDelayMs:1,stallMs:1000,onRecovering(){},onRecovered(){},onFailure(){}});a.fail();assert.equal(r.handleError(),true);await delay(8);a.metadata();a.event('seeked');assert.equal(a.plays,0);assert.equal(a.currentTime,120);r.dispose();
 // Starting another library preview cancels pending autoplay from this one.
 a=new Audio();r=attachMediaRecovery(a,{retryDelayMs:1,stallMs:1000,onRecovering(){},onRecovered(){},onFailure(){}});a.event('play');a.fail();r.handleError();cancelMediaRecovery(a);await delay(8);a.metadata();a.event('seeked');assert.equal(a.plays,0);r.dispose();
 // Changing recordings or unmounting cancels a pending recovery.
 for(const dispose of [false,true]){a=new Audio();r=attachMediaRecovery(a,{retryDelayMs:15,onRecovering(){},onRecovered(){},onFailure(){}});a.fail();r.handleError();if(dispose)r.dispose();else{a.src='https://example.test/api/listening-audio/other';a.event('loadstart')}await delay(30);assert.equal(a.loads,0);r.dispose()}
 // Unsupported/local files do not retry; persistent failures are bounded.
 for(const [src,code] of [['blob:device',2],['https://example.test/api/listening-audio/test',4]]){a=new Audio();a.src=src;a.error={code};r=attachMediaRecovery(a,{onRecovering(){},onRecovered(){},onFailure(){}});assert.equal(r.handleError(),false);r.dispose()}
 a=new Audio();let failed=0;r=attachMediaRecovery(a,{retryDelayMs:1,stallMs:1000,maxRetries:2,onRecovering(){},onRecovered(){},onFailure(){failed++}});for(let i=0;i<3;i++){a.fail();r.handleError();await delay(8)}assert.equal(a.loads,2);assert.equal(failed,1);r.dispose();
 // A genuine stall also reconnects, while Pause cancels a stall watchdog.
 for(const pause of [false,true]){a=new Audio();r=attachMediaRecovery(a,{stallMs:10,retryDelayMs:1,onRecovering(){},onRecovered(){},onFailure(){}});a.event('waiting');if(pause){a.paused=true;a.event('pause')}await delay(25);if(pause)assert.equal(a.loads,0);else assert(a.loads>=1&&a.loads<=3);r.dispose()}
 console.log('Media recovery passed: interrupted seek resumes at target with settings intact; paused playback stays paused; source changes/disposal cancel; unsupported sources excluded; retries bounded; stall and Pause handled.');
})().catch(e=>{console.error(e);process.exitCode=1});
