import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as presetLimits from '../../../site/lib/peq-preset.ts';
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flat = name => ({ name, channels: [{ preampDb: 0, filters: [] }, { preampDb: 0, filters: [] }] });
const compile = path => ts.transpileModule(readFileSync(new URL('../../../' + path, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const baseGlobals = { Error, URL, URLSearchParams, Blob, AbortController, structuredClone, crypto, console };
function load(path, require, globals = {}) { const mod = { exports: {} }; vm.runInNewContext(compile(path), { ...baseGlobals, ...globals, require, module: mod, exports: mod.exports }); return mod.exports; }
const model = load('site/lib/blind-eq.ts', id => {
  if (id === './peq-preset') return presetLimits;
  throw Error(id);
});
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
function all(node, predicate, found = []) { if (node && typeof node === 'object') { if (!Array.isArray(node) && predicate(node)) found.push(node); for (const child of Array.isArray(node) ? node : [node.props?.children]) all(child, predicate, found); } return found; }
function mount(path, imports, globals, props) {
  const hooks = [], pending = [], focus = []; let cursor = 0, active = true, lateUpdates = 0, tree;
  const React = {
    useState(initial) { const i = cursor++; if (!hooks[i]) hooks[i] = { value: typeof initial === 'function' ? initial() : initial }; return [hooks[i].value, next => { if (!active) lateUpdates++; hooks[i].value = typeof next === 'function' ? next(hooks[i].value) : next; }]; },
    useRef(initial) { const i = cursor++; if (!hooks[i]) hooks[i] = { current: initial }; return hooks[i]; },
    useMemo(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((d, j) => !Object.is(d, hooks[i].deps[j]))) hooks[i] = { value: fn(), deps }; return hooks[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((d, j) => !Object.is(d, hooks[i].deps[j]))) { const previous = hooks[i]?.cleanup; hooks[i] = { deps }; pending.push(() => { previous?.(); hooks[i].cleanup = fn(); }); } },
  };
  const jsx = (type, props) => { const element = { type, props }; if (typeof type === 'string' && props?.ref) props.ref.current = { focus() { focus.push(text(element)); } }; return element; };
  const Component = load(path, id => id === 'react' ? React : id === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' } : id in imports ? imports[id] : (() => { throw Error('Unexpected dependency ' + id); })(), globals).default;
  const render = () => { cursor = 0; tree = Component(props); while (pending.length) pending.shift()(); return tree; };
  render();
  return { render, focus, get tree() { return tree; }, get lateUpdates() { return lateUpdates; }, find(predicate) { const values = all(tree, predicate); assert.equal(values.length, 1, 'Expected one matching rendered element'); return values[0]; }, button(name) { return this.find(n => n.type === 'button' && text(n) === name); }, unmount() { active = false; for (const h of hooks) h?.cleanup?.(); } };
}
// The quick comparison uses the same decoded source for both sides, preserves its
// position and channel correction, and ignores superseded playback requests.
{
  const samples = new Float32Array(48000).fill(.15);
  const buffer = { duration: 1, length: samples.length, sampleRate: 48000, numberOfChannels: 1, getChannelData: () => samples };
  const measured = [], applied = [], starts = [], switches = [], loaded = [], pending = deferred();
  const eqs = [flat('A'), flat('B')], correction = { channelMatchMode: 'custom' };
  class Player {
    context = { sampleRate: 48000, decodeAudioData: () => pending.promise };
    playing = false; time = 0;
    resume() {}
    playTrack(...args) { this.playing = true; starts.push(args); }
    pause() { this.playing = false; }
    switch(side) { switches.push(side); }
    close() { this.pause(); }
  }
  const { ComparisonAudio } = load('site/app/eq-compare/audio.ts', id => {
    if (id === '@/lib/blind-eq') return model;
    if (id === '@/lib/blind-eq-audio') return { BlindEqPlayer: Player };
    if (id === './levels') return {
      measureComparison: async (...args) => { measured.push(args); return [{peak:.2,loudness:-20},{peak:.3,loudness:-18}]; },
      comparisonLevels: (_measured, target) => { applied.push(target); return { gains:[.7,.8], headroomDb:0 }; }
    };
    throw Error(id);
  }, { window: { dispatchEvent() {} }, document: { hidden: false }, Event });
  const audio = new ComparisonAudio({ file: new Blob(['tone']) }, (...args) => loaded.push(args));
  const a = audio.play(0, eqs, correction, -14), b = audio.play(1, eqs, correction, -14);
  pending.resolve(buffer);
  await Promise.all([a,b]);
  check(starts.length === 1 && audio.side === 1, 'Latest side wins while decoding');
  check(measured.length === 1 && measured[0][2] === correction && starts[0][5] === correction, 'Identical headphone correction reaches level matching and playback');
  check(starts[0][0] === buffer && starts[0][1] === eqs, 'Both EQs share the decoded recording');
  check(loaded.length === 1 && loaded[0][1].waveform.maxL[0] === samples[0] && loaded[0][1].waveform.maxR[0] === samples[0], 'Mono waveform represents both routed channels');
  audio.player.time = .64;
  await audio.play(0, eqs, correction, -14);
  check(switches[0] === 0 && starts.length === 1 && audio.player.time === .64, 'Switching EQs preserves the playhead');
  await audio.play(0, eqs, correction, -14);
  check(audio.side === null, 'Pressing the playing side pauses');
  audio.invalidate(); await audio.play(1, eqs, undefined, "off");
  check(measured.length === 2 && applied.at(-1) === "off" && measured[1][2] === undefined, 'Settings invalidate old gains and correction');
  audio.close();
}
{
  const { comparisonLevels } = load('site/app/eq-compare/levels.ts', () => ({}));
  for (const peak of [.1, .95]) {
    const meters = [{ loudness: -22, peak }, { loudness: -18, peak: peak / 2 }];
    const results = [-14, -16, -18].map(target => comparisonLevels(meters, target));
    for (const [index, result] of results.entries()) {
      const output = meters.map((side, i) => side.loudness + 20 * Math.log10(result.gains[i]));
      check(Math.abs(output[0]-output[1]) < 1e-9, 'Both filtered outputs share the same loudness');
      check(Math.abs(output[0] - (-14 - 2*index + result.headroomDb)) < 1e-9, 'Quieter targets are 2 and 4 dB lower with common headroom');
      check(meters.every((side,i)=>side.peak*result.gains[i] <= 10**(-3/20) + 1e-10), 'Peak headroom is preserved for both sides');
    }
    const off = comparisonLevels(meters, 'off');
    check(off.gains[0] === off.gains[1], 'Off preserves relative preset levels');
  }
}
function listenerFixture(options = {}) {
  const intervals = new Set(), events = new Map(), requests = [], evidence = [], volumes = [], players = [], renders = [];
  const decoded = { duration: 30, length: 1_440_000, numberOfChannels: 2 };
  const document = { visibilityState: 'visible', addEventListener(n, fn) { events.set(n, fn); }, removeEventListener(n) { events.delete(n); } };
  const window = { setInterval(fn) { intervals.add(fn); return fn; }, clearInterval(fn) { intervals.delete(fn); } };
  class Player {
    playing = false; elapsed = 0; time = 0; playCalls = 0; closed = false; volume = .25; nextResume = options.resume;
    context = { decodeAudioData: async () => { this.decodeCalls = (this.decodeCalls || 0) + 1; return options.decode ? await options.decode.promise : decoded; } };
    constructor() { players.push(this); } setVolume(v) { this.volume = v; } resume() { const value = this.nextResume; this.nextResume = null; return value?.promise || Promise.resolve(); }
    play() { assert.ok(!this.closed); this.playCalls++; this.playing = true; } switch() {} pause() { this.playing = false; } restart() { this.pause(); this.time = 0; } async close() { this.closed = true; this.pause(); }
  }
  async function prepare(buffer, presets, at, seconds, match, signal) { renders.push({ at, signal }); if (options.silent && at === 9) throw Error('This passage is silent or too quiet to compare. Choose another passage.'); return { buffers: [], seconds }; }
  const fetch = async (url, config) => { requests.push(config); if (options.fetch) return await options.fetch.promise; return { ok: !options.maintenance, status: options.maintenance ? 503 : 200, headers: { get: n => options.maintenance && n === 'X-YinYang-Service' ? 'owner-only-maintenance' : null }, arrayBuffer: async () => new ArrayBuffer(10) }; };
  const h = mount('site/components/blind-eq-listener.tsx', { '@/lib/blind-eq-audio': { BlindEqPlayer: Player, prepareComparison: prepare } }, { document, window, fetch }, { song: options.song || { id: 'synthetic', title: 'Synthetic', artist: 'Fixture', url: '/tone.wav' }, presets: [flat('one'), flat('two')], match: true, sourceCache:options.sourceCache, initialVolume: .07, onVolumeChange: v => volumes.push(v), onEvidence: value => evidence.push(value) });
  return Object.assign(h, { players, requests, evidence, volumes, renders, async prepare() { h.button('Get this song ready').props.onClick(); await flush(); h.render(); }, hide() { document.visibilityState = 'hidden'; events.get('visibilitychange')?.(); }, show() { document.visibilityState = 'visible'; }, tick(seconds = .2) { players[0].elapsed += seconds; for (const fn of intervals) fn(); h.render(); } });
}
{
  const h = listenerFixture({ silent: true }); await h.prepare();
  check(text(h.tree).includes('silent or too quiet') && all(h.tree, n => n.type === 'input' && n.props['aria-label'] === 'Section start').length === 1, 'A silent initial passage keeps the passage selector available');
  h.find(n => n.type === 'input' && n.props['aria-label'] === 'Section start').props.onChange({ target: { value: '0' } }); h.render(); h.button('Prepare this section').props.onClick(); await flush(); h.render();
  check(all(h.tree, n => n.type === 'button' && text(n) === 'Play A').length === 1 && h.renders.at(-1).at === 0, 'A non-silent passage can be prepared without skipping or discarding the session');
  check(h.players[0].volume === .07, 'The saved volume is applied before this song can play');
  h.button('Play A').props.onClick(); await flush(); h.render(); h.tick(); const heard = h.evidence.at(-1).heard[0];
  h.find(n => n.type === 'input' && n.props['aria-label'] === 'Listening volume').props.onChange({ target: { value: '0' } }); h.tick();
  check(h.evidence.at(-1).heard[0] === heard && h.volumes.at(-1) === 0, 'Muting earns no listening time and reports the new session volume');
  h.hide(); h.tick(); check(!h.players[0].playing && h.evidence.at(-1).heard[0] === heard, 'Hidden tabs pause and earn no listening time'); h.unmount();
}
for (const stage of ['resume', 'fetch', 'file', 'decode']) {
  const pending = deferred(); let bytesRead = 0;
  const options = stage === 'file' ? { song: { id: 'file', title: 'File', artist: 'Fixture', file: { size: 10, arrayBuffer: () => pending.promise } } } : { [stage]: pending };
  const h = listenerFixture(options); h.button('Get this song ready').props.onClick(); await flush(); h.unmount();
  if (stage === 'fetch') { check(h.requests[0].signal.aborted, 'Unmount actively aborts the outstanding recording fetch'); pending.resolve({ ok: true, headers: { get() {} }, arrayBuffer: async () => { bytesRead++; return new ArrayBuffer(10); } }); }
  else if (stage === 'file') pending.resolve(new ArrayBuffer(10)); else if (stage === 'decode') pending.resolve({ duration: 30, length: 1_440_000, numberOfChannels: 2 }); else pending.resolve();
  await flush(); check(h.renders.length === 0 && h.lateUpdates === 0 && h.players[0].closed, `No rendering/state updates survive unmount during ${stage}`);
  if (stage === 'resume') check(h.requests.length === 0, 'A late AudioContext resume cannot start a fetch after skip/unmount');
  if (stage === 'fetch') check(bytesRead === 0, 'A stale fetch response is not read or decoded after unmount');
}
for (const action of ['hide', 'unmount', 'change-passage']) {
  const h = listenerFixture(); await h.prepare(); const pending = deferred(); h.players[0].nextResume = pending; h.button('Play A').props.onClick();
  if (action === 'hide') h.hide();
  if (action === 'unmount') h.unmount();
  if (action === 'change-passage') { h.find(n => n.type === 'input' && n.props['aria-label'] === 'Section start').props.onChange({ target: { value: '0' } }); h.render(); h.button('Use this section').props.onClick(); await flush(); h.render(); }
  pending.resolve(); await flush(); check(h.players[0].playCalls === 0 && h.lateUpdates === 0, 'Pending playback cannot start after ' + action); if (action !== 'unmount') h.unmount();
}
{
  const h = listenerFixture({ maintenance: true }); await h.prepare();
  const link = h.find(n => n.type === 'a' && n.props.href === '/admin-login');
  check(link.props.target === '_blank' && link.props.rel.includes('noopener') && text(h.tree).includes('without losing your session'), 'Expired maintenance access has a safe new-tab admin sign-in recovery path'); h.unmount();
}
// Exercise cancellation in the real DSP renderer, including between the two EQs.
{
  let instances = 0; const firstRender = deferred();
  class Buffer { constructor({ numberOfChannels, length, sampleRate }) { this.numberOfChannels = numberOfChannels; this.length = length; this.sampleRate = sampleRate; this.duration = length / sampleRate; this.data = Array.from({ length: numberOfChannels }, () => new Float32Array(length).fill(.1)); } getChannelData(c) { return this.data[c]; } copyToChannel(values, c) { this.data[c].set(values); } }
  const node = () => ({ gain: {}, connect() {}, start() {} });
  class Offline { constructor(channels, length, rate) { instances++; this.destination = {}; this.output = new Buffer({ numberOfChannels: channels, length, sampleRate: rate }); } createBufferSource() { return node(); } createChannelSplitter() { return node(); } createChannelMerger() { return node(); } createGain() { return node(); } async startRendering() { await firstRender.promise; return this.output; } }
  const dsp = load('site/lib/blind-eq-audio.ts', id => id === './blind-eq' ? model : id === './channel-balance' ? {channelBalance:()=>null} : (() => { throw Error(id); })(), { AudioBuffer: Buffer, OfflineAudioContext: Offline });
  const buffer = new Buffer({ numberOfChannels: 2, length: 48_000 * 6, sampleRate: 48_000 }), controller = new AbortController();
  const render = dsp.prepareComparison(buffer, [flat('one'), flat('two')], 0, 5, true, controller.signal); controller.abort(); firstRender.resolve();
  await assert.rejects(render, /cancelled/); check(instances === 1, 'Cancellation after the first offline render prevents rendering the second preset');
  await assert.rejects(dsp.prepareComparison(buffer, [flat('one'), flat('two')], 0, 5, true, controller.signal), /cancelled/); check(instances === 1, 'An already-cancelled preparation creates no new audio context');
}
console.log(`PASS ${checks} quick comparison and generated EQ listener checks.`);
