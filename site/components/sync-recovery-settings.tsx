"use client";

import { browserSupportsWebAuthn, startRegistration, type PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { useEffect, useState } from 'react';
import { CopySyncValue, syncRecoveryRequest } from './sync-recovery-form';

type Settings = { available: boolean; reservedAccount: boolean; syncId: string | null; hasCode: boolean; passkeys: { id: string; label: string; createdAt: number }[] };
const endpoint = '/api/my-profile/sync-recovery';

export default function SyncRecoverySettings() {
  const [settings, setSettings] = useState<Settings>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [confirmCode, setConfirmCode] = useState(false);

  useEffect(() => {
    let active = true;
    syncRecoveryRequest<Settings>(endpoint).then(data => { if (active) setSettings(data); }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load Sync recovery settings.');
    });
    return () => { active = false; };
  }, []);

  async function update(action: 'enable' | 'new-code' | 'add-passkey' | 'remove-passkey', id?: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (action === 'new-code') {
        const next = await syncRecoveryRequest<{ code: string }>(endpoint, { action });
        setCode(next.code);
        setSettings(current => current && { ...current, hasCode: true });
        setConfirmCode(false);
      } else if (action === 'add-passkey') {
        if (!browserSupportsWebAuthn()) throw new Error('Open Sync & Devices in a browser that supports passkeys.');
        const { options } = await syncRecoveryRequest<{ options: PublicKeyCredentialCreationOptionsJSON }>(endpoint, { action: 'start-passkey' });
        const credential = await startRegistration({ optionsJSON: options });
        setSettings(await syncRecoveryRequest<Settings>(endpoint, { action: 'finish-passkey', challenge: options.challenge, credential, label }));
        setLabel('');
      } else {
        setSettings(await syncRecoveryRequest<Settings>(endpoint, { action, id }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update Sync recovery.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="profile-review sync-recovery-panel" id="sync-recovery" aria-labelledby="sync-recovery-title">
    <h2 id="sync-recovery-title">Sync ID &amp; recovery</h2>
    <p>Set up a passkey or save a recovery code to use this Sync account when you can’t access an approved browser.</p>
    <a href="/sync-recovery">Recover an existing Sync account</a>
    {!settings && !error && <p role="status">Checking recovery settings…</p>}
    {settings && !settings.available && <p>{settings.reservedAccount ? 'The reserved YinYangEQ account uses private recovery approvals.' : 'Turn on account Sync and resume this browser to set up recovery.'}</p>}
    {settings?.available && !settings.syncId && <button type="button" disabled={busy} onClick={() => void update('enable')}>Set up recovery</button>}
    {settings?.syncId && <>
      <h3>Your Sync ID</h3>
      <CopySyncValue value={settings.syncId} label="Sync ID" />
      <h3>Recovery code</h3>
      {code ? <div>
        <p>Save this code with your Sync ID somewhere you can access if you lose your devices. It’s shown once and can be used once.</p>
        <CopySyncValue value={code} label="recovery code" />
        <button type="button" onClick={() => setCode('')}>I’ve saved the code</button>
      </div> : confirmCode ? <div>
        <p>Generating a new code invalidates the code you saved earlier.</p>
        <div className="sync-recovery-actions">
          <button type="button" disabled={busy} onClick={() => void update('new-code')}>Generate new code</button>
          <button type="button" disabled={busy} onClick={() => setConfirmCode(false)}>Cancel</button>
        </div>
      </div> : <button type="button" disabled={busy} onClick={() => {
        if (settings.hasCode) setConfirmCode(true);
        else void update('new-code');
      }}>{settings.hasCode ? 'Replace recovery code' : 'Generate recovery code'}</button>}
      <h3>Passkeys</h3>
      {settings.passkeys.length > 0 && <ul className="sync-recovery-passkeys">{settings.passkeys.map(key => <li key={key.id}>
        <span>{key.label} <small>Added {new Date(key.createdAt).toLocaleDateString()}</small></span>
        <button type="button" aria-label={`Remove ${key.label}, added ${new Date(key.createdAt).toLocaleDateString()}`}
          disabled={busy} onClick={() => void update('remove-passkey', key.id)}>Remove</button>
      </li>)}</ul>}
      <label htmlFor="sync-passkey-name">Passkey name (optional)</label>
      <input id="sync-passkey-name" maxLength={60} autoComplete="off" disabled={busy} value={label} onChange={event => setLabel(event.target.value)} />
      <button type="button" disabled={busy} onClick={() => void update('add-passkey')}>Add passkey</button>
    </>}
    {busy && <p role="status">Updating recovery settings…</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
