import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import vm from 'node:vm';
const urls = new Map();
function load(path) {
  path = resolve(path);
  if (urls.has(path)) return urls.get(path);
  let code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  code = code.replace(/from ["']([^"']+)["']/g, (_all, name) => {
    if (!name.startsWith('.') && !name.startsWith('@/')) return `from ${JSON.stringify(name)}`;
    const file = name.startsWith('@/') ? resolve('lib/..', name.slice(2)) : resolve(path, '..', name);
    return `from ${JSON.stringify(load(file.endsWith('.ts') ? file : file + '.ts'))}`;
  });
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64'); urls.set(path, url); return url;
}
const core = await import(load('lib/autoeq-fit.ts'));
const { createEngine } = await import(load('lib/peqdb-engine.ts'));
const { createAutoEqService } = await import(load('lib/autoeq-client.ts'));
const { response, peqCoefficients } = await import(load('lib/autoeq.ts'));
const { eqCoefficients } = await import(load('lib/blind-eq.ts'));
const { parseLibraryEq } = await import(load('lib/music-library-eq.ts'));
const { exportEqualizerApo, finalizeVariant, exportFitRms } = await import(load('lib/preference-finalize.ts'));
const { finalizePeqdb } = await import(load('lib/autoeq-export.ts'));
const { safeGain, watchAudioInterruptions } = await import(load('lib/eq-playback.ts'));
{
  const context = new EventTarget(); context.state = 'running';
  let interruptions = 0;
  const audio = { paused: false, pause() { this.paused = true; } };
  const stop = watchAudioInterruptions(context, () => audio, () => { interruptions++; });
  for (const state of ['suspended', 'interrupted']) {
    audio.paused = false; context.state = state; context.dispatchEvent(new Event('statechange'));
    assert.equal(audio.paused, true, 'Suspension/interruption pauses media rather than counting silent playback');
  }
  context.state = 'running'; context.dispatchEvent(new Event('statechange')); assert.equal(audio.paused, true, 'Recovery requires an explicit new Play');
  audio.paused = false; context.state = 'closed'; context.dispatchEvent(new Event('statechange')); assert.equal(interruptions, 2);
  stop(); context.state = 'interrupted'; context.dispatchEvent(new Event('statechange')); assert.equal(interruptions, 2, 'Retired interruption listeners are removed');
}
{
  const calls = [], node = { gain: { value: .8, cancelScheduledValues() {}, setValueAtTime: (...args) => calls.push(['set', ...args]), linearRampToValueAtTime: (...args) => calls.push(['ramp', ...args]), setTargetAtTime: (...args) => calls.push(['target', ...args]) } };
  safeGain(node, .4, 1, false); assert.deepEqual(calls, [['set', .8, 1], ['ramp', .4, 1.005]]);
  calls.length = 0; safeGain(node, .4, 1); assert.deepEqual(calls[0], ['set', .4, 1], 'New filter/balance headroom retains immediate attenuation');
}
const flat = [[20, 0], [20000, 0]];
const request = { raw: flat, targets: [flat, [[20, 5], [1000, 0], [20000, -2]]], bands: 10, kind: 'shootout', sampleRate: 48000 };
for (const type of ['PK', 'LSC', 'HSC']) for (const rate of [44100, 48000, 96000]) for (const q of [.4, .707, 3]) {
  const filter = { type, hz: 1500, gain: 6, q }, expected = eqCoefficients(filter, rate), actual = peqCoefficients(filter, rate);
  assert.deepEqual(actual.b.map(x => x / actual.a[0]), expected.feedforward);
  assert.deepEqual(actual.a.map(x => x / actual.a[0]), expected.feedback);
  assert.ok(Math.abs(response(1500, filter, rate) - (type === 'PK' ? 6 : 3)) < 1e-8);
}
const wasmFactory = (await import(pathToFileURL(resolve('artifacts/peqdb-autoeq/public/vendor/peqdb-autoeq/autoeq-wasm.mjs')).href)).default;
const engine = await createEngine(wasmFactory,
  readFileSync('artifacts/peqdb-autoeq/public/vendor/peqdb-autoeq/autoeq-wasm.wasm'));
