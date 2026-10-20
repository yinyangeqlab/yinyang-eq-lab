"use client";
import AccountDeviceStatus from '@/components/account-device-status';
import AccountSyncManager from '@/components/account-sync-manager';
export default function Page(){return <main className="profile-page"><a href="/my-data">← My data</a><h1>Account sync &amp; devices</h1><p>Keep your saved YinYangEQ data consistent across browsers you approve. Review differences before choosing a copy. No account credentials or active playback are copied.</p><AccountDeviceStatus promptCurrent/><AccountSyncManager/></main>;}
