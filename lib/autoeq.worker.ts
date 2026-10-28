import { createEngine } from './peqdb-engine';
import { correction, describeFit, legacyBatch, validateRequest, type AutoEqRequest } from './autoeq-fit';
let engine: ReturnType<typeof createEngine> | undefined;
let unavailable = false;
self.onmessage = async (event: MessageEvent<{ id: number; request: AutoEqRequest }>) => {
  const { id, request } = event.data;
  try {
    validateRequest(request);
    let results;
    try {
      if (unavailable) throw Error('Engine unavailable');
      engine ??= import(/* @vite-ignore */ "/vendor/peqdb-autoeq/autoeq-wasm.mjs").then(({ default: factory }) => createEngine(factory)).catch(error => { unavailable = true; throw error; });
      const loaded = await engine;
      results = request.targets.map(target => {
        const desired = correction(request.raw, target, request.kind);
        // Fixed midrange/1 kHz reference preserves application normalization.
        // No adaptive smoothing and no free overall gain parameter.
        const fit = loaded.fit([[20, 0], [20000, 0]], desired, 'none', request.bands, 3000, request.sampleRate, false);
        return describeFit(request, target, fit.filters, 'peqdb');
      });
    } catch {
      // The whole pair uses the same engine even when one fit fails validation.
      results = legacyBatch(request, 'PEQdB could not run; the original fitter was used.');
    }
    self.postMessage({ id, results, unavailable });
  } catch { self.postMessage({ id, error: 'Could not prepare EQ from these curves.' }); }
};
