import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { isoCBOR } from '@simplewebauthn/server/helpers';
import { build } from 'esbuild';

const sql = new DatabaseSync(':memory:');
sql.exec('PRAGMA foreign_keys=ON');
for (const name of readdirSync('site/drizzle').filter(filename => filename.endsWith('.sql')).sort())
  sql.exec(readFileSync('site/drizzle/' + name, 'utf8'));

function statement(query, args) {
  const compiled = sql.prepare(query);
  const run = () => {
    const results = compiled.columns().length ? compiled.all(...args) : (compiled.run(...args), []);
    return { results, meta: { changes: sql.prepare('SELECT changes() AS n').get().n } };
  };
  return { run, all: run, first: () => compiled.get(...args) ?? null };
}
const d1 = {
  prepare(query) { return { bind: (...args) => statement(query, args), ...statement(query, []) }; },
  async batch(statements) {
    sql.exec('BEGIN');
    try {
      const results = statements.map(stmt => stmt.run());
      sql.exec('COMMIT');
      return results;
    } catch (error) { sql.exec('ROLLBACK'); throw error; }
  },
};

const base = 'https://sync-fixture.test';
const now = Math.floor(Date.now() / 1000);
const hash = value => createHash('sha256').update(value).digest('hex');
const notice = 'account-sync-2026-10-19-v1';
const identity = req => {
  const access = req.headers.get('Cookie')?.match(/__Host-yinyangeq_tester=([^;]+)/)?.[1];
  const data = req.headers.get('Cookie')?.match(/__Host-yinyangeq_data=([^;]+)/)?.[1];
  const row = access && data && sql.prepare(`SELECT d.invite_id,p.subject_id,s.id AS deviceId,s.sync_enabled AS deviceSyncEnabled
    FROM private_tester_devices d JOIN privacy_sessions p ON p.token_hash=d.data_token_hash
    JOIN account_device_status s ON s.session_hash=d.session_hash
    WHERE d.session_hash=? AND p.token_hash=? AND d.expires_at>unixepoch()`).get(hash(access), hash(data));
  if (!row) throw new Error('Fixture received an invalid session');
  return { ...row, protectedAccount: false, syncAccess: hash(access), syncSession: hash(data) };
};

