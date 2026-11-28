import { at, createEngine } from './peqdb-engine';
import type { Point } from './curves';
import { fitJointEq } from './joint-fit';
import { correction, describeFit, fitSmoothing, legacyBatch, validateRequest, type AutoEqRequest } from './autoeq-fit';
export function createFitRunner(loadEngine: () => ReturnType<typeof createEngine>) {
  let engine: ReturnType<typeof createEngine> | undefined;
  let unavailable = false;
  return async (request: AutoEqRequest) => {
    validateRequest(request);
    let results;
    if (request.method === "joint") {
      results = request.targets.map(target => describeFit(request, target, fitJointEq(request.raw, target, request.sampleRate, request.bands), "joint"));
      return { results, unavailable: false };
    }
    if (request.method === "standard" || request.method === "precise") {
      results = legacyBatch(request, "");
      return {results, unavailable};
    }
    try {
      if (unavailable) throw Error('Engine unavailable');
      engine ??= loadEngine().catch(error => { unavailable = true; throw error; });
      const loaded = await engine;
      results = request.targets.map(target => {
        const desired = correction(request.raw, target, request.kind);
        const smoothing = fitSmoothing(request);
        // Smoothing acts on the measurement. Preserve the fixed reference computed from the original curves.
        const raw: Point[] = smoothing === 'none' ? [[20, 0], [20000, 0]] : request.raw;
        const alignedTarget: Point[] = smoothing === 'none' ? desired
          : desired.map(([hz, db]) => [hz, db + at(request.raw, hz)]);
        const fit = loaded.fit(raw, alignedTarget, smoothing, request.bands, 3000, request.sampleRate, false);
        return describeFit(request, target, fit.filters, 'peqdb');
      });
    } catch {
      // The whole pair uses the same engine even when one fit fails validation.
      results = legacyBatch(request, 'PEQdB could not run; the original fitter was used.');
    }
    return { results, unavailable };
  };
}
