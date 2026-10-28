import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
const { chromium, webkit, devices } = await import(process.env.AUTOEQ_PLAYWRIGHT || 'playwright');
const root = resolve('dist/client');
const server = createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><title>Built AutoEQ worker check</title>'); return; }
  const file = resolve(root, '.' + decodeURIComponent(pathname));
  if (!file.startsWith(root + '/')) { response.statusCode = 403; response.end(); return; }
  try { response.setHeader('Content-Type', extname(file) === '.wasm' ? 'application/wasm' : ['.mjs', '.js'].includes(extname(file)) ? 'text/javascript' : 'text/plain'); response.end(readFileSync(file)); }
  catch { response.statusCode = 404; response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = process.env.AUTOEQ_BROWSER === 'webkit'
  ? await webkit.launch({ ...(process.env.AUTOEQ_WEBKIT_EXECUTABLE ? { executablePath: process.env.AUTOEQ_WEBKIT_EXECUTABLE } : {}), headless: true })
  : await chromium.launch({ executablePath: '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
try {
  const worker = readdirSync(join(root, '_next/static/workers')).find(name => name.startsWith('autoeq.worker-') && name.endsWith('.js'));
  assert.ok(worker, 'Build must emit the AutoEQ worker');
  const context = await browser.newContext(process.env.AUTOEQ_DEVICE ? devices[process.env.AUTOEQ_DEVICE] : {}), page = await context.newPage();
  await context.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(route.request().url().includes('admin-session') ? { active: false } : []) }));
  const origin = process.env.AUTOEQ_BUILT_ORIGIN || `http://127.0.0.1:${server.address().port}`;
  await page.goto(origin + (process.env.AUTOEQ_BUILT_ORIGIN ? '/software-licenses' : '/'));
  for (const [file, type] of [['autoeq-wasm.mjs', /(?:text|application)\/javascript/], ['autoeq-wasm.wasm', /application\/wasm/]]) {
    const response = await page.request.get(`${origin}/vendor/peqdb-autoeq/${file}`);
    assert.equal(response.status(), 200); assert.match(response.headers()['content-type'], type);
  }
  const result = await page.evaluate(worker => new Promise((resolve, reject) => {
    const instance = new Worker('/_next/static/workers/' + worker, { type: 'module' });
    const timeout = setTimeout(() => { instance.terminate(); reject(Error('Built worker timed out')); }, 20000);
    instance.onerror = e => { clearTimeout(timeout); instance.terminate(); reject(Error(e.message)); };
    const request = { raw: [[20, 4], [1000, 0], [20000, -3]], targets: [[[20, 0], [20000, 0]], [[20, 2], [1000, 0], [20000, 0]]], kind: 'shootout', bands: 10, sampleRate: 384000 };
    let unsupported;
    instance.onmessage = event => {
      if (event.data.id === 1) { unsupported = event.data; instance.postMessage({ id: 2, request: { ...request, sampleRate: 48000 } }); return; }
      clearTimeout(timeout); instance.terminate(); resolve({ unsupported, supported: event.data });
    };
    instance.postMessage({ id: 1, request });
  }), worker);
  assert.equal(result.unsupported.results?.length, 2);
  assert.ok(result.unsupported.results.every(fit => fit.engine === 'legacy' && fit.sampleRate === 384000));
  assert.equal(result.supported.results?.length, 2);
  assert.ok(result.supported.results.every(fit => fit.engine === 'peqdb'), 'An unsupported rate must not disable PEQdB for later supported requests');
  writeFileSync('artifacts/peqdb-autoeq/review/built-worker.json', JSON.stringify({ worker, origin, results: result.supported.results.map(({ filters: _filters, ...metadata }) => metadata) }, null, 2));
  console.log('PASS: production-built worker loads packaged WASM, falls back at 384 kHz, then fits both targets with PEQdB at 48 kHz.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