const constantFit = engine.fit(flat, [[20, 2], [20000, 2]], 'none', 3, 3000, 48000, false);
assert.equal(constantFit.offset, 0);
assert.ok(Math.abs(response(1000, constantFit.filters[0]) + response(1000, constantFit.filters[1]) + response(1000, constantFit.filters[2]) - 2) < .1, 'A null amp pointer must fit the constant gain into the filters');
const fixtures = existsSync('artifacts/autoeq-lab/public/fixtures.json') ? JSON.parse(readFileSync('artifacts/autoeq-lab/public/fixtures.json', 'utf8')) : [{ name: 'Synthetic fallback fixture', points: [[20, 6], [1000, 0], [20000, -4]], target: flat }];
const measurements = [];
for (const fixture of fixtures) {
  const req = { ...request, raw: fixture.points, targets: [fixture.target] };
  const target = core.correction(req.raw, fixture.target, req.kind);
  const result = engine.fit(flat, target, 'none', 10, 3000, 48000, false);
  const fit = core.describeFit(req, fixture.target, result.filters, 'peqdb');
  const legacy = core.legacyBatch(req, 'test')[0];
  assert.equal(result.offset, 0); assert.ok(fit.preamp <= -.5);
  const variant = { ...fit, bands: 10, method: 'peqdb', priority: 'close' };
  const parsed = parseLibraryEq(exportEqualizerApo(variant), 'Round trip');
  assert.equal(parsed.filters[0].type, 'LSC'); assert.equal(parsed.filters[1].type, 'HSC');
  for (let i = 0; i < fit.filters.length; i++) assert.ok(Math.abs(parsed.filters[i].q - fit.filters[i].q) < 1e-6);
  measurements.push({ name: fixture.name, peqdbRms: fit.rms, legacyRms: legacy.rms, fitMs: result.fitMs });
}
// Execute the actual export endpoint with disposable ownership/database adapters.
const routeModule = { exports: {} }, inserts = [];
const routeJs = ts.transpileModule(readFileSync('app/api/preference-exports/route.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(routeJs, { module: routeModule, exports: routeModule.exports, Response, Request, crypto, require(name) {
  if (name.endsWith('submission-ownership')) return { submissionContext: async () => ({ record: id => ({ ownership: id }) }) };
  if (name === '@/db') return { getDb: () => ({ insert: () => ({ values: value => value }), batch: async values => inserts.push(values) }) };
  if (name === '@/db/schema') return { preferenceExports: {} };
  if (name.endsWith('request-json')) return { readJsonObject: request => request.json(), requestInputResponse: () => null };
  throw Error(name);
} });
const exportVariant = { bands: 10, method: 'peqdb', priority: 'close', preamp: -6, rms: .3, filters: Array.from({ length: 10 }, (_, i) => ({ type: i === 0 ? 'LSC' : i === 1 ? 'HSC' : 'PK', hz: 100 + i * 100, gain: 2, q: .7 })) };
const exportBody = { targetId: 'fixture', targetName: 'Fixture', targetCreator: 'Local fixture', measurementName: 'Synthetic', exportKind: 'eq', format: 'txt', filename: 'fixture.txt', contents: 'Preamp: -6 dB', settings: {}, curve: flat, variant: exportVariant };
const post = body => routeModule.exports.POST(new Request('https://local.test/api/preference-exports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
assert.equal((await post(exportBody)).status, 201); assert.equal(inserts.length, 1);
for (const change of [{ method: 'unknown' }, { priority: 'smooth' }, { filters: exportVariant.filters.map(f => ({ ...f, type: 'unknown' })) }, { preamp: 3 }]) assert.equal((await post({ ...exportBody, variant: { ...exportVariant, ...change } })).status, 400);
assert.equal(inserts.length, 1, 'Invalid exports must not write');

let workers = [];
function factory() {
  const worker = { onmessage: null, onerror: null, onmessageerror: null, terminated: false, messages: [], postMessage(value) { this.messages.push(structuredClone(value)); }, terminate() { this.terminated = true; } };
  workers.push(worker); return worker;
}
const service = createAutoEqService(factory, 1000, 10);
const valid = core.legacyBatch(request, 'test');
const promise = service.fit(request); assert.equal(workers.length, 1);
workers[0].onmessage({ data: { id: workers[0].messages[0].id, results: valid } });
assert.equal((await promise)[0].engine, 'legacy');
const cached = await service.fit(request); cached[0].filters[0].gain = 12;
assert.notEqual((await service.fit(request))[0].filters[0].gain, 12, 'Cache results must be defensive copies');
await new Promise(resolve => setTimeout(resolve, 20)); assert.equal(workers[0].terminated, true);
const changed = { ...request, sampleRate: 44100 }, controller = new AbortController();
const aborted = service.fit(changed, controller.signal); controller.abort(); await assert.rejects(aborted, /cancelled/);
assert.equal(workers.at(-1).terminated, true);
const malformed = service.fit(changed); const current = workers.at(-1);
current.onmessage({ data: { id: current.messages[0].id, results: [{ ...valid[0], filters: [{ hz: NaN, q: 1, gain: 1 }] }] } });
assert.ok((await malformed).every(f => f.engine === 'legacy'), 'Malformed worker output must fall back for the complete pair');
service.dispose();
// A queued callback from a terminated worker must not affect its replacement.
const isolated = createAutoEqService(factory);
const cancel = new AbortController(), retiredFit = isolated.fit(request, cancel.signal), retired = workers.at(-1);
const retiredHandlers = { message: retired.onmessage, error: retired.onerror, messageerror: retired.onmessageerror };
cancel.abort(); await assert.rejects(retiredFit, /cancelled/);
const replacementFit = isolated.fit(request), replacement = workers.at(-1);
retiredHandlers.error(); retiredHandlers.messageerror();
retiredHandlers.message({ data: { id: replacement.messages[0].id, error: 'Late retired message' } });
assert.equal(replacement.terminated, false, 'Retired worker errors cannot terminate the replacement');
replacement.onmessage({ data: { id: replacement.messages[0].id, results: valid } });
assert.deepEqual(await replacementFit, valid);
isolated.dispose();
// postMessage snapshots inputs; fallback and caching must use that same snapshot.
for (const reply of ['success', 'failure']) {
  const snapshots = createAutoEqService(factory), mutable = structuredClone(request);
  const pendingFit = snapshots.fit(mutable), running = workers.at(-1);
  mutable.raw[0][1] = 10; mutable.targets[0][0][1] = -5;
  if (reply === 'success') running.onmessage({ data: { id: running.messages[0].id, results: valid } });
  else running.onerror();
  const result = await pendingFit;
  assert.deepEqual(result.map(f => [f.filters, f.rms]), valid.map(f => [f.filters, f.rms]), 'Fallback uses submitted inputs');
  assert.deepEqual(await snapshots.fit(request), result, 'The original input key receives the result');
  if (reply === 'success') {
    const changedFit = snapshots.fit(mutable), changedWorker = workers.at(-1);
    assert.equal(changedWorker.messages.at(-1).request.raw[0][1], mutable.raw[0][1], 'Changed curves require a new fit');
    changedWorker.onmessage({ data: { id: changedWorker.messages.at(-1).id, results: core.legacyBatch(mutable, 'test') } });
    await changedFit;
  } else {
    const count = workers.length;
    assert.deepEqual((await snapshots.fit(mutable)).map(f => f.rms), core.legacyBatch(mutable, 'test').map(f => f.rms));
    assert.equal(workers.length, count, 'A failed engine is bypassed for subsequent inputs until reload');
  }
  snapshots.dispose();
}
const broken = createAutoEqService(() => { throw Error('Worker blocked'); });
assert.ok((await broken.fit(request)).every(f => f.engine === 'legacy')); broken.dispose();
const timeout = createAutoEqService(factory, 1, 1);
assert.ok((await timeout.fit(request)).every(f => f.engine === 'legacy'));
const countAfterTimeout = workers.length;
await timeout.fit({ ...request, sampleRate: 96000 });
assert.equal(workers.length, countAfterTimeout, 'A second setup must not repeat the stalled engine timeout'); timeout.dispose();
const loadFailure = createAutoEqService(factory, 1000, 1), initialLoad = loadFailure.fit(request), loadingWorker = workers.at(-1);
loadingWorker.onmessage({ data: { id: loadingWorker.messages[0].id, results: valid, unavailable: true } }); await initialLoad;
await new Promise(resolve => setTimeout(resolve, 10)); const countAfterLoad = workers.length;
await loadFailure.fit({ ...request, sampleRate: 96000 });
assert.equal(workers.length, countAfterLoad, 'A WASM load failure survives idle worker teardown'); loadFailure.dispose();
for (const rate of [3000, 16000, 384000, 768000]) {
  const fallback = createAutoEqService(() => { throw Error('Restricted'); });
  const fits = await fallback.fit({ ...request, sampleRate: rate });
  assert.ok(fits.every(f => f.engine === 'legacy' && f.sampleRate === rate && Number.isFinite(f.rms)), 'Unsupported PEQdB rate still permits legacy playback'); fallback.dispose();
}
// The actual async export wrapper must report the same error as an identical old-method card.
globalThis.Worker = class { constructor() { throw Error('Export fallback fixture'); } };
const exportRaw = [[20, 6], [1000, 0], [20000, -3]];
for (const priority of ['close', 'smooth']) {
  const original = finalizeVariant(exportRaw, flat, 10, 'precise', priority);
  const fallback = await finalizePeqdb(exportRaw, flat, 10, undefined, priority);
  assert.deepEqual(fallback.filters, original.filters); assert.equal(fallback.rms, original.rms);
  assert.equal(exportFitRms(exportRaw, flat, original.filters), original.rms);
  assert.ok(fallback.engineVersion.includes(`precise-${priority}`) && fallback.engineVersion.includes('export-rms-v1'));
}
assert.throws(() => core.validateRequest({ ...request, targets: [[]] }));
mkdirSync('artifacts/peqdb-autoeq/review', { recursive: true });
writeFileSync('artifacts/peqdb-autoeq/review/measurements.json', JSON.stringify(measurements, null, 2));
console.log('PASS: actual unsmoothed WASM on available public/synthetic fixtures; explicit normalization; peak/shelf math; export/import Q preservation; lazy worker, cache/input isolation, retired callbacks, abort, idle disposal, malformed response, blocked worker and timeout fallback.');
console.table(measurements);
