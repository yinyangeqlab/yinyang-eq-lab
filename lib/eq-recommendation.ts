import { response } from "./autoeq";
import { exportFitRms, peakBoost, type FinalizedVariant } from "./preference-finalize";
import type { Point } from "./curves";
export const candidateKey = (fit: FinalizedVariant) => `${fit.method}:${fit.bands}:${fit.engine}:${fit.engineVersion}`;
const deepBassFrequencies = Array.from({ length: 97 }, (_, index) => 20 * 4 ** (index / 96));

export function deepBassBoost(fit: FinalizedVariant) {
  return Math.max(0, ...deepBassFrequencies.map(hz =>
    fit.filters.reduce((sum, filter) => sum + response(hz, filter), 0)
  ));
}

// Product defaults for a smaller correction when all close fits need large boosts.
const deepBassLimit = 6;
const overallBoostLimit = 8;
const boostScale = (deepBass: number, peak: number) => Math.min(1, deepBassLimit / deepBass, overallBoostLimit / peak);

function reduceBoost(fit: FinalizedVariant, deepBass: number, raw: Point[], target: Point[]) {
  let scale = boostScale(deepBass, fit.peakBoost);
  if (scale === 1) return fit;

  let filters = fit.filters;
  let peak = fit.peakBoost;
  // Recheck the actual response because filter gain and combined boost aren't proportional.
  do {
    filters = fit.filters.map(filter => ({ ...filter, gain: filter.gain * scale }));
    peak = peakBoost(filters);
    const next = boostScale(deepBassBoost({ ...fit, filters }), peak);
    if (next === 1) break;
    scale *= .98 * next;
  } while (scale > 0);
  return {
    ...fit,
    filters,
    reducedBoost: true,
    engineVersion: `${fit.engineVersion ?? fit.method};gain-scaled-v1`,
    peakBoost: peak,
    preamp: -Math.ceil((peak + .5) * 10) / 10,
    rms: exportFitRms(raw, target, filters),
  };
}

/** A disclosed numerical heuristic, not an audibility threshold or preference result. */
export function recommendCandidates(fits: FinalizedVariant[], tuning?: { raw: Point[]; target: Point[] }) {
  if (!fits.length) return null;
  const valid = fits.filter(f => Number.isFinite(f.rms) && Number.isFinite(f.preamp) && (!tuning || Number.isFinite(f.peakBoost)) && f.filters.length);
  if (!valid.length) return null;
  const bestError = [...valid].sort((a,b)=>a.rms-b.rms)[0];
  const leastHeadroom = [...valid].sort((a,b)=>b.preamp-a.preamp || a.rms-b.rms)[0];
  if (tuning) {
    // Charge three times as much per dB of deep-bass boost as overall peak boost.
    const ranked = valid.map(fit => {
      const deepBass = deepBassBoost(fit);
      return { fit, deepBass, score: fit.rms + .15 * deepBass + .05 * fit.peakBoost };
    }).sort((a, b) => a.score - b.score || a.fit.bands - b.fit.bands || a.fit.rms - b.fit.rms);
    const { fit, deepBass } = ranked[0];
    const recommended = reduceBoost(fit, deepBass, tuning.raw, tuning.target);
    return { recommended, bestError, leastHeadroom: recommended.preamp > leastHeadroom.preamp ? recommended : leastHeadroom };
  }
  const bounded = valid.filter(f=>f.filters.every(filter=>filter.q<=4));
  const pool = bounded.length ? bounded : valid;
  const bestBounded = Math.min(...pool.map(f=>f.rms));
  const recommended = pool.filter(f=>f.rms<=bestBounded+.15).sort((a,b)=>a.bands-b.bands || b.preamp-a.preamp || a.rms-b.rms)[0];
  return { recommended, bestError, leastHeadroom };
}
