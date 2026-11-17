// Browser-only admin test history. Never included in participant sync or research.
export const ADMIN_TEST_KEY = "yinyang-admin-tests-v1";
export const ADMIN_MUSIC_KEY = "yinyang-admin-music-tests-v1";
export type AdminTestRecord = {id:string;kind:string;createdAt:number;testOnly:true;data:unknown};
export function readAdminTests():AdminTestRecord[]{try{const value=JSON.parse(localStorage.getItem(ADMIN_TEST_KEY)||"[]");return Array.isArray(value)?value.filter(row=>row?.testOnly===true&&typeof row.id==="string"):[];}catch{return [];}}
export function saveAdminTestRecord(kind:string,data:unknown){
  const clean=JSON.parse(JSON.stringify(data,(key,value)=>/token|password|cookie|authorization|sessionHash|browserId|voterId|participantId|contributorId/i.test(key)?undefined:value));
  const row:AdminTestRecord={id:crypto.randomUUID(),kind,createdAt:Date.now(),testOnly:true,data:clean};
  const rows=[row,...readAdminTests()].slice(0,100);
  while(JSON.stringify(rows).length>2_000_000&&rows.length>1)rows.pop();
  if(JSON.stringify(rows).length>2_000_000)throw Error("This admin test is too large to save locally. Nothing was submitted.");
  localStorage.setItem(ADMIN_TEST_KEY,JSON.stringify(rows));
  window.dispatchEvent(new Event("yinyang-admin-tests-changed"));
  return row;
}
export function adminMusicChoices():Record<string,"keep"|"pass">{try{const data=JSON.parse(localStorage.getItem(ADMIN_MUSIC_KEY)||"{}");return Object.fromEntries(Object.entries(data).filter(([,value])=>value==="keep"||value==="pass")) as Record<string,"keep"|"pass">;}catch{return {};}}
export function saveAdminMusicChoice(url:string,choice:"keep"|"pass"|null){const choices=adminMusicChoices();if(choice)choices[url]=choice;else delete choices[url];const previous=localStorage.getItem(ADMIN_MUSIC_KEY);localStorage.setItem(ADMIN_MUSIC_KEY,JSON.stringify(choices));try{saveAdminTestRecord("music",{recording:url,choice});}catch(error){if(previous===null)localStorage.removeItem(ADMIN_MUSIC_KEY);else localStorage.setItem(ADMIN_MUSIC_KEY,previous);throw error;}return choices;}
export async function recordAdminTestIfNeeded(kind:string,data:unknown){
  const response=await fetch("/api/my-data",{cache:"no-store"});
  if(!response.ok)throw Error("Could not verify this account. Nothing was submitted; try again.");
  const identity=await response.json() as {sharedAdmin?:boolean;testOnly?:boolean};
  if(identity.sharedAdmin!==true&&identity.testOnly!==true)return false;
  saveAdminTestRecord(kind,data);return true;
}
