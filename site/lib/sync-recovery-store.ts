import { ACCOUNT_SYNC_NOTICE_VERSION } from './account-sync-notice.mjs';
import type { accountSyncIdentity } from './account-sync-identity';
import { RequestInputError } from './request-json';
import { profileHash, profileSecret, profileSetCookie } from './yinyangeq-account';

type Browser = Awaited<ReturnType<typeof accountSyncIdentity>>;
type Passkey = { credential_id: string; public_key: string; counter: number; label: string; created_at: number };
type Proof = { codeHash: string } | { credentialId: string; oldCounter: number; counter: number; challenge: string };

const seconds = () => Math.floor(Date.now() / 1000);
const year = 365 * 24 * 60 * 60;
export const unverified = 'Recovery could not be completed. Check the Sync ID and your credential. If the device list is full, choose to disconnect the previous devices.';

function randomHex(size: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(size)), byte => byte.toString(16).padStart(2, '0')).join('');
}

function readGroupedHex(value: unknown, size: number, description: string) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase().replace(/[ -]/g, '') : '';
  if (normalized.length !== size || !/^[0-9a-f]+$/.test(normalized)) throw new RequestInputError(description, 400);
  return normalized;
}

export const readSyncId = (value: unknown) => readGroupedHex(value, 20, 'Enter your Sync ID.');
export const recoveryCodeHash = (value: unknown) => profileHash('sync-recovery:' + readGroupedHex(value, 32, 'Enter your saved recovery code.'));

const currentBrowser = `EXISTS (
  SELECT 1 FROM private_tester_devices d
  JOIN private_tester_invites i ON i.id=d.invite_id
  JOIN account_device_status state ON state.session_hash=d.session_hash
  JOIN privacy_sessions p ON p.token_hash=d.data_token_hash
  JOIN account_sync_permissions c ON c.subject_id=p.subject_id
  WHERE d.invite_id=? AND d.session_hash=? AND p.token_hash=? AND p.subject_id=?
    AND d.expires_at>unixepoch() AND i.session_expires_at>unixepoch() AND i.revoked_at IS NULL
    AND p.expires_at>unixepoch()*1000 AND state.sync_enabled=1
    AND c.enabled=1 AND c.notice_version=?
    AND i.id!='layout-test-only'
    AND NOT EXISTS (SELECT 1 FROM owner_public_profiles o WHERE o.invite_id=i.id OR o.subject_id=p.subject_id)
)`;

const browserBindings = (browser: Browser) => [
  browser.invite_id, browser.syncAccess, browser.syncSession, browser.subject_id, ACCOUNT_SYNC_NOTICE_VERSION,
] as const;

export async function recoverySettings(db: D1Database, browser: Browser) {
  const available = await db.prepare(`SELECT 1 AS ok WHERE ${currentBrowser}`).bind(...browserBindings(browser)).first();
  if (!available) return { available: false, reservedAccount: browser.protectedAccount, syncId: null, hasCode: false, passkeys: [] };
  const account = await db.prepare(`SELECT a.sync_id,
    EXISTS (SELECT 1 FROM sync_recovery_codes c WHERE c.sync_id=a.sync_id) AS has_code
    FROM sync_recovery_accounts a WHERE a.subject_id=? AND a.invite_id=?`)
    .bind(browser.subject_id, browser.invite_id).first<{ sync_id: string; has_code: number }>();
  const passkeys = account ? (await db.prepare('SELECT credential_id AS id, label, created_at AS createdAt FROM sync_recovery_passkeys WHERE sync_id=? ORDER BY created_at, credential_id')
    .bind(account.sync_id).all<{ id: string; label: string; createdAt: number }>()).results : [];
  return { available: true, reservedAccount: false, syncId: account?.sync_id ?? null, hasCode: !!account?.has_code, passkeys };
}

export async function enableRecovery(db: D1Database, browser: Browser) {
  await db.prepare(`INSERT INTO sync_recovery_accounts(sync_id,subject_id,invite_id)
    SELECT ?,?,? WHERE ${currentBrowser} ON CONFLICT(subject_id) DO NOTHING`)
    .bind(randomHex(10), browser.subject_id, browser.invite_id, ...browserBindings(browser)).run();
  return recoverySettings(db, browser);
}