const result = await build({
  stdin: {
    contents: `export * as setup from './app/api/my-profile/sync-recovery/route';
      export * as recover from './app/api/sync-recovery/route';
      export * as grants from './app/api/companion/grants/route';
      export {companionAccess} from './lib/companion-access';`,
    resolveDir: resolve('site'),
  },
  bundle: true, platform: 'node', packages: 'external', format: 'cjs', write: false,
  alias: { '@': resolve('site') }, tsconfig: resolve('site/tsconfig.json'),
  plugins: [{
    name: 'synthetic-identity',
    setup(build) {
      build.onResolve({ filter: /^(cloudflare:workers|@\/lib\/account-sync-identity)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({
        contents: args.path === 'cloudflare:workers' ? 'export const env={DB:fixtureDb};' : 'export const accountSyncIdentity=fixtureIdentity;',
      }));
    },
  }],
});
const compiled = { exports: {} };
new Function('module', 'exports', 'require', 'fixtureDb', 'fixtureIdentity', result.outputFiles[0].text)(
  compiled, compiled.exports, createRequire(import.meta.url), d1, identity,
);
const { setup, recover, grants, companionAccess } = compiled.exports;

const cookies = (access, data) => `__Host-yinyangeq_tester=${access}; __Host-yinyangeq_data=${data}`;
const issuedCookies = response => response.headers.getSetCookie().slice(0, 2).map(value => value.split(';')[0]).join('; ');
function seed(id, subject, expires = now + 7200) {
  const access = randomBytes(32).toString('base64url'), data = randomBytes(32).toString('base64url');
  sql.prepare('INSERT INTO private_tester_invites(id,label,code_hash,created_at,code_expires_at,redeemed_at,session_hash,session_expires_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(id, 'Synthetic listener', hash(id), now, now, now, hash(access), expires);
  sql.prepare('INSERT INTO privacy_accounts(subject_id) VALUES(?)').run(subject);
  sql.prepare('INSERT INTO privacy_sessions(token_hash,subject_id,expires_at) VALUES(?,?,?)').run(hash(data), subject, expires * 1000);
  sql.prepare('INSERT INTO private_tester_devices VALUES(?,?,?,?,?)').run(hash(access), id, hash(data), now, expires);
  sql.prepare('INSERT INTO account_device_status(id,session_hash) VALUES(?,?)').run(id, hash(access));
  sql.prepare('INSERT INTO account_sync_permissions(subject_id,enabled,notice_version,consent_source,updated_at) VALUES(?,1,?,?,?)')
    .run(subject, notice, 'fixture', now);
  return cookies(access, data);
}

const signedIn = seed('open-fixture', 'browser:fixture');
sql.prepare('INSERT INTO account_browser_sync(subject_id,epoch,initialized,payload,updated_at) VALUES(?,?,1,?,?)')
  .run('browser:fixture', 'preserved-epoch', JSON.stringify({ 'target-lab-library-eqs-v1': '[]' }), now);
const other = seed('other-fixture', 'invite:other-fixture');
const post = (handler, path, body, cookie = '', origin = base) => handler(new Request(base + path, {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify(body),
}));
const settings = (action, cookie = signedIn, fields = {}) => post(setup.POST, '/api/my-profile/sync-recovery', { action, ...fields }, cookie);
const initial = await settings('enable');
assert.equal(initial.status, 200);
const { syncId } = await initial.json();
assert.match(syncId, /^[a-f0-9]{20}$/);
assert.equal((await (await settings('enable')).json()).syncId, syncId);
const otherId = (await (await settings('enable', other)).json()).syncId;
assert.notEqual(syncId, otherId);

const proof = (fields, origin) => post(recover.POST, '/api/sync-recovery', { syncId, accept: true, ...fields }, '', origin);
const recoverWithCode = (code, fields = {}) => proof({ action: 'use-code', code, ...fields });
const { code } = await (await settings('new-code')).json();
assert.match(code, /^[a-f0-9]{32}$/);
assert.notEqual(sql.prepare('SELECT code_hash FROM sync_recovery_codes WHERE sync_id=?').get(syncId).code_hash, code);
assert.equal((await proof({ action: 'use-code', code }, 'https://different.test')).status, 403);
assert.equal((await recoverWithCode(code, { accept: false })).status, 400);
assert.equal((await recoverWithCode(code, { syncId: otherId })).status, 403);

const attempts = await Promise.all([recoverWithCode(code), recoverWithCode(code)]);
assert.deepEqual(attempts.map(response => response.status).sort(), [200, 403]);
const approved = attempts.find(response => response.status === 200);
const recoveredCookie = issuedCookies(approved);
const replacement = (await approved.json()).replacementCode;
assert.match(replacement, /^[a-f0-9]{32}$/);
assert.notEqual(replacement, code);
assert.equal(approved.headers.get('Cache-Control'), 'private, no-store');
assert.equal(identity(new Request(base, { headers: { Cookie: recoveredCookie } })).subject_id, 'browser:fixture');
assert.equal(sql.prepare('SELECT epoch FROM account_browser_sync WHERE subject_id=?').get('browser:fixture').epoch, 'preserved-epoch');

const phoneChallenge = hash('fixture-only-companion-secret');
const approve = syncId => post(grants.POST, '/api/companion/grants', {
  action: 'approve', challenge: phoneChallenge, issued: Date.now(), access: 'edit-library-ranks-v2', syncId,
}, recoveredCookie);
assert.equal((await approve(otherId)).status, 403);
assert.equal((await approve(syncId)).status, 200);
assert.equal((await companionAccess(d1, phoneChallenge)).subject_id, 'browser:fixture');

function addBrowserSlot() {
  sql.prepare('INSERT INTO private_tester_devices VALUES(?,?,?,?,?)')
    .run(randomBytes(32).toString('hex'), 'open-fixture', randomBytes(32).toString('hex'), now, now + 7200);
}
addBrowserSlot(); addBrowserSlot();
assert.equal((await recoverWithCode(replacement)).status, 403);
const replacementBrowser = await recoverWithCode(replacement, { disconnectOthers: true });
assert.equal(replacementBrowser.status, 200, 'a full device list must not consume the code');
assert.equal(await companionAccess(d1, phoneChallenge), null, 'disconnecting browsers revokes their companion grants');
assert.equal(sql.prepare('SELECT count(*) AS total FROM private_tester_devices WHERE invite_id=?').get('open-fixture').total, 1);
assert.equal(sql.prepare('SELECT session_hash FROM private_tester_invites WHERE id=?').get('open-fixture').session_hash, null);
const newBrowser = issuedCookies(replacementBrowser);
const codeAfterReplacement = (await replacementBrowser.json()).replacementCode;

// A generated, disposable ES256 credential exercises the actual WebAuthn verifier.
const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const jwk = pair.publicKey.export({ format: 'jwk' });
const rawId = randomBytes(32);
const id = rawId.toString('base64url');
const cose = isoCBOR.encode(new Map([
  [1, 2], [3, -7], [-1, 1], [-2, new Uint8Array(Buffer.from(jwk.x, 'base64url'))], [-3, new Uint8Array(Buffer.from(jwk.y, 'base64url'))],
]));
const rpHash = Buffer.from(hash('sync-fixture.test'), 'hex');
const clientData = (type, challenge, origin = base) => Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
const authenticator = (flags, counter) => {
  const fields = Buffer.alloc(5);
  fields[0] = flags;
  fields.writeUInt32BE(counter, 1);
  return Buffer.concat([rpHash, fields]);
};
const registerStart = await settings('start-passkey', newBrowser);
assert.equal(registerStart.status, 200);
const { options: creation } = await registerStart.json();
const attestation = isoCBOR.encode(new Map([
  ['fmt', 'none'], ['attStmt', new Map()],
  ['authData', new Uint8Array(Buffer.concat([authenticator(0x45, 0), Buffer.alloc(16), Buffer.from([0, rawId.length]), rawId, cose]))],
]));
const credential = {
  id, rawId: id, type: 'public-key', clientExtensionResults: {},
  response: {
    attestationObject: Buffer.from(attestation).toString('base64url'),
    clientDataJSON: clientData('webauthn.create', creation.challenge).toString('base64url'),
  },
};
const registerFields = { challenge: creation.challenge, credential, label: 'Fixture key' };
assert.equal((await settings('finish-passkey', other, registerFields)).status, 409);
const registered = await settings('finish-passkey', newBrowser, registerFields);
assert.equal(registered.status, 200);
assert.equal((await registered.json()).passkeys[0].label, 'Fixture key');
assert.equal((await settings('finish-passkey', newBrowser, registerFields)).status, 409);

const { options: request } = await (await proof({ action: 'start-passkey' })).json();
assert.ok(!request.allowCredentials?.length);
assert.equal(request.userVerification, 'required');
function assertion(flags, origin, handle) {
  const data = clientData('webauthn.get', request.challenge, origin);
  const auth = authenticator(flags, 1);
  const signature = sign('sha256', Buffer.concat([auth, Buffer.from(hash(data), 'hex')]), pair.privateKey);
  return {
    id, rawId: id, type: 'public-key', clientExtensionResults: {},
    response: {
      authenticatorData: auth.toString('base64url'), clientDataJSON: data.toString('base64url'),
      signature: signature.toString('base64url'), userHandle: handle ?? creation.user.id,
    },
  };
}
const recoverWithPasskey = credential => proof({ action: 'finish-passkey', challenge: request.challenge, credential });
assert.equal((await recoverWithPasskey(assertion(0x01))).status, 403, 'user verification is required');
assert.equal((await recoverWithPasskey(assertion(0x05, 'https://different.test'))).status, 403);
assert.equal((await recoverWithPasskey(assertion(0x05, base, Buffer.from(otherId).toString('base64url')))).status, 403);
const signed = assertion(0x05);
assert.equal((await recoverWithPasskey(signed)).status, 200);
assert.equal((await recoverWithPasskey(signed)).status, 403);
assert.equal(sql.prepare('SELECT counter FROM sync_recovery_passkeys WHERE credential_id=?').get(id).counter, 1);

sql.exec("UPDATE account_sync_permissions SET enabled=0 WHERE subject_id='browser:fixture'");
assert.equal((await recoverWithCode(codeAfterReplacement)).status, 403);
sql.exec("UPDATE account_sync_permissions SET enabled=1 WHERE subject_id='browser:fixture'");
sql.exec("UPDATE private_tester_invites SET session_expires_at=unixepoch()-1 WHERE id='open-fixture'");
sql.exec("INSERT INTO site_access_settings(id,invites_enabled) VALUES(1,1) ON CONFLICT(id) DO UPDATE SET invites_enabled=1");
assert.equal((await recoverWithCode(codeAfterReplacement)).status,403,'Recovery does not bypass invitation-only mode');
sql.exec("UPDATE site_access_settings SET invites_enabled=0 WHERE id=1");
assert.equal((await recoverWithCode(codeAfterReplacement)).status, 200, 'an eligible open account can recover after all browser credentials expire');
assert.throws(()=>identity(new Request(base,{headers:{Cookie:newBrowser}})),/invalid session/);

const { code: invitedCode } = await (await settings('new-code', other)).json();
sql.exec("UPDATE private_tester_invites SET session_expires_at=unixepoch()-1 WHERE id='other-fixture'");
assert.equal((await recoverWithCode(invitedCode, { syncId: otherId })).status, 403);
sql.exec("DELETE FROM privacy_accounts WHERE subject_id='browser:fixture'");
assert.equal(sql.prepare('SELECT 1 FROM sync_recovery_accounts WHERE sync_id=?').get(syncId), undefined);
assert.equal(sql.prepare('SELECT 1 FROM sync_recovery_passkeys WHERE credential_id=?').get(id), undefined);

console.log('PASS migrated Sync ID, atomic one-use recovery and credentials, signed WebAuthn, loader isolation, account-bound companion approval, revocation, expiry, consent, and erasure.');
