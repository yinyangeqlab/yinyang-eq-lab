import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {normalizeListenerNickname,listenerNicknameError,isReservedListenerNickname,NICKNAME_BRAND_FLAG} from '../lib/listener-nickname.ts';
assert.equal(normalizeListenerNickname('  Sound   Owl  '),'Sound Owl');
assert.equal(normalizeListenerNickname(''), '');
assert.equal(normalizeListenerNickname('Écoute 🎵'), 'Écoute 🎵');
for(const input of [null,9,{},'a@b.com','A\nB','A\u202eB','a'.repeat(41)])assert.equal(normalizeListenerNickname(input),null);

const blocked=['Yin Yang','Ying Yang EQ','Yin Yang EQ Labs','Yin Yang Labs','DJ-YinYangEQ-support','ＹｉｎＹａｎｇ','YİN YÀNG','y1n y4ng','YinYаng','уin yang','Yin\u200bYang','Yin & Yang','Yin and Yang','YinYagn','YinYeng','Yinyan','OfficialYinYengEQLabs','Yin Yang impersonator'];
for(const name of blocked){assert.equal(isReservedListenerNickname(name),true,name);assert.equal(normalizeListenerNickname(name),null,name);assert.equal(listenerNicknameError(name),NICKNAME_BRAND_FLAG);}
for(const name of ['Sound Owl','Écoute 🎵','Tiny Angel','Yang','Yin listener','Midnight Listener','Lab Technician','Equality Listener'])assert.equal(isReservedListenerNickname(name),false,name);
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON;CREATE TABLE privacy_accounts(subject_id TEXT PRIMARY KEY);INSERT INTO privacy_accounts VALUES ("browser:first"),("browser:second");'.replaceAll('"',"'"));
db.exec(readFileSync(new URL('../drizzle/0032_listener_nicknames.sql',import.meta.url),'utf8'));
let subjectId='browser:first',authenticated=true;
class RequestInputError extends Error{constructor(message,status){super(message);this.status=status;}}
const source=readFileSync(new URL('../app/api/my-data/route.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/export async function/g,'async function');
const route=vm.runInNewContext(js+';({PATCH})',{
 Response,URL,RequestInputError,normalizeListenerNickname,listenerNicknameError,
 dataIdentity:async()=>{if(!authenticated)throw new RequestInputError('Expired',401);return {subjectId};},readJsonObject:r=>r.json(),
 requestInputResponse:e=>e instanceof RequestInputError?Response.json({error:e.message},{status:e.status}):null,
 env:{DB:{prepare(sql){return{bind(...args){return{run:async()=>db.prepare(sql).run(...args)}}}}}},
});
const request=(nickname,origin='https://example.test')=>new Request('https://example.test/api/my-data',{method:'PATCH',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'nickname',nickname,subjectId:'browser:second'})});
assert.equal((await route.PATCH(request('Sound Owl'))).status,200);
const own=id=>db.prepare('SELECT nickname FROM listener_nicknames WHERE subject_id=?').get(id)?.nickname;
assert.equal(own('browser:first'),'Sound Owl');assert.equal(own('browser:second'),undefined,'Cannot rename another account through payload');
// A second linked browser authenticates to the same subject, without copying a nickname or trusting a nickname as a credential.
assert.equal((await route.PATCH(request('Linked Owl'))).status,200);assert.equal(own('browser:first'),'Linked Owl');
for(const name of blocked){const response=await route.PATCH(request(name));assert.equal(response.status,400,name);assert.equal((await response.json()).error,NICKNAME_BRAND_FLAG);assert.equal(own('browser:first'),'Linked Owl');}
for(const subject of ['browser:first','invite:reserved-profile-fixture']){subjectId=subject;const response=await route.PATCH(new Request('https://example.test/api/my-data',{method:'PATCH',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({submissionsEnabled:false,shareMusic:false,nickname:'YinYangEQ',isOwner:true,brandApproved:true})}));assert.equal(response.status,400,'combined settings route must reject brand nicknames before consent/database mutation');assert.equal((await response.json()).error,NICKNAME_BRAND_FLAG);}
subjectId='browser:first';
assert.equal((await route.PATCH(request('a@b.com'))).status,400);assert.equal((await route.PATCH(request('Nope','https://evil.test'))).status,403);assert.equal(own('browser:first'),'Linked Owl');
authenticated=false;assert.equal((await route.PATCH(request('Nope'))).status,401);authenticated=true;
subjectId='owner';assert.equal((await route.PATCH(request('Owner'))).status,400);
subjectId='browser:first';assert.equal((await route.PATCH(request(''))).status,200);assert.equal(own(subjectId),undefined);
await route.PATCH(request('Delete me'));db.prepare('DELETE FROM privacy_accounts WHERE subject_id=?').run(subjectId);assert.equal(own(subjectId),undefined,'Account deletion cascades nickname erasure');
db.close();console.log('Nickname checks passed: normalisation, email/control rejection, length limit, authenticated account isolation, linked identity, CSRF, shared-admin rejection, remove and deletion. Synthetic SQLite only.');
