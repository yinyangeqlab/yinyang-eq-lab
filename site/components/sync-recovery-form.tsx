"use client";

import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { captureAccountValues } from '@/lib/account-sync.mjs';
import { readSyncBase } from '@/lib/account-sync-cache.mjs';
import './sync-recovery.css';

export const groupSyncValue = (value: string) => value.toUpperCase().match(/.{1,4}/g)?.join('-') ?? '';

export async function syncRecoveryRequest<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store',
  } : { cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: unknown } | null;
    const error = body?.error;
    throw Object.assign(new Error(typeof error === 'string' ? error : 'Sync recovery is temporarily unavailable.'), { status: response.status });
  }
  return response.json() as Promise<T>;
}

export function CopySyncValue({ value, label }: { value: string; label: string }) {
  const [status, setStatus] = useState('');
  return <>
    <div className="sync-recovery-value">
      <code>{groupSyncValue(value)}</code>
      <button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(groupSyncValue(value)); setStatus('Copied.'); }
        catch { setStatus('Select and copy the displayed text.'); }
      }}>Copy {label}</button>
    </div>
    <span role="status">{status}</span>
  </>;
}

const endpoint = '/api/sync-recovery';
const pausedKey = 'yinyang-account-sync-paused';

export default function SyncRecoveryForm({ onRecovered, onCancel }: { onRecovered: (syncId: string) => void; onCancel?: () => void }) {
  const [method, setMethod] = useState<'passkey' | 'code'>('passkey');
  const [syncId, setSyncId] = useState('');
  const [code, setCode] = useState('');
  const [accept, setAccept] = useState(false);
  const [disconnectOthers, setDisconnectOthers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recovered, setRecovered] = useState<{ id: string; replacementCode: string | null; paused: boolean }>();
  const inFlight = useRef(false);
  const resultTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (recovered) resultTitle.current?.focus();
  }, [recovered]);

  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !accept) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    const common = { syncId, accept, disconnectOthers };
    let finalRequest = false;
    let previousPause: string | null = null;
    try {
      let proof: Record<string, unknown> = { action: 'use-code', code };
      if (method === 'passkey') {
        if (!browserSupportsWebAuthn()) throw new Error('Open this page in a browser that supports passkeys, or use your saved recovery code.');
        const { options } = await syncRecoveryRequest<{ options: PublicKeyCredentialRequestOptionsJSON }>(endpoint, { ...common, action: 'start-passkey' });
        const credential = await startAuthentication({ optionsJSON: options });
        proof = { action: 'finish-passkey', challenge: options.challenge, credential };
      }
      const store = window.localStorage;
      previousPause = store.getItem(pausedKey);
      const baseExists = !!await readSyncBase(store).catch(() => true);
      const hasLocalData = baseExists || Object.keys(captureAccountValues(store)).length > 0;
      // Pause before a response can switch the session cookies for this browser and its other tabs.
      store.setItem(pausedKey, 'true');
      finalRequest = true;
      const { replacementCode } = await syncRecoveryRequest<{ replacementCode: string | null }>(endpoint, { ...common, ...proof });
      const paused = hasLocalData || previousPause === 'true';
      if (!paused) store.removeItem(pausedKey);
      setCode('');
      setRecovered({ id: syncId, replacementCode, paused });
    } catch (cause) {
      const failure = cause as Error & { status?: number };
      if (finalRequest && failure.status && failure.status < 500) try {
        if (previousPause === null) localStorage.removeItem(pausedKey);
        else localStorage.setItem(pausedKey, previousPause);
      } catch { /* Leave sync paused if browser storage became unavailable. */ }
      setError(failure.message || 'Recovery could not be completed. Try again.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (recovered) return <div className="sync-recovery-panel">
    <h2 ref={resultTitle} tabIndex={-1}>Sync account recovered</h2>
    <p>{recovered.paused ? 'Automatic browser sync is paused. Review this browser’s saved data in Sync & Devices before resuming.' : 'This browser can now restore the account’s synced data.'}</p>
    {disconnectOthers && <p>Previously linked devices were disconnected. Review your passkeys in Sync &amp; Devices and remove any you no longer trust.</p>}
    {recovered.replacementCode && <>
      <p>Save this new recovery code with your Sync ID. Your previous code has been used.</p>
      <CopySyncValue value={recovered.replacementCode} label="new recovery code" />
    </>}
    <button type="button" onClick={() => onRecovered(recovered.id)}>Continue</button>
  </div>;

  return <form className="sync-recovery-panel" onSubmit={recover} aria-label="Recover your Sync account">
    <label htmlFor="recover-sync-id">Sync ID</label>
    <input id="recover-sync-id" value={syncId} required maxLength={30} autoCapitalize="characters" autoComplete="off"
      spellCheck={false} disabled={busy} onChange={event => setSyncId(event.target.value)} />
    <fieldset disabled={busy}>
      <legend>Recovery method</legend>
      <label className="sync-recovery-choice"><input type="radio" name="recovery-method" checked={method === 'passkey'}
        onChange={() => { setMethod('passkey'); setCode(''); setError(''); }} /> Passkey</label>
      <label className="sync-recovery-choice"><input type="radio" name="recovery-method" checked={method === 'code'}
        onChange={() => { setMethod('code'); setError(''); }} /> Saved recovery code</label>
    </fieldset>
    {method === 'code' ? <>
      <label htmlFor="recover-sync-code">Your saved recovery code</label>
      <input id="recover-sync-code" type="password" value={code} required maxLength={48} autoComplete="off" disabled={busy}
        onChange={event => setCode(event.target.value)} />
    </> : <p>Use a passkey available on this device or in your password manager.</p>}
    <label className="sync-recovery-choice"><input type="checkbox" checked={disconnectOthers} disabled={busy}
      onChange={event => setDisconnectOthers(event.target.checked)} /> Disconnect all previously linked browsers and companions</label>
    <label className="sync-recovery-choice"><input type="checkbox" required checked={accept} disabled={busy}
      onChange={event => setAccept(event.target.checked)} /> Use the recovered account in this browser. Keep this browser’s saved data for review.</label>
    {error && <p role="alert">{error}</p>}
    <div className="sync-recovery-actions">
      <button type="submit" disabled={busy}>{busy ? 'Verifying…' : method === 'passkey' ? 'Recover with passkey' : 'Recover with code'}</button>
      {onCancel && <button type="button" disabled={busy} onClick={onCancel}>Back to device approval</button>}
    </div>
  </form>;
}
