import { at, createEngine } from './peqdb-engine';
import type { Point } from './curves';
import { correction, describeFit, fitSmoothing, legacyBatch, validateRequest, type AutoEqRequest } from './autoeq-fit';
let engine: ReturnType<typeof createEngine> | undefined;
let unavailable = false;
self.onmessage = async (event: MessageEvent<{ id: number; request: AutoEqRequest }>) => {
  const { id, request } = event.data;
  try {
    validateRequest(request);
    let results;
    if (request.method === "standard" || request.method === "precise") {
      results = legacyBatch(request, "");
      self.postMessage({ id, results, unavailable });
      return;
    }
    try {
      if (unavailable) throw Error('Engine unavailable');
      engine ??= import(/* @vite-ignore */ "/vendor/peqdb-autoeq/autoeq-wasm.mjs").then(({ default: factory }) => createEngine(factory)).catch(error => { unavailable = true; throw error; });
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
    self.postMessage({ id, results, unavailable });
  } catch { self.postMessage({ id, error: 'Could not prepare EQ from these curves.' }); }
};
