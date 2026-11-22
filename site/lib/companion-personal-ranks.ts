import { parsePersonalRuns, personalStandings } from './personal-shootout';

export function companionPersonalRankings(runs: unknown[]) {
  return runs.slice(0,8).flatMap(value => {
    try {
      const [run] = parsePersonalRuns(JSON.stringify([value]));
      if (run.adminTestOnly) return [];
      const rows = personalStandings(run).filter(row => row.heard > 0 && !run.excluded.includes(row.id));
      if (!rows.length) return [];
      const positions = Object.fromEntries(rows.map(row => [
        row.id, rows.findIndex(other => Math.abs(other.score - row.score) < 1e-8) + 1,
      ]));
      return [{label:run.label.slice(0,160), measurementId:run.measurement?.id ?? null, updatedAt:run.updatedAt, positions}];
    } catch {
      return [];
    }
  }).sort((a,b) => b.updatedAt - a.updatedAt);
}
