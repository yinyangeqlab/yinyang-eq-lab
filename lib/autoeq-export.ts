import type { Point } from './curves';
import { exportFitRms, type FinalizedVariant } from './preference-finalize';
import { fitAutoEqAsync } from './autoeq-client';
export async function finalizePeqdb(raw: Point[], desired: Point[], bands: 10 | 15 | 20, signal?: AbortSignal, legacyPriority: 'smooth' | 'close' = 'close'): Promise<FinalizedVariant> {
  raw = structuredClone(raw); desired = structuredClone(desired);
  const [fit] = await fitAutoEqAsync({ raw, targets: [desired], bands, kind: 'export', sampleRate: 48000, legacyPriority }, signal);
  return { bands, method: 'peqdb', priority: 'close', ...fit, rms: exportFitRms(raw, desired, fit.filters), engineVersion: `${fit.engineVersion};export-rms-v1` };
}
