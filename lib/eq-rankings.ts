import { approvedEqModels } from "../data/approved-eq-models";
import { fitPreferenceScores, type PairPreference } from "./preference-ranking";

export const rankingDeviceFilters = [
  { value: "all", label: "All" },
  { value: "oe", label: "Headphones" },
  { value: "ie", label: "IEMs" },
] as const;

export type RankingDevice = typeof rankingDeviceFilters[number]["value"];
export type PublishedPreset = {
  id: string;
  name: string;
  credit?: string;
  tags?: readonly string[];
  preview?: { path: `/eq-presets/${string}.txt`; sha256: string };
};
type PublishedPair = { a: string; b: string; winsA: number; winsB: number; ties: number };
export type PublishedEqModel = {
  id: string;
  name: string;
  type: Exclude<RankingDevice, "all">;
  presets: readonly PublishedPreset[];
  pairs: readonly PublishedPair[];
};

// Add only publication-approved metadata and released, level-matched results.
// Each pair counts one outcome per listener group. Store no identities or filters here.
export const publishedEqModels: readonly PublishedEqModel[] = approvedEqModels;

export function getPublishedEqPreview(modelId: string, presetId: string, version: string, models = publishedEqModels) {
  const model = models.find(item => item.id === modelId);
  const preset = model?.presets.find(item => item.id === presetId);
  if (!model || !preset?.preview || preset.preview.sha256 !== version ||
      !/^[a-f0-9]{64}$/.test(version) || !/^\/eq-presets\/[a-z0-9][a-z0-9-]*\.txt$/.test(preset.preview.path)) return null;
  return { model, preset, preview: preset.preview };
}

function rankModel(model: PublishedEqModel) {
  const byId = new Map(model.presets.map(preset => [preset.id, preset]));
  if (byId.size !== model.presets.length) throw Error(`Duplicate EQ preset in model ${model.id}.`);
  const records = new Map(model.presets.map(({ id }) => [id, { wins: 0, losses: 0, ties: 0 }]));
  const neighbors = new Map<string, Set<string>>();
  const pairs = new Set<string>();
  for (const { a, b, winsA, winsB, ties } of model.pairs) {
    const left = records.get(a), right = records.get(b);
    const pairKey = JSON.stringify([a, b].sort());
    if (!left || !right || a === b || pairs.has(pairKey) ||
        ![winsA, winsB, ties, winsA + winsB + ties].every(count => Number.isSafeInteger(count) && count >= 0)) {
      throw Error(`Invalid published comparison in model ${model.id}.`);
    }
    pairs.add(pairKey);
    if (winsA + winsB + ties === 0) continue;
    left.wins += winsA; left.losses += winsB; left.ties += ties;
    right.wins += winsB; right.losses += winsA; right.ties += ties;
    if (!neighbors.has(a)) neighbors.set(a, new Set());
    if (!neighbors.has(b)) neighbors.set(b, new Set());
    neighbors.get(a)!.add(b);
    neighbors.get(b)!.add(a);
  }

  const rankedIds = [...neighbors.keys()];
  const connected = new Set(rankedIds.slice(0, 1));
  for (const id of connected) for (const peer of neighbors.get(id)!) connected.add(peer);
  const needsConnection = connected.size !== rankedIds.length;
  if (needsConnection) return { model, ranked: [], awaiting: model.presets, needsConnection };

  const index = new Map(rankedIds.map((id, position) => [id, position]));
  const observations: PairPreference[] = model.pairs.flatMap(({ a, b, winsA, winsB, ties }) => {
    const weight = winsA + winsB + ties;
    return weight ? [{ a: index.get(a)!, b: index.get(b)!, score: (winsA + ties / 2) / weight, weight }] : [];
  });
  const scores = fitPreferenceScores(rankedIds.length, observations);
  const sorted = rankedIds.map((id, position) => ({ ...byId.get(id)!, ...records.get(id)!, ...scores[position] }))
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  let rank = 0;
  const ranked = sorted.map((row, position) => {
    if (!position || Math.abs(row.rating - sorted[position - 1].rating) > 1e-8) rank = position + 1;
    return { ...row, rank };
  });
  return { model, ranked, awaiting: model.presets.filter(row => !index.has(row.id)), needsConnection };
}

export function eqRankingsForDevice(models: readonly PublishedEqModel[], device: RankingDevice) {
  return models.filter(model => device === "all" || model.type === device)
    .map(rankModel).sort((a, b) => a.model.name.localeCompare(b.model.name) || a.model.id.localeCompare(b.model.id));
}
