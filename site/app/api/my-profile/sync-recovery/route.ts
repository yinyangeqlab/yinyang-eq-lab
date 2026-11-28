import { env } from 'cloudflare:workers';
import { accountSyncIdentity } from '@/lib/account-sync-identity';
import { profileFailure, profileHeaders } from '@/lib/profile-api';
import { readJsonObject, RequestInputError } from '@/lib/request-json';
import { credentialId, finishPasskeyRegistration, startPasskeyRegistration } from '@/lib/sync-passkeys';
import { enableRecovery, recoverySettings, removePasskey, saveNewCode } from '@/lib/sync-recovery-store';
import { profileOrigin } from '@/lib/yinyangeq-account';

export async function GET(request: Request) {
  try {
    const browser = await accountSyncIdentity(request);
    return Response.json(await recoverySettings(env.DB!, browser), { headers: profileHeaders });
  } catch (error) { return profileFailure(error); }
}

export async function POST(request: Request) {
  try {
    profileOrigin(request);
    const browser = await accountSyncIdentity(request);
    const body = await readJsonObject(request, 16_384);
    const db = env.DB!;
    if (body.action === 'enable')
      return Response.json(await enableRecovery(db, browser), { headers: profileHeaders });

    const settings = await recoverySettings(db, browser);
    if (!settings.syncId) throw new RequestInputError('Set up recovery on an approved browser with Sync turned on.', 403);
    if (body.action === 'new-code') {
      const code = await saveNewCode(db, browser, settings.syncId);
      return Response.json({ code }, { headers: profileHeaders });
    }
    if (body.action === 'start-passkey') {
      const options = await startPasskeyRegistration(db, request, browser, settings.syncId, settings.passkeys.map(key => key.id));
      return Response.json({ options }, { headers: profileHeaders });
    }
    if (body.action === 'finish-passkey')
      await finishPasskeyRegistration(db, request, browser, settings.syncId, body);
    else if (body.action === 'remove-passkey')
      await removePasskey(db, browser, settings.syncId, credentialId(body.id));
    else throw new RequestInputError('Choose a recovery action.', 400);

    return Response.json(await recoverySettings(db, browser), { headers: profileHeaders });
  } catch (error) { return profileFailure(error); }
}
