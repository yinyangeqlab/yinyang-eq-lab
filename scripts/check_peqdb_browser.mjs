import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium, webkit, devices } = await import(process.env.AUTOEQ_PLAYWRIGHT || 'playwright');
const engine = process.env.AUTOEQ_BROWSER || 'chromium', device = process.env.AUTOEQ_DEVICE;
assert.ok(['chromium', 'webkit'].includes(engine)); assert.ok(!device || devices[device], 'Use a known Playwright device');
const profile = device ? devices[device] : {};
const out = process.env.AUTOEQ_REVIEW_DIR || 'artifacts/peqdb-autoeq/review'; await mkdir(out, { recursive: true });
const browser = engine === 'webkit'
  ? await webkit.launch({ ...(process.env.AUTOEQ_WEBKIT_EXECUTABLE ? { executablePath: process.env.AUTOEQ_WEBKIT_EXECUTABLE } : {}), headless: true })
  : await chromium.launch({ executablePath: '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const rate = 48000, frames = rate * 8, wav = Buffer.alloc(44 + frames * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(frames * 4, 40);
for (let i = 0; i < frames; i++) for (let c = 0; c < 2; c++) wav.writeInt16LE(Math.round(2000 * Math.sin(i * 2 * Math.PI * 440 / rate)), 44 + i * 4 + c * 2);
const press = locator => device ? locator.tap({ position: { x: 10, y: 10 }, timeout: 10000 }) : locator.click();
async function screenshot(page, name) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  return page.screenshot({ path: `${out}/${name}.png`, scale: 'css', fullPage: height < 30000 });
}
const reports = [];
let activePage;
const audioChecks = engine === 'webkit' || process.env.AUTOEQ_AUDIO_CHECKS === '1';
async function instrumentAudio(context) {
  if (!audioChecks) return;
  await context.addInitScript(() => {
    window.reviewAudioContexts = []; window.reviewOutputGains = [];
    let gesture = false;
    document.addEventListener('click', event => { if (event.isTrusted) { gesture = true; setTimeout(() => { gesture = false; }, 0); } }, true);
    const played = new WeakSet(), originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!played.has(this) && !gesture) return Promise.reject(new DOMException('First media play must be in the tap.', 'NotAllowedError'));
      played.add(this); return originalPlay.call(this);
    };
    // Explicitly model iOS's element-volume restriction, rather than trusting a UA string.
    Object.defineProperty(HTMLMediaElement.prototype, 'volume', { configurable: true, get() { return 1; }, set() {} });
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor(...args) { super(...args); window.reviewAudioContexts.push(this); }
      resume() { return Promise.all([super.resume(), new Promise(resolve => setTimeout(resolve, 40))]).then(() => undefined); }
      createGain() {
        const node = super.createGain(), connect = node.connect;
        node.connect = function (destination, ...args) { if (destination === node.context.destination) window.reviewOutputGains.push(node); return connect.call(node, destination, ...args); };
        return node;
      }
    };
  });
}
async function volumeCheck(page, slider) {
  for (const level of [.37, 0, .37]) {
  await slider.evaluate((input, level) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(level));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, level);
  await page.waitForFunction(level => window.reviewOutputGains.some(node => node.context.state === 'running' && Math.abs(node.gain.value - level) < .002), level);
  }
  assert.ok(await page.locator('audio').first().evaluate(audio => audio.volume === 1), 'Test keeps element volume read-only');
}
async function interrupt(page, audio) {
  await page.evaluate(() => Promise.allSettled(window.reviewAudioContexts.filter(context => context.state === 'running').map(context => context.suspend())));
  await audio.waitFor({ state: 'attached' });
  assert.ok(await audio.evaluate(element => element.paused), 'Audio interruption must stop the media clock');
}
try {
  for (const mode of (process.env.AUTOEQ_APP_ONLY ? [] : process.env.AUTOEQ_MODES ? process.env.AUTOEQ_MODES.split(',') : ['peqdb', 'wasm-blocked', 'worker-blocked'])) {
    const context = await browser.newContext({ viewport: { width: 1360, height: 1000 }, ...profile });
    await instrumentAudio(context);
    await context.addInitScript(mode => {
      window.eqNodeCount = 0;
      const Original = window.AudioContext;
      window.AudioContext = class extends Original { createIIRFilter(b, a) { window.eqNodeCount++; return super.createIIRFilter(b, a); } };
      if (mode === 'worker-blocked') window.Worker = class { constructor() { throw Error('Synthetic Worker restriction'); } };
    }, mode);
    let release;
    const delay = new Promise(resolve => { release = resolve; });
    await context.route('**/vendor/peqdb-autoeq/*.wasm', async route => {
      if (mode === 'wasm-blocked') return route.abort();
      if (mode === 'peqdb') await delay;
      await route.continue().catch(() => {});
    });
    const mutations = [];
    await context.route('**/api/**', route => {
      if (route.request().method() !== 'GET') mutations.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(route.request().url().includes('music-votes') ? { byTrack: {}, mine: {}, totals: { keep: 0, pass: 0 }, signedIn: false } : []) });
    });
    const page = await context.newPage(), errors = []; activePage = page;
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5199/integration.html');
    await page.getByLabel('Review music').setInputFiles({ name: 'synthetic-review.wav', mimeType: 'audio/wav', buffer: wav });
    await page.waitForFunction(() => { const audio = document.querySelector('audio'); return audio?.src.startsWith('blob:') && audio.readyState >= 1; }, undefined, { timeout: 15000 });
    if (mode === 'peqdb') {
      await page.evaluate(() => {
        window.reviewButtonClicks = [];
        document.addEventListener('click', event => window.reviewButtonClicks.push(event.target.closest('button')?.textContent));
      });
      // Observe the handlers, not the automation's post-click wait, before releasing I/O.
      const actions = [];
      try {
        actions.push(press(page.getByRole('button', { name: 'Start A', exact: true })));
        await page.waitForFunction(() => window.reviewButtonClicks.includes('Start A'), undefined, { timeout: 5000 });
        actions.push(press(page.getByRole('button', { name: 'Stop review', exact: true })));
        await page.waitForFunction(() => window.reviewButtonClicks.includes('Stop review'), undefined, { timeout: 5000 });
      } finally { release(); await Promise.all(actions); }
    }
    let fits;
    for (let i = 0; i < 100; i++) {
      await page.getByRole('button', { name: 'Inspect applied EQ', exact: true }).click();
      const text = await page.getByLabel('Applied EQ').textContent();
      fits = text ? JSON.parse(text).eqFits : null;
      if (fits?.length === 2) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(fits?.length, 2, mode + ': both fits should prepare');
    assert.ok(fits.every(f => f.engine === (mode === 'peqdb' ? 'peqdb' : 'legacy')), 'No mixed engines within a pair');
    assert.ok(await page.locator('audio').evaluate(audio => audio.paused), 'Fitting completion must not start audio after Stop');
    await press(page.getByRole('button', { name: 'Start A', exact: true }));
    await page.waitForFunction(() => { const audio = document.querySelector('audio'); return audio && !audio.paused && audio.currentTime > .1; }, undefined, { timeout: 15000 }).catch(async error => { await writeFile(`${out}/failure-${mode}.json`, JSON.stringify({ text: await page.locator('body').innerText(), errors, audio: await page.locator('audio').evaluate(a => ({ src: a.src, paused: a.paused, error: a.error?.message, readyState: a.readyState })) }, null, 2)); await screenshot(page, `failure-${mode}`); throw error; });
    assert.ok(await page.evaluate(() => window.eqNodeCount >= 20));
    if (audioChecks) {
      await page.getByRole('button', { name: 'Volume', exact: true }).click();
      await volumeCheck(page, page.getByRole('slider', { name: 'Volume', exact: true }));
      await interrupt(page, page.locator('audio'));
      await page.getByText('Audio was interrupted. Press Play to resume.', { exact: false }).waitFor();
      await press(page.getByRole('button', { name: 'Start A', exact: true }));
      await page.waitForFunction(() => !document.querySelector('audio').paused);
    }
    await press(page.getByRole('button', { name: 'Stop review', exact: true }));
    assert.ok(await page.locator('audio').evaluate(audio => audio.paused));
    assert.deepEqual(mutations, []);
    assert.deepEqual(errors, []);
    await screenshot(page, `player-${mode}`);
    reports.push({ mode, fits, iirNodeCount: await page.evaluate(() => window.eqNodeCount), mutations, errors });
    await context.close();
  }
  // Full application page: blank local D1 + disposable browser storage; no account or writes.
  const context = await browser.newContext({ viewport: { width: 1360, height: 1000 }, ...profile });
  await instrumentAudio(context);
  const fixture = JSON.parse(await readFile('artifacts/autoeq-lab/public/fixtures.json', 'utf8'))[0];
  await context.addInitScript(fixture => {
    window.appWorkerErrors = []; window.appWorkerArgs = []; window.appFits = []; const OriginalWorker = window.Worker; window.Worker = class extends OriginalWorker { constructor(...args) { window.appWorkerArgs.push(args.map(String)); try { super(...args); } catch(e) { window.appWorkerErrors.push(String(e)); throw e; } this.addEventListener('error', e => window.appWorkerErrors.push({ message: e.message, file: e.filename, line: e.lineno, stack: e.error?.stack })); this.addEventListener('message', event => { if (event.data.results) window.appFits.push(...event.data.results); }); } };
    localStorage.setItem('target-lab-measurements', JSON.stringify([{ id: 'layout-only', name: 'Local public measurement fixture', device: fixture.name, type: 'oe', rig: fixture.rig, origin: 'imported', points: fixture.points, createdAt: 0, fit: '', notes: '' }]));
    localStorage.setItem('target-lab-active-measurement', 'layout-only');
  }, fixture);
  const page = await context.newPage(), requests = [], appErrors = []; activePage = page;
  page.on('pageerror', e => appErrors.push(e.message)); page.on('console', m => { if (m.type() === 'error') appErrors.push(m.text()); });
  page.on('request', r => { if (r.url().includes('/vendor/peqdb-autoeq/')) requests.push(r.url()); });
  await context.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(route.request().url().includes('admin-session') ? { active: false } : route.request().url().includes('music-votes') ? { byTrack: {}, mine: {}, totals: { keep: 0, pass: 0 }, signedIn: false } : []) }));
  await context.route('**/api/listening-audio/**', route => {
    const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range || '');
    const start = range ? Number(range[1]) : 0, end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    return route.fulfill({ status: range ? 206 : 200, contentType: 'audio/wav', headers: { 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}) }, body: wav.subarray(start, end + 1) });
  });
  await page.goto('http://127.0.0.1:5200/preference-tuning');
  await page.getByRole('heading', { name: 'Play your music', exact: true }).waitFor({ timeout: 30000 });
  await page.waitForFunction(() => window.appFits?.some(f => f.engine === 'peqdb'), undefined, { timeout: 20000 }).catch(async error => { await writeFile(`${out}/app-failure.json`, JSON.stringify({ text: await page.locator('body').innerText(), fits: await page.evaluate(() => window.appFits), workerErrors: await page.evaluate(() => window.appWorkerErrors), workerArgs: await page.evaluate(() => window.appWorkerArgs), appErrors, requests }, null, 2)); throw error; });
  if (audioChecks) {
    await page.locator('input[type=file][accept^="audio/"]:not([multiple])').setInputFiles({ name: 'webkit-tuning.wav', mimeType: 'audio/wav', buffer: wav });
    await page.waitForFunction(() => document.querySelector('audio')?.readyState >= 1);
    await page.locator('audio').evaluate(audio => audio.dispatchEvent(new Event('play')));
    await page.getByText('Press Play music to initialize audio processing.', { exact: true }).waitFor();
    await press(page.getByRole('button', { name: 'Play music', exact: true }));
    await page.waitForFunction(() => !document.querySelector('audio').paused && document.querySelector('audio').currentTime > .1);
    await page.getByRole('button', { name: 'Show volume control', exact: true }).click();
    await volumeCheck(page, page.getByRole('slider', { name: 'Volume', exact: true }));
    await interrupt(page, page.locator('audio'));
    await page.getByText('Audio was interrupted. Press Play music to resume.', { exact: true }).waitFor();
    await press(page.getByRole('button', { name: 'Play music', exact: true }));
    await page.waitForFunction(() => !document.querySelector('audio').paused);
    await press(page.getByRole('button', { name: 'Pause music', exact: true }));
  }
  await screenshot(page, `tuning-desktop`);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth, undefined, { timeout: 2000 }).catch(() => {});
  await screenshot(page, `tuning-narrow`);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Tuning must not overflow the narrow viewport');
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.goto('http://127.0.0.1:5200/music-library');
  await page.waitForFunction(() => document.querySelector('#library-headphone')?.options.length > 1, undefined, { timeout: 15000 });
  await page.locator('summary').filter({ hasText: 'Listening EQ' }).click();
  await page.getByLabel('Choose a headphone measurement', { exact: true }).selectOption('layout-only', { timeout: 5000 }).catch(async error => { await writeFile(`${out}/library-failure.json`, JSON.stringify({ text: await page.locator('body').innerText(), measurements: await page.evaluate(() => localStorage.getItem('target-lab-measurements')), options: await page.locator('#library-headphone option').allTextContents(), appErrors }, null, 2)); throw error; });
  await page.getByRole('button', { name: 'Create EQ', exact: true }).click();
  await page.getByText('EQ ready', { exact: false }).waitFor({ timeout: 20000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('target-lab-library-eqs-v1') || '[]')[0]);
  assert.ok(saved.source.includes('PEQdB')); assert.equal(saved.filters[0].type, 'LSC'); assert.equal(saved.filters[1].type, 'HSC'); assert.equal(saved.filters.length, 15);
  if (audioChecks) {
    const player = page.locator('.library-player').first();
    await press(player.locator('.library-play'));
    await page.waitForFunction(() => { const audio = document.querySelector('.library-player audio'); return audio && !audio.paused && audio.currentTime > .1; });
    await volumeCheck(page, player.getByRole('slider', { name: /^Volume for / }));
    await interrupt(page, player.locator('audio'));
    await player.getByText('Audio was interrupted. Press Play to resume.', { exact: false }).waitFor();
    await press(player.locator('.library-play'));
    await page.waitForFunction(() => !document.querySelector('.library-player audio').paused);
    await press(player.locator('.library-play'));
  }
  await screenshot(page, `library-eq`);
  const nativeSelect = page.getByLabel('Choose a headphone measurement', { exact: true });
  await nativeSelect.focus(); await page.keyboard.press('Alt+ArrowDown'); await page.keyboard.press('Escape');
  const selectStyle = await nativeSelect.evaluate(el => ({ scheme: getComputedStyle(el).colorScheme, optionBackground: getComputedStyle(el.options[0]).backgroundColor, optionColor: getComputedStyle(el.options[0]).color, focus: getComputedStyle(el).outlineStyle }));
  assert.ok(selectStyle.optionBackground !== 'rgba(0, 0, 0, 0)', 'Native options need an explicit background');
  assert.notEqual(selectStyle.focus, 'none', 'Keyboard-focused native selects retain a visible focus outline');
  await page.setViewportSize({ width: 360, height: 800 });
  await nativeSelect.focus(); await page.keyboard.press('Alt+ArrowDown'); await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth, undefined, { timeout: 2000 }).catch(() => {});
  const narrow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, spills: [...document.querySelectorAll('body *')].filter(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible').map(el => ({ cls: String(el.className), tag: el.tagName, text: el.textContent?.slice(0, 90), scroll: el.scrollWidth, client: el.clientWidth, right: el.getBoundingClientRect().right })).slice(-35), overflow: [...document.querySelectorAll('body *')].map(el => ({ tag: el.tagName, class: String(el.className), text: el.textContent?.slice(0, 100), left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, scroll: el.scrollWidth, client: el.clientWidth, overflowX: getComputedStyle(el).overflowX, textRight: (() => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect().right; })() })).filter(el => el.right > innerWidth + 1 || el.left < -1 || el.textRight > innerWidth + 1 && el.overflowX === 'visible').slice(0, 30) }));
  if (narrow.scroll > narrow.width) { await writeFile(`${out}/library-overflow.json`, JSON.stringify(narrow, null, 2)); await screenshot(page, `library-overflow`); }
  assert.ok(narrow.scroll <= narrow.width, 'Listening Pool must not overflow the narrow viewport');
  await screenshot(page, `library-eq-narrow`);
  await page.locator('.library-eq').screenshot({ path: `${out}/library-eq-controls-narrow.png`, scale: 'css' });
  await page.setViewportSize({ width: 1360, height: 1000 });

  await page.goto('http://127.0.0.1:5200/software-licenses');
  await page.getByRole('heading', { name: 'PEQdB AutoEQ', exact: true }).waitFor();
  for (const name of ['LICENSE', 'COPYING', 'source.tar.gz']) { const response = await page.request.get(`http://127.0.0.1:5200/vendor/peqdb-autoeq/${name}`); assert.equal(response.status(), 200); }
  await screenshot(page, `licenses`);
  assert.deepEqual(appErrors, [], 'The complete app must report no unexpected browser errors');
  await context.close();
  await writeFile(`${out}/browser.json`, JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), engine, version: browser.version(), device, audioChecks, selectStyle, appErrors, reports, appRequests: requests }, null, 2));
  console.log(`PASS ${engine} ${device || 'desktop'}: ${reports.length} MusicPanel modes; Tuning/Library, responsive selects and source/licenses${audioChecks ? '; strict gesture, volume/mute and interruption/restart audio checks' : ''}.`);
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await writeFile(`${out}/failure.json`, JSON.stringify({ message: String(error), url: activePage.url(), text: (await activePage.locator('body').innerText()).slice(0, 18000), audio: await activePage.locator('audio').evaluateAll(elements => elements.slice(0, 3).map(audio => ({ src: audio.src, paused: audio.paused, ready: audio.readyState, time: audio.currentTime, duration: audio.duration, error: audio.error?.message }))), contexts: await activePage.evaluate(() => window.reviewAudioContexts?.map(context => ({ state: context.state, time: context.currentTime, rate: context.sampleRate }))) }, null, 2));
    await screenshot(activePage, 'failure').catch(() => {});
  }
  throw error;
} finally { await browser.close(); }
