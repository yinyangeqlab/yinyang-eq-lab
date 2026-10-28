import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
const root = fileURLToPath(new URL('../..', import.meta.url));
const js = ts.transpileModule(readFileSync(new URL('./engine.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { createEngine, validatePoints } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const engine = await createEngine(pathToFileURL(root + '/artifacts/autoeq-lab/public/engine/autoeq-wasm.mjs').href, readFileSync(root + '/artifacts/autoeq-lab/public/engine/autoeq-wasm.wasm'));
const fixtures = JSON.parse(readFileSync(root + '/artifacts/autoeq-lab/public/fixtures.json', 'utf8'));
const flat = [[20, 0], [20000, 0]];
for (const bad of [[], [[100, 0]], [[100, 0], [100, 1]], [[200, 0], [100, 1]], [[20, NaN], [20000, 0]]]) assert.throws(() => validatePoints(bad));
for (const config of [[33, 3000, 48000], [1, 3000, 48000], [10, 0, 48000], [10, 3000, 24000]]) assert.throws(() => engine.fit(flat, flat, 'none', ...config));
for (const smooth of ['none', 'ie', 'oe']) {
  const fit = engine.fit(flat, flat, smooth);
  assert.ok(fit.filters.every(f => Math.abs(f.gain) < .01), 'Flat curves should produce flat filters');
}
const first = engine.fit(fixtures[0].points, fixtures[0].target);
const times = [];
for (let i = 0; i < 50; i++) {
  const fixture = fixtures[i % fixtures.length];
  const fit = engine.fit(fixture.points, fixture.target);
  assert.equal(fit.memoryBytes, first.memoryBytes, 'Repeated fits must not grow WASM memory');
  times.push(fit.fitMs);
}
assert.deepEqual(engine.fit(fixtures[0].points, fixtures[0].target).filters, first.filters, 'Identical inputs should reproduce filters');
times.sort((a, b) => a - b);
const summary = { passed: true, repeatedFits: 50, memoryBytes: first.memoryBytes, medianFitMs: times[25], p95FitMs: times[47] };
writeFileSync(root + '/artifacts/autoeq-lab/review/engine-summary.json', JSON.stringify(summary, null, 2));
console.log(summary);
