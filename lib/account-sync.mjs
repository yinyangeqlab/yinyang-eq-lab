import {PREF_KEY,capturePreferences,applyPreferences,PREFERENCE_STORAGE_KEYS} from './account-preferences.mjs';
import {SYNC_KEYS,validateSyncPayload} from './browser-sync.mjs';
export const ACCOUNT_SYNC_KEYS=SYNC_KEYS.filter(key=>!['target-lab-voter','target-lab-active-measurement'].includes(key));
const voter='00000000-0000-4000-8000-000000000000';
export function validateAccountValues(values){
 if(!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).some(key=>!ACCOUNT_SYNC_KEYS.includes(key)))throw Error('Unsupported account sync data.');
 const valid=validateSyncPayload({version:1,values:{...values,'target-lab-voter':voter}}).values;delete valid['target-lab-voter'];return valid;
}
export function captureAccountValues(storage){
 const values={};for(const key of ACCOUNT_SYNC_KEYS){let value=storage.getItem(key);if(value!==null){try{const rows=JSON.parse(value);if(Array.isArray(rows))value=JSON.stringify(rows.filter(row=>!row?.adminTestOnly));}catch{}values[key]=value;}}
 const preferences=capturePreferences(storage);if(Object.keys(preferences).length)values[PREF_KEY]=JSON.stringify(preferences);else delete values[PREF_KEY];
 return validateAccountValues(values);
}
// Three-way merge, including deletion. Collections merge by stable item ID.
// An ambiguous collection or simultaneous edits to one item is a visible conflict.
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function mergeValue(base,local,remote){
 if(equal(local,base))return {value:remote};if(equal(remote,base)||equal(local,remote))return {value:local};
 if([base,local,remote].every(value=>Array.isArray(value))){
  const index=rows=>{const map=new Map();for(const row of rows){const id=row&&typeof row==='object'?(row.id??row.context):typeof row==='string'?row:null;if(id===null||id===undefined||map.has(String(id)))return null;map.set(String(id),row);}return map;};
  const maps=[base,local,remote].map(index);if(maps.every(Boolean)){const merged=[];for(const id of new Set([...maps[2].keys(),...maps[1].keys(),...maps[0].keys()])){const result=mergeValue(...maps.map(map=>map.get(id)));if(result.conflict)return result;if(result.value!==undefined)merged.push(result.value);}return {value:merged};}
 }
 if([base,local,remote].every(value=>value&&typeof value==='object'&&!Array.isArray(value))){const merged=Object.create(null);for(const key of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){const result=mergeValue(base[key],local[key],remote[key]);if(result.conflict)return result;if(result.value!==undefined)merged[key]=result.value;}return {value:merged};}
 return {conflict:true};
}
export function mergeAccountValues(base,local,remote){
 const values={},conflicts=[];for(const key of ACCOUNT_SYNC_KEYS){let result;
  // Absent collection means an empty collection only when all present values are arrays.
  const raw=[base[key],local[key],remote[key]],parsed=raw.map(value=>{if(value===undefined)return undefined;try{return JSON.parse(value);}catch{return value;}});
  if(parsed.some(Array.isArray)&&parsed.every(value=>value===undefined||Array.isArray(value)))result=mergeValue(...parsed.map(value=>value??[]));
  else result=mergeValue(...parsed);
  if(result.conflict){conflicts.push(key);if(local[key]!==undefined)values[key]=local[key];}
  else if(result.value!==undefined)values[key]=typeof result.value==='string'&&key==='target-lab-show-curves'?result.value:JSON.stringify(result.value);
 }
 return {values:validateAccountValues(values),conflicts};
}
// Only managed keys change. Preserve local admin-test rows; they never leave the device.
export function applyAccountValues(storage,raw){
 const values=validateAccountValues(raw),backup=Object.fromEntries([...ACCOUNT_SYNC_KEYS,...PREFERENCE_STORAGE_KEYS].map(key=>[key,storage.getItem(key)]));
 try{for(const key of ACCOUNT_SYNC_KEYS){let value=values[key];let tests=[];try{const rows=JSON.parse(backup[key]||'null');if(Array.isArray(rows))tests=rows.filter(row=>row?.adminTestOnly);}catch{}if(tests.length){const incoming=JSON.parse(value||'[]');if(!Array.isArray(incoming))throw Error('Cannot replace local test collection.');value=JSON.stringify([...incoming,...tests]);}if(value===undefined)storage.removeItem(key);else storage.setItem(key,value);}applyPreferences(storage,JSON.parse(values[PREF_KEY]||'{}'));}
 catch(error){for(const key of Object.keys(backup)){if(backup[key]===null)storage.removeItem(key);else storage.setItem(key,backup[key]);}throw error;}
}
