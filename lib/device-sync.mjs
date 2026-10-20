export const DEVICE_FRESH_MS=120000;
export function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value;}
export async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(value))))),byte=>byte.toString(16).padStart(2,'0')).join('');}
export const accountDataDigest=values=>digest(Object.fromEntries(Object.entries(values).map(([key,value])=>[key,JSON.parse(value)])));
export function deviceSyncStatus(row,current,now=Date.now()){
 if(!row.active)return 'expired';if(!row.checkedAt)return 'unconfirmed';if(row.state!=='synced')return ['paused','conflict','pending'].includes(row.state)?row.state:'unconfirmed';
 if(row.epoch!==current.epoch||row.revision!==current.revision||row.dataDigest!==current.dataDigest)return 'behind';if(row.consentStamp!==current.consentStamp)return 'consent-changed';
 return now-row.checkedAt>DEVICE_FRESH_MS?'stale':'synced';
}
export const DEVICE_STATUS_LABELS={synced:'✓ Data and consent match',unconfirmed:'Not checked yet',expired:'Approval expired',paused:'Sync paused',conflict:'Conflicting edits · review needed',pending:'Changes waiting to sync',behind:'Newer account data available','consent-changed':'Consent update waiting to be read',stale:'Last matched · not recently checked'};
