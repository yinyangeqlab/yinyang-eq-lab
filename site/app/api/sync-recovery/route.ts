import { env } from 'cloudflare:workers';
import { profileFailure, profileHeaders } from '@/lib/profile-api';
import { readJsonObject, RequestInputError } from '@/lib/request-json';
import { startPasskeyRecovery, verifyRecoveryPasskey } from '@/lib/sync-passkeys';
import { readSyncId, recoveryCodeHash, recoverSyncBrowser } from '@/lib/sync-recovery-store';
import { profileOrigin } from '@/lib/yinyangeq-account';

export async function POST(request: Request) {
  try {
    profileOrigin(request);
    const db = env.DB!;
    const body = await readJsonObject(request, 16_384);
    const syncId = readSyncId(body.syncId);
    if (body.accept !== true) throw new RequestInputError('Confirm that you want to use the recovered account in this browser.', 400);
    if (body.action === 'start-passkey') {
      const options = await startPasskeyRecovery(db, request, syncId);
      return Response.json({ options }, { headers: profileHeaders });
    }
    if (body.action !== 'finish-passkey' && body.action !== 'use-code') throw new RequestInputError('Choose a recovery method.', 400);
    const proof = body.action === 'use-code' ? { codeHash: await recoveryCodeHash(body.code) } : await verifyRecoveryPasskey(db, request, syncId, body);
    const { cookies, replacementCode } = await recoverSyncBrowser(db, syncId, proof, body.disconnectOthers === true);
    const response = Response.json({ ok: true, replacementCode }, { headers: profileHeaders });
    for (const cookie of cookies) response.headers.append('Set-Cookie', cookie);
    return response;
  } catch (error) { return profileFailure(error); }
}
