/** Search only already-visible rows; never changes the stored display/provenance. */
export function searchText(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
export function searchScore(query: string, fields: readonly string[]): number {
  const q = searchText(query); if (!q) return 0;
  const values = fields.map(searchText), compact = q.replace(/ /g, "");
  if (values.some(value => value.replace(/ /g, "") === compact)) return 3;
  const tokens = q.split(/ +/), words = values.join(" ").split(/ +/);
  if (tokens.every(token => words.some(word => word.startsWith(token)) || values.some(value => value.replace(/ /g, "").includes(token)))) return 2;
  if (values.some(value => value.replace(/ /g, "").includes(compact)) || tokens.every(token => words.some(word => word.includes(token)))) return 1;
  return -1;
}
const names = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
export function searchRows<T>(rows: readonly T[], query: string, fields: (row: T) => string[]): T[] {
  return rows.map((row, index) => ({ row, index, fields: fields(row), score: searchScore(query, fields(row)) }))
    .filter(item => item.score >= 0).sort((a, b) => b.score - a.score || names.compare(a.fields[0] || "", b.fields[0] || "") || names.compare(a.fields.slice(1).join(" "), b.fields.slice(1).join(" ")) || a.index - b.index).map(item => item.row);
}
