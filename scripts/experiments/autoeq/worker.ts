import { createEngine } from './engine';
import { finishComparison, ourFits, type Fixture } from './compare';
let engine: ReturnType<typeof createEngine> | undefined;
self.onmessage = async (event: MessageEvent<{ id: number; fixture: Fixture; rate: number }>) => {
  const { id, fixture, rate } = event.data;
  try {
    const start = performance.now();
    engine ??= createEngine('/engine/autoeq-wasm.mjs').catch(error => { engine = undefined; throw error; });
    const loaded = await engine;
    const fits = ourFits(fixture, rate);
    const precise = loaded.fit(fixture.points, fixture.target, 'none', 10, 3000, rate);
    const adaptive = loaded.fit(fixture.points, fixture.target, fixture.type, 10, 3000, rate);
    const result = finishComparison(fixture, fits, precise, adaptive, rate, 0);
    result.totalMs = performance.now() - start;
    self.postMessage({ id, result });
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : String(error) }); }
};
