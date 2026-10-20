// Deliberate site-data transfer only. Cookies, consent receipts, music bytes,
// active test state and unrelated browser storage are never in this payload.
export const SYNC_KEYS = [
  'target-lab-voter','target-lab-trials','target-lab-measurements',
  'target-lab-private-targets','target-lab-active-measurement',
  'target-lab-library-eqs-v1','target-lab-music-shortlist-v1',
  'target-lab-browser-reviews','target-lab-show-curves',
  'personal-tuning-v1','preference-tuning-axis-v1',
];
export const SYNC_MAX_BYTES = 512 * 1024;
export function validateSyncPayload(payload) {
  if (!payload || payload.version !== 1 || !payload.values || typeof payload.values !== 'object' || Array.isArray(payload.values)) throw Error('Invalid browser data.');
  const values = {};
  for (const key of Object.keys(payload.values)) {
    if (!SYNC_KEYS.includes(key) || typeof payload.values[key] !== 'string') throw Error('Unsupported browser data.');
  }
  for (const key of SYNC_KEYS) {
    const value = payload.values[key];
    if (value === undefined) continue;
    if (key === 'target-lab-voter') {
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) throw Error('The original browser identity is invalid.');
    } else if (key === 'target-lab-show-curves') {
      if (!['true','false'].includes(value)) throw Error('Invalid display setting.');
    } else if (key !== 'target-lab-active-measurement') {
      const parsed = JSON.parse(value);
      if (['personal-tuning-v1','preference-tuning-axis-v1','target-lab-music-shortlist-v1'].includes(key)) {
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('Invalid tuning settings.');
      } else if (!Array.isArray(parsed)) throw Error('Invalid saved data.');
    }
    values[key] = value;
  }
  if (!values['target-lab-voter']) throw Error('Missing original browser identity.');
  const result = {version:1,values};
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > SYNC_MAX_BYTES) throw Error('Saved data exceeds the 512 KB sync limit. Your data has not been changed.');
  return result;
}
export function captureSyncPayload(storage) {
  let voter = storage.getItem('target-lab-voter');
  if (!voter) { voter = crypto.randomUUID(); storage.setItem('target-lab-voter',voter); }
  const values = {};
  for (const key of SYNC_KEYS) { const value = storage.getItem(key); if (value !== null) values[key] = value; }
  return validateSyncPayload({version:1,values});
}
// Roll back a failed local write before credentials change. A failed network
// completion keeps the imported state and can retry the idempotent handshake.
export function replaceSyncStorage(storage, payload) {
  const valid = validateSyncPayload(payload);
  const keys = [];
  for (let i=0;i<storage.length;i++) { const key=storage.key(i); if (/^(target-lab-|personal-tuning-|preference-tuning-|yinyang-)/.test(key)) keys.push(key); }
  const backup = keys.map(key=>[key,storage.getItem(key)]);
  try {
    for (const key of keys) storage.removeItem(key);
    for (const key of SYNC_KEYS) if (valid.values[key] !== undefined) storage.setItem(key,valid.values[key]);
  } catch (error) {
    for (const key of SYNC_KEYS) storage.removeItem(key);
    for (const [key,value] of backup) storage.setItem(key,value);
    throw error;
  }
}
function syncClient() {
  const error = document.getElementById('sync-error');
  const report = cause => {error.hidden=false;error.textContent=cause instanceof Error?cause.message:String(cause);};
  for (const form of document.querySelectorAll('form[data-action="create"]')) form.addEventListener('submit',event=>{
    try { form.querySelector('[name="payload"]').value = JSON.stringify(captureSyncPayload(localStorage)); }
    catch(cause) {event.preventDefault();report(cause);}
  });
  const count = document.getElementById('local-data-count');
  if (count) {try {const rows=JSON.parse(localStorage.getItem('target-lab-trials')||'[]'),measurements=JSON.parse(localStorage.getItem('target-lab-measurements')||'[]');count.textContent=`This browser currently has ${Array.isArray(rows)?rows.length:0} saved results and ${Array.isArray(measurements)?measurements.length:0} measurements.`;}catch{count.textContent='Some saved site data could not be read. It will also be replaced.';}}
  const apply = document.getElementById('apply-sync');
  if (!apply) return;
  const pendingKey='yinyang-sync-pending';
  const backupKey='yinyang-sync-backup';
  const restoreBackup=()=>{
    const backup=JSON.parse(sessionStorage.getItem(backupKey)||'null');
    if(!backup)throw Error('The browser backup is unavailable. Keep this tab open.');
    const keys=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(/^(target-lab-|personal-tuning-|preference-tuning-|yinyang-)/.test(key))keys.push(key);}
    for(const key of keys)localStorage.removeItem(key);
    for(const [key,value] of backup)localStorage.setItem(key,value);
    sessionStorage.removeItem(pendingKey);sessionStorage.removeItem(backupKey);
  };
  const post = async(action,extra={})=>{
    const response=await fetch('/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...extra})});
    const result=await response.json();if(!response.ok){const error=Error(result.error||'Sync could not finish. Please try again.');error.status=response.status;throw error;}return result;
  };
  apply.addEventListener('click',async()=>{
    apply.disabled=true;error.hidden=true;
    let applied=false;
    try {
      const expected=document.getElementById('sync-payload-hash').value;
      let pending;try{pending=JSON.parse(sessionStorage.getItem(pendingKey)||'null');}catch{}
      if(pending?.hash!==expected) {
        const result=await post('download');
        const payload=validateSyncPayload(result.payload);
        const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)))),x=>x.toString(16).padStart(2,'0')).join('');
        if(digest!==expected)throw Error('The transferred data did not match the approved request. Create a new code.');
        // Reserve the retry marker before touching local data. Storage denial
        // therefore fails before replacement. It holds only hashes and an ID.
        const backup=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(/^(target-lab-|personal-tuning-|preference-tuning-|yinyang-)/.test(key))backup.push([key,localStorage.getItem(key)]);}
        sessionStorage.setItem(backupKey,JSON.stringify(backup));
        sessionStorage.setItem(pendingKey,JSON.stringify({hash:expected,voter:payload.values['target-lab-voter']}));
        try {replaceSyncStorage(localStorage,payload);} catch(cause) {sessionStorage.removeItem(pendingKey);throw cause;}
      } else if(localStorage.getItem('target-lab-voter')!==pending.voter) throw Error('This browser changed while sync was pending. Create a new code.');
      applied=true;
      const result=await post('complete',{payloadHash:expected,replacementApplied:true});
      for(let i=sessionStorage.length-1;i>=0;i--) {const key=sessionStorage.key(i);if(/^(target-lab-|personal-tuning-|preference-tuning-|yinyang-)/.test(key))sessionStorage.removeItem(key);}
      if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('yinyang-browser-sync');channel.postMessage({complete:true});channel.close();}
      localStorage.setItem('yinyang-sync-event',crypto.randomUUID());localStorage.removeItem('yinyang-sync-event');
      window.location.replace(result.redirect);
    } catch(cause) {
      if(applied&&cause.status>=400){try{restoreBackup();applied=false;report('Sync did not finish. Your previous saved site data has been restored. '+cause.message);}catch(restoreError){report(restoreError);}}
      else if(applied)report('Saved site data was copied, but sign-in confirmation is pending. Keep this tab open and click Finish sync again. '+(cause instanceof Error?cause.message:''));
      else report(cause);
      apply.disabled=false;
      if(applied)apply.textContent='Finish sync';
    }
  });
}
export function browserSyncScript() {
  return `const SYNC_KEYS=${JSON.stringify(SYNC_KEYS)},SYNC_MAX_BYTES=${SYNC_MAX_BYTES};\n${validateSyncPayload.toString()}\n${captureSyncPayload.toString()}\n${replaceSyncStorage.toString()}\n(${syncClient.toString()})();`;
}
