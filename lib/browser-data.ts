import type { Trial } from "@/components/results-profile";
// A tie/check has a server trial ID but no vote: review its listening-run ID.
export function comparisonLookup(row: Pick<Trial,"id"|"serverTrialId"|"recorded"|"mode">) {
  return row.recorded && row.serverTrialId
    ? {kind:"vote",id:row.serverTrialId}
    : {kind:row.mode==="open"?"open":"run",id:row.id};
}
export function deleteBrowserTrial(id: string) {
  const rows = JSON.parse(localStorage.getItem("target-lab-trials") || "[]") as Trial[];
  const reviews = JSON.parse(localStorage.getItem("target-lab-browser-reviews") || "[]") as {recordId:string}[];
  localStorage.setItem("target-lab-trials", JSON.stringify(rows.filter(row => row.id !== id)));
  localStorage.setItem("target-lab-browser-reviews", JSON.stringify(reviews.filter(row => row.recordId !== id)));
}
export function clearSiteBrowserData() {
  for (const storage of [localStorage, sessionStorage]) {
    const keys = Array.from({ length:storage.length }, (_,i) => storage.key(i)).filter((key): key is string => Boolean(key));
    for (const key of keys) if (/^(target-lab-|personal-tuning-|preference-tuning-|yinyang-)/.test(key)) storage.removeItem(key);
  }
  // Other tabs must drop in-memory copies rather than writing stale state back.
  if (typeof BroadcastChannel !== "undefined") { const channel = new BroadcastChannel("yinyang-privacy-erasure"); channel.postMessage({ cleared:true }); channel.close(); }
  localStorage.setItem("yinyang-erasure-event", crypto.randomUUID());
  localStorage.removeItem("yinyang-erasure-event");
}
export function notifySharingChoicesChanged() {
  window.dispatchEvent(new Event("yinyang-data-changed"));
  localStorage.setItem("yinyang-sharing-event", crypto.randomUUID());
  localStorage.removeItem("yinyang-sharing-event");
}