export async function saveNewCode(db: D1Database, browser: Browser, syncId: string) {
  const code = randomHex(16);
  const result = await db.prepare(`INSERT INTO sync_recovery_codes(sync_id,code_hash)
    SELECT ?,? WHERE ${currentBrowser}
    ON CONFLICT(sync_id) DO UPDATE SET code_hash=excluded.code_hash`)
    .bind(syncId, await recoveryCodeHash(code), ...browserBindings(browser)).run();
  if (!result.meta.changes) throw new RequestInputError('This browser can no longer manage recovery.', 403);
  return code;
}

export async function removePasskey(db: D1Database, browser: Browser, syncId: string, credentialId: string) {
  await db.prepare(`DELETE FROM sync_recovery_passkeys WHERE sync_id=? AND credential_id=? AND ${currentBrowser}`)
    .bind(syncId, credentialId, ...browserBindings(browser)).run();
}

export async function saveChallenge(db: D1Database, challenge: string, syncId: string, browser?: Browser) {
  await db.batch([
    db.prepare('DELETE FROM sync_recovery_challenges WHERE expires_at<=unixepoch()'),
    db.prepare('INSERT INTO sync_recovery_challenges VALUES (?,?,?,?,?)')
      .bind(challenge, browser ? 'register' : 'recover', syncId, browser?.syncAccess ?? null, seconds() + 300),
  ]);
}

export async function registerPasskey(db: D1Database, browser: Browser, syncId: string, challenge: string, key: Passkey) {
  const result = await db.batch([
    db.prepare(`INSERT INTO sync_recovery_passkeys
      SELECT ?,?,?,?,?,? WHERE ${currentBrowser}
        AND (SELECT COUNT(*) FROM sync_recovery_passkeys WHERE sync_id=?) < 10
        AND EXISTS (SELECT 1 FROM sync_recovery_challenges WHERE challenge=? AND purpose='register'
                    AND sync_id=? AND browser_hash=? AND expires_at>unixepoch())`)
      .bind(key.credential_id, syncId, key.public_key, key.counter, key.label, key.created_at,
        ...browserBindings(browser), syncId, challenge, syncId, browser.syncAccess),
    db.prepare('DELETE FROM sync_recovery_challenges WHERE challenge=? AND browser_hash=?').bind(challenge, browser.syncAccess),
  ]);
  if (!result[0].meta.changes) throw new RequestInputError('The passkey request expired or the account has ten passkeys. Start a new request or remove an unused passkey.', 409);
}

export async function findPasskey(db: D1Database, syncId: string, credentialId: string, challenge: string) {
  return db.prepare(`SELECT k.credential_id,k.public_key,k.counter FROM sync_recovery_passkeys k
    JOIN sync_recovery_challenges c ON c.sync_id=k.sync_id
    WHERE k.sync_id=? AND k.credential_id=? AND c.challenge=? AND c.purpose='recover' AND c.expires_at>unixepoch()`)
    .bind(syncId, credentialId, challenge).first<Pick<Passkey, 'credential_id' | 'public_key' | 'counter'>>();
}

