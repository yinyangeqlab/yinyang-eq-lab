import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.AUTOEQ_PLAYWRIGHT || 'playwright');
const url = process.env.AUTOEQ_LAB_URL || 'http://127.0.0.1:5199';
const out = fileURLToPath(new URL(process.env.AUTOEQ_CPU_THROTTLE ? `../../artifacts/autoeq-lab/review-cpu${process.env.AUTOEQ_CPU_THROTTLE}` : '../../artifacts/autoeq-lab/review', import.meta.url));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.AUTOEQ_CHROME || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1360, height: 1000 }, acceptDownloads: true });
await context.addInitScript(() => {
  window.labActiveWorkers = 0;
  const OriginalWorker = window.Worker;
  window.Worker = class extends OriginalWorker {
    constructor(...args) { super(...args); this.labTerminated = false; window.labActiveWorkers++; }
    terminate() { if (!this.labTerminated) { this.labTerminated = true; window.labActiveWorkers--; } return super.terminate(); }
  };
});
const page = await context.newPage();
if (process.env.AUTOEQ_CPU_THROTTLE) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.AUTOEQ_CPU_THROTTLE) });
}
const errors = [], requests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => requests.push(request.url()));
try {
  await page.goto(url);
  await page.getByRole('button', { name: 'Compare selected', exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('select[aria-label="Headphone measurement"]')?.options.length === 6);
  assert.equal(requests.filter(u => /engine\/autoeq/.test(u)).length, 0, 'Engine must remain unloaded before calculation');
  const samples = [];
  for (const rate of process.env.AUTOEQ_CPU_THROTTLE ? [48000] : [48000, 44100, 96000]) {
    await page.getByLabel('Playback sample rate').selectOption(String(rate));
    await page.evaluate(() => {
      window.labTicks = []; window.labLastTick = performance.now(); window.labLongTasks = [];
      window.labTimer = setInterval(() => { const now = performance.now(); window.labTicks.push(now - window.labLastTick); window.labLastTick = now; }, 16);
      window.labObserver = new PerformanceObserver(list => window.labLongTasks.push(...list.getEntries().map(e => e.duration)));
      window.labObserver.observe({ type: 'longtask', buffered: false });
    });
    const start = Date.now();
    await page.getByRole('button', { name: 'Benchmark all six' }).click();
    await page.getByText('Finished 6 measurements', { exact: false }).waitFor({ timeout: 60000 });
    const responsiveness = await page.evaluate(() => {
      clearInterval(window.labTimer); window.labObserver.disconnect();
      return { tickCount: window.labTicks.length, maxTickMs: Math.max(...window.labTicks), longTasks: window.labLongTasks };
    });
    const waiting = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download benchmark', exact: true }).click();
    const download = await waiting;
    const dest = `${out}/measurements-${rate}.json`; await download.saveAs(dest);
    const { readFile } = await import('node:fs/promises');
    const data = JSON.parse(await readFile(dest, 'utf8'));
    assert.equal(data.results.length, 6);
    for (const result of data.results) {
      assert.equal(result.fits.length, 4);
      for (const fit of result.fits) {
        assert.ok(Number.isFinite(fit.rms8k) && Number.isFinite(fit.rms16k));
        assert.ok(fit.preamp <= -1);
        assert.ok(fit.filters.length <= 10);
        assert.ok(fit.filters.every(f => [f.hz, f.gain, f.q].every(Number.isFinite)));
      }
    }
    samples.push({ rate, batchMs: Date.now() - start, responsiveness, results: data.results.map(r => ({ name: r.fixture.name, memoryBytes: r.wasmMemory, totalMs: r.totalMs, fits: r.fits.map(f => ({ label: f.label, rms8k: f.rms8k, rms16k: f.rms16k, fitMs: f.fitMs })) })) });
  }
  // Actual audio rendering and A/B switching with a synthetic local WAV; no server records.
  const rate = 48000, frames = rate * 6, wav = Buffer.alloc(44 + frames * 4);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(frames * 4, 40);
  for (let i = 0; i < frames; i++) for (let c = 0; c < 2; c++) wav.writeInt16LE(Math.round(2500 * (Math.sin(i * 2 * Math.PI * 220 / rate) + .3 * Math.sin(i * 2 * Math.PI * 2300 / rate))), 44 + i * 4 + c * 2);
  await page.getByLabel('Local music', { exact: true }).setInputFiles({ name: 'synthetic-local-test.wav', mimeType: 'audio/wav', buffer: wav });
  await page.getByRole('button', { name: 'Prepare and play', exact: true }).click();
  await page.getByRole('button', { name: 'Listen B', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Listen B', exact: true }).click({ timeout: 15000 });
  assert.equal(await page.getByRole('button', { name: 'Listen B', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Reveal engines', exact: true }).click();
  await page.getByText('A: ', { exact: false }).last().waitFor();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.screenshot({ path: `${out}/desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page-wide horizontal overflow');
  const select = page.getByLabel('Playback sample rate');
  await select.focus(); await page.keyboard.press('Alt+ArrowDown');
  await page.screenshot({ path: `${out}/narrow-expanded-select.png`, fullPage: true });
  await page.keyboard.press('Escape');
  const styles = await select.evaluate(el => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor, scheme: getComputedStyle(el).colorScheme, optionBackground: getComputedStyle(el.options[0]).backgroundColor, outline: getComputedStyle(el).outlineStyle }));
  assert.equal(styles.scheme, 'dark'); assert.equal(styles.optionBackground, 'rgb(29, 43, 57)'); assert.equal(styles.outline, 'solid');
  await page.screenshot({ path: `${out}/narrow.png`, fullPage: true });
  if (!process.env.AUTOEQ_CPU_THROTTLE) {
    await page.waitForFunction(() => window.labActiveWorkers === 0, { timeout: 35000 });
    await page.getByRole('button', { name: 'Compare selected', exact: true }).click();
    await page.getByText('Finished 1 measurement', { exact: false }).waitFor({ timeout: 20000 });
    assert.equal(await page.evaluate(() => window.labActiveWorkers), 1, 'Engine should reload after idle disposal');
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/browser-summary.json`, JSON.stringify({ samples, styles, errors, requests, idleDisposalAndReload: !process.env.AUTOEQ_CPU_THROTTLE }, null, 2));
  console.log(JSON.stringify(samples.map(s => ({ rate: s.rate, batchMs: s.batchMs, maxMainThreadTickMs: s.responsiveness.maxTickMs, longTasks: s.responsiveness.longTasks, rms8k: s.results.map(r => ({ name: r.name, current: r.fits[0].rms8k, peqdb: r.fits[2].rms8k, adaptive: r.fits[3].rms8k, wasmMs: r.fits[2].fitMs, memoryMiB: r.memoryBytes / 1048576 })) })), null, 2));
} finally { await browser.close(); }
