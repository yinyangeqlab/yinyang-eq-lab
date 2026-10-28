import { legacyBatch, validateRequest, type AutoEqFit, type AutoEqRequest } from './autoeq-fit';
type Reply = { id: number; results?: AutoEqFit[]; error?: string; unavailable?: boolean };
type Pending = { resolve: (fits: AutoEqFit[]) => void; reject: (error: Error) => void; request: AutoEqRequest; cleanup: () => void };
const abortError = () => new DOMException('EQ request cancelled.', 'AbortError');

export function createAutoEqService(makeWorker = () => new Worker(new URL('./autoeq.worker.ts', import.meta.url), { type: 'module' }), timeoutMs = 20000, idleMs = 30000) {
  let worker: Worker | null = null, id = 0, idle: ReturnType<typeof setTimeout> | undefined;
  let unavailable = false;
  const pending = new Map<number, Pending>();
  const cache = new Map<string, AutoEqFit[]>();
  let cacheChars = 0;
  const key = (request: AutoEqRequest) => JSON.stringify(request);
  const remember = (request: AutoEqRequest, results: AutoEqFit[]) => {
    const encoded = key(request); if (encoded.length > 500000) return;
    if (cache.has(encoded)) { cache.delete(encoded); cacheChars -= encoded.length; }
    while (cache.size && (cache.size >= 12 || cacheChars + encoded.length > 500000)) { const oldest = cache.keys().next().value!; cacheChars -= oldest.length; cache.delete(oldest); }
    cache.set(encoded, structuredClone(results)); cacheChars += encoded.length;
  };
  const validResults = (results: AutoEqFit[] | undefined, request: AutoEqRequest) => Array.isArray(results) && results.length === request.targets.length && results.every(f =>
    f && ['peqdb', 'legacy'].includes(f.engine) && f.engine === results[0].engine && typeof f.engineVersion === 'string' && f.engineVersion.length <= 160 && f.sampleRate === request.sampleRate &&
    [f.preamp, f.rms, f.peakBoost].every(Number.isFinite) && f.preamp <= 0 && f.rms >= 0 && Array.isArray(f.filters) && f.filters.length >= 1 && f.filters.length <= request.bands && f.filters.every(filter =>
      ['PK', 'LSC', 'HSC'].includes(filter.type ?? 'PK') && [filter.hz, filter.gain, filter.q].every(Number.isFinite) && filter.hz >= 20 && filter.hz < request.sampleRate / 2 && Math.abs(filter.gain) <= 24 && filter.q >= .1 && filter.q <= 20));
  function stop() {
    if (worker) { worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; worker.terminate(); }
    worker = null; clearTimeout(idle);
  }
  function scheduleIdle() { clearTimeout(idle); if (!pending.size) idle = setTimeout(stop, idleMs); }
  function failWorker() {
    unavailable = true;
    stop();
    for (const [id, p] of pending) {
      pending.delete(id); p.cleanup();
      try { const fits = legacyBatch(p.request, 'The background EQ engine was unavailable; the original fitter was used.'); remember(p.request, fits); p.resolve(fits); }
      catch (error) { p.reject(error instanceof Error ? error : Error('EQ fitting failed.')); }
    }
  }
  function connect() {
    if (worker) return worker;
    const connected = makeWorker();
    worker = connected;
    connected.onmessage = (event: MessageEvent<Reply>) => {
      if (worker !== connected) return;
      const p = pending.get(event.data.id); if (!p) return;
      if (event.data.unavailable === true) unavailable = true;
      pending.delete(event.data.id); p.cleanup();
      if (event.data.error || !validResults(event.data.results, p.request)) {
        try { const fits = legacyBatch(p.request, 'The background EQ result was invalid; the original fitter was used.'); remember(p.request, fits); p.resolve(fits); }
        catch { p.reject(Error('Could not prepare headphone EQ.')); }
      } else { remember(p.request, event.data.results!); p.resolve(event.data.results!); }
      scheduleIdle();
    };
    connected.onerror = connected.onmessageerror = () => { if (worker === connected) failWorker(); };
    return connected;
  }
  return {
    async fit(request: AutoEqRequest, signal?: AbortSignal): Promise<AutoEqFit[]> {
      validateRequest(request);
      if (signal?.aborted) throw abortError();
      // Match the worker's cloned inputs throughout fallback and cache insertion.
      request = structuredClone(request);
      const cached = cache.get(key(request)); if (cached) return structuredClone(cached);
      if (unavailable) {
        const fits = legacyBatch(request, 'The background EQ engine was unavailable; the original fitter was used.');
        remember(request, fits); return fits;
      }
      clearTimeout(idle);
      return new Promise((resolve, reject) => {
        const next = ++id;
        const onAbort = () => { const p = pending.get(next); if (!p) return; pending.delete(next); p.cleanup(); p.reject(abortError()); if (!pending.size) stop(); };
        const timer = setTimeout(failWorker, timeoutMs);
        const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); };
        pending.set(next, { request, resolve, reject, cleanup });
        signal?.addEventListener('abort', onAbort, { once: true });
        try { connect().postMessage({ id: next, request }); } catch { failWorker(); }
      });
    },
    dispose() { stop(); for (const p of pending.values()) { p.cleanup(); p.reject(abortError()); } pending.clear(); cache.clear(); cacheChars = 0; },
  };
}
let shared: ReturnType<typeof createAutoEqService> | undefined;
export function fitAutoEqAsync(request: AutoEqRequest, signal?: AbortSignal) { shared ??= createAutoEqService(); return shared.fit(request, signal); }
