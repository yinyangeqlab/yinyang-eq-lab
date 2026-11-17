"use client";
import {useSyncExternalStore, type ReactNode} from 'react';
import {getAccountSyncActivity, subscribeAccountSyncActivity, IDLE_SYNC_ACTIVITY} from '@/lib/account-sync-activity';
import './account-sync-activity.css';

export function useAccountSyncActivity() {
  return useSyncExternalStore(subscribeAccountSyncActivity, getAccountSyncActivity, () => IDLE_SYNC_ACTIVITY);
}

export function SyncActivityIndicator({active, children}: {active: boolean; children: ReactNode}) {
  return <span className="sync-activity" data-active={active}>
    <svg className="sync-activity-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {active ? <><path d="M20 11a8 8 0 0 0-14-5L3 9m0-5v5h5M4 13a8 8 0 0 0 14 5l3-3m0 5v-5h-5"/></> : <circle cx="12" cy="12" r="3"/>}
    </svg>
    <span>{children}</span>
  </span>;
}