export async function recoverSyncBrowser(db: D1Database, syncId: string, proof: Proof, disconnectOthers: boolean) {
  const access = profileSecret(), data = profileSecret();
  const accessHash = await profileHash(access), dataHash = await profileHash(data);
  const maxAge = seconds() + year;
  const replace = Number(disconnectOthers);
  const code = 'codeHash' in proof;
  const verified = code
    ? 'EXISTS (SELECT 1 FROM sync_recovery_codes c WHERE c.sync_id=a.sync_id AND c.code_hash=?)'
    : `EXISTS (SELECT 1 FROM sync_recovery_passkeys k JOIN sync_recovery_challenges c ON c.sync_id=k.sync_id
        WHERE k.sync_id=a.sync_id AND k.credential_id=? AND k.counter=?
          AND c.challenge=? AND c.purpose='recover' AND c.expires_at>unixepoch())`;
  const proofArgs = code ? [proof.codeHash] : [proof.credentialId, proof.oldCounter, proof.challenge];
  const newDevice = 'EXISTS (SELECT 1 FROM private_tester_devices WHERE session_hash=?)';
  const inviteId = '(SELECT invite_id FROM private_tester_devices WHERE session_hash=?)';
  const subjectId = '(SELECT subject_id FROM sync_recovery_accounts WHERE sync_id=?)';
  const statements = [
    db.prepare(`INSERT INTO private_tester_devices(session_hash,invite_id,data_token_hash,created_at,expires_at)
      SELECT ?,a.invite_id,?,unixepoch(),
        CASE WHEN substr(i.id,1,5)='open-' AND i.session_expires_at<=unixepoch()
             THEN ? ELSE i.session_expires_at END
      FROM sync_recovery_accounts a
      JOIN private_tester_invites i ON i.id=a.invite_id
      JOIN account_sync_permissions p ON p.subject_id=a.subject_id
      WHERE a.sync_id=? AND i.id!='layout-test-only' AND i.revoked_at IS NULL AND i.redeemed_at IS NOT NULL
        AND i.session_expires_at IS NOT NULL
        AND p.enabled=1 AND p.notice_version=?
        AND NOT EXISTS (SELECT 1 FROM owner_public_profiles o WHERE o.invite_id=i.id OR o.subject_id=a.subject_id)
        AND ((substr(i.id,1,5)='open-' AND NOT EXISTS (SELECT 1 FROM site_access_settings WHERE id=1 AND invites_enabled=1))
             OR (substr(i.id,1,5)!='open-' AND i.session_expires_at>unixepoch()))
        AND (?=1 OR (SELECT COUNT(*) FROM private_tester_devices d
                     WHERE d.invite_id=i.id AND d.expires_at>unixepoch())<4)
        AND ${verified} RETURNING expires_at`)
      .bind(accessHash, dataHash, maxAge, syncId, ACCOUNT_SYNC_NOTICE_VERSION, replace, ...proofArgs),
    // Renew an expired open-access account without making any previous browser credentials usable again.
    db.prepare(`UPDATE private_tester_devices SET expires_at=MIN(expires_at,
        (SELECT session_expires_at FROM private_tester_invites WHERE id=invite_id))
      WHERE invite_id=${inviteId} AND session_hash<>?
        AND EXISTS (SELECT 1 FROM private_tester_invites i WHERE i.id=invite_id AND i.session_expires_at<=unixepoch())`)
      .bind(accessHash, accessHash),
    db.prepare(`UPDATE private_tester_invites SET session_hash=NULL,
        session_expires_at=MAX(session_expires_at,(SELECT expires_at FROM private_tester_devices WHERE session_hash=?))
      WHERE id=${inviteId} AND (?=1 OR session_expires_at<=unixepoch())`).bind(accessHash, accessHash, replace),
  ];
  if (disconnectOthers) {
    statements.push(
      db.prepare(`DELETE FROM privacy_sessions WHERE subject_id=${subjectId} AND ${newDevice}`).bind(syncId, accessHash),
      db.prepare(`DELETE FROM companion_library_grants WHERE subject_id=${subjectId} AND ${newDevice}`).bind(syncId, accessHash),
      db.prepare(`DELETE FROM browser_pairings WHERE invite_id=${inviteId}`).bind(accessHash),
      db.prepare(`DELETE FROM private_tester_devices WHERE invite_id=${inviteId} AND session_hash<>?`).bind(accessHash, accessHash),
    );
  }
  statements.push(
    db.prepare(`INSERT INTO privacy_sessions(token_hash,subject_id,expires_at) SELECT data_token_hash,${subjectId},expires_at*1000
      FROM private_tester_devices WHERE session_hash=?`).bind(syncId, accessHash),
    db.prepare(`INSERT INTO account_device_status(id,session_hash,label)
      SELECT ?,session_hash,'Recovered browser' FROM private_tester_devices WHERE session_hash=?`)
      .bind(crypto.randomUUID(), accessHash),
  );
  const replacementCode = code ? randomHex(16) : null;
  if (code && replacementCode) {
    statements.push(db.prepare(`UPDATE sync_recovery_codes SET code_hash=? WHERE sync_id=? AND code_hash=? AND ${newDevice}`)
      .bind(await recoveryCodeHash(replacementCode), syncId, proof.codeHash, accessHash));
  } else if (!code) {
    statements.push(
      db.prepare(`UPDATE sync_recovery_passkeys SET counter=? WHERE credential_id=? AND ${newDevice}`)
        .bind(proof.counter, proof.credentialId, accessHash),
      db.prepare(`DELETE FROM sync_recovery_challenges WHERE challenge=? AND ${newDevice}`).bind(proof.challenge, accessHash),
    );
  }
  const [device] = await db.batch<{ expires_at: number }>(statements);
  const expires = device.results[0]?.expires_at;
  if (!expires) throw new RequestInputError(unverified, 403);
  const remaining = Math.max(0, expires - seconds());
  const cookies = [
    profileSetCookie('__Host-yinyangeq_tester', access, remaining),
    profileSetCookie('__Host-yinyangeq_data', data, remaining),
    profileSetCookie('__Host-yinyangeq_pairing', '', 0),
  ];
  return { cookies, replacementCode };
}
