// Stable IDs preserve comparisons while names change. Historical snapshots stay intact.
const labels: Record<string, string> = {
  "80814769-6c61-4d24-801b-d80c20c1d5f4": "YinYang EQ Preference Target I",
  "7a8ee296-ac62-4e56-b413-0b1042e9f46f": "YinYang EQ Preference Target II",
  "fefbaa8f-563f-4c1b-ace9-74b299afa2fe": "YinYang EQ Preference Target II (rev. 2)",
};
// Normalize the legacy target naming format without embedding a creator identity.
const legacyRevisions: Record<string,string> = {
  MKI: labels["80814769-6c61-4d24-801b-d80c20c1d5f4"],
  MKII: labels["7a8ee296-ac62-4e56-b413-0b1042e9f46f"],
  "MKII v2": labels["fefbaa8f-563f-4c1b-ace9-74b299afa2fe"],
};
export function targetDisplayName(id: string, savedName: string) {
  const legacy = /^[\w-]+ target (MKII v2|MKII|MKI)$/.exec(savedName);
  return labels[id] ?? (legacy ? legacyRevisions[legacy[1]] : savedName);
}
export function targetLabelText(text: string) {
  return text.replace(/\b[\w-]+ target (MKII v2|MKII|MKI)\b/g, (_name, revision: string) => legacyRevisions[revision]);
}
export function trialDisplayLabels<T extends {pair: [string,string]; pairNames: [string,string]; winnerId: string; winnerName: string; loserName: string}>(row: T): T {
  return {...row, pairNames: row.pair.map((id,i)=>targetDisplayName(id,row.pairNames[i])) as [string,string],
    winnerName: targetDisplayName(row.winnerId,row.winnerName),
    loserName: targetDisplayName(row.pair.find(id=>id!==row.winnerId) ?? "",row.loserName)};
}
