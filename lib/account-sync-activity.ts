export type SyncPhase = 'idle' | 'checking' | 'downloading' | 'uploading' | 'verifying' | 'applying' | 'confirming';
export type SyncActivity = {phase: SyncPhase; message: string};
export const IDLE_SYNC_ACTIVITY: SyncActivity = {phase: 'idle', message: ''};
let activity = IDLE_SYNC_ACTIVITY;
const tasks = new Map<string, SyncActivity>();
const listeners = new Set<() => void>();
export function setAccountSyncActivity(phase: SyncPhase, message = '', source = 'auto') {
  tasks.delete(source);
  if (phase !== 'idle') tasks.set(source, {phase, message});
  const next = [...tasks.values()].at(-1) || IDLE_SYNC_ACTIVITY;
  if (activity.phase === next.phase && activity.message === next.message) return;
  activity = next;
  listeners.forEach(listener => listener());
}
export function getAccountSyncActivity() { return activity; }
export function subscribeAccountSyncActivity(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
