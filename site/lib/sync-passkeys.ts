import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type { accountSyncIdentity } from './account-sync-identity';
import { RequestInputError } from './request-json';
import { findPasskey, registerPasskey, saveChallenge, unverified } from './sync-recovery-store';

type Browser = Awaited<ReturnType<typeof accountSyncIdentity>>;
const algorithms = [-7, -257];
const credentialHandle = (syncId: string) => new TextEncoder().encode(syncId);

function relyingParty(request: Request) {
  const url = new URL(request.url);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost'))
    throw new RequestInputError('Passkeys require a secure browser connection.', 403);
  return { expectedRPID: url.hostname, expectedOrigin: url.origin };
}

function challengeValue(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(value)) throw new RequestInputError('Start a new passkey request.', 400);
  return value;
}

export function credentialId(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,1400}$/.test(value)) throw new RequestInputError('Invalid passkey.', 400);
  return value;
}

export async function startPasskeyRegistration(db: D1Database, request: Request, browser: Browser, syncId: string, exclude: string[]) {
  const options = await generateRegistrationOptions({
    rpName: 'YinYang EQ Sync', rpID: relyingParty(request).expectedRPID,
    userID: credentialHandle(syncId), userName: syncId, userDisplayName: 'YinYang EQ Sync ' + syncId.slice(-4).toUpperCase(),
    attestationType: 'none', supportedAlgorithmIDs: algorithms,
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    excludeCredentials: exclude.map(id => ({ id })),
  });
  await saveChallenge(db, options.challenge, syncId, browser);
  return options;
}

export async function finishPasskeyRegistration(db: D1Database, request: Request, browser: Browser, syncId: string, body: Record<string, unknown>) {
  const challenge = challengeValue(body.challenge);
  const active = await db.prepare(`SELECT 1 FROM sync_recovery_challenges WHERE challenge=? AND purpose='register'
    AND sync_id=? AND browser_hash=? AND expires_at>unixepoch()`).bind(challenge, syncId, browser.syncAccess).first();
  if (!active) throw new RequestInputError('The passkey request expired. Add the passkey again.', 409);

  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (label.length > 60 || /[\x00-\x1f\x7f]/.test(label)) throw new RequestInputError('Use a single-line passkey name up to 60 characters.', 400);
  const result = await verifyRegistrationResponse({
    response: body.credential as RegistrationResponseJSON,
    expectedChallenge: challenge, ...relyingParty(request), requireUserVerification: true, supportedAlgorithmIDs: algorithms,
  }).catch(() => null);
  if (!result?.verified) throw new RequestInputError('The browser could not verify this passkey. Try adding it again.', 400);
  const key = result.registrationInfo.credential;
  await registerPasskey(db, browser, syncId, challenge, {
    credential_id: key.id, public_key: isoBase64URL.fromBuffer(key.publicKey), counter: key.counter,
    label: label || 'Passkey', created_at: Date.now(),
  });
}

export async function startPasskeyRecovery(db: D1Database, request: Request, syncId: string) {
  // Discoverable credentials keep the options identical for known and unknown Sync IDs.
  const options = await generateAuthenticationOptions({ rpID: relyingParty(request).expectedRPID, userVerification: 'required' });
  await saveChallenge(db, options.challenge, syncId);
  return options;
}

export async function verifyRecoveryPasskey(db: D1Database, request: Request, syncId: string, body: Record<string, unknown>) {
  const challenge = challengeValue(body.challenge);
  const response = body.credential as AuthenticationResponseJSON | undefined;
  const id = credentialId(response?.id);
  const key = await findPasskey(db, syncId, id, challenge);
  if (!key || !response || response.response?.userHandle !== isoBase64URL.fromBuffer(credentialHandle(syncId)))
    throw new RequestInputError(unverified, 403);
  const result = await verifyAuthenticationResponse({
    response, expectedChallenge: challenge, ...relyingParty(request), requireUserVerification: true,
    credential: { id: key.credential_id, counter: key.counter, publicKey: isoBase64URL.toBuffer(key.public_key) },
  }).catch(() => null);
  if (!result?.verified) throw new RequestInputError(unverified, 403);
  return { credentialId: id, oldCounter: key.counter, counter: result.authenticationInfo.newCounter, challenge };
}
