"use client";

import SyncRecoveryForm from '@/components/sync-recovery-form';
import { navigateFresh } from '@/lib/browser-navigation';
import '../companion-link/link.css';

export default function SyncRecoveryPage() {
  return <main className="companion-approval">
    <a href="/account-sync">Sync &amp; Devices</a>
    <h1>Recover your Sync account</h1>
    <p>Use your Sync ID and a passkey or recovery code you set up earlier. You can restore data already saved to the account.</p>
    <SyncRecoveryForm onRecovered={() => navigateFresh('/account-sync?setup=1')} />
  </main>;
}
