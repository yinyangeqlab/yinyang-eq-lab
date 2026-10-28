import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flat = name => ({ name, channels: [{ preampDb: 0, filters: [] }, { preampDb: 0, filters: [] }] });
const compile = path => ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const baseGlobals = { Error, URL, Blob, AbortController, structuredClone, crypto, console };
function load(path, require, globals = {}) { const mod = { exports: {} }; vm.runInNewContext(compile(path), { ...baseGlobals, ...globals, require, module: mod, exports: mod.exports }); return mod.exports; }
const search = load('lib/search.ts', id => { throw Error(id); });
const model = load('lib/blind-eq.ts', id => { throw Error(id); });
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
function pageFixture(sampleRate = 48000) {
  const listeners = new Map(); let blob, failDownload = false, clicks = 0;
  function Editor() {} function Listener() {}
  const window = { addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); }, removeEventListener(name, fn) { listeners.get(name)?.delete(fn); }, setTimeout() {} };
  const document = { body: { appendChild() {} }, createElement() { return { click() { clicks++; }, remove() {} }; } };
  const URL = { createObjectURL(value) { if (failDownload) throw Error('Downloads unavailable'); blob = value; return 'blob:fixture'; }, revokeObjectURL() {} };
  const pool = Array.from({ length: 35 }, (_, i) => ({ title: 'Synthetic ' + i, artist: 'Fixture', fileUrl: '/tone.wav' }));
  const h = mount('app/eq-compare/page.tsx', { '@/components/blind-eq-editor': { default: Editor }, '@/components/blind-eq-listener': { default: Listener }, '@/lib/search': search, '@/lib/release-info': { bugReportUrl: 'https://example.test/issues' }, '@/lib/blind-eq': model, '@/lib/music-catalog': { listeningPool: pool }, './style.css': {} }, { window, document, URL, AudioContext: class { sampleRate = sampleRate; state = "suspended"; async close() { this.state = "closed"; } } }, {});
  return Object.assign(h, { listeners, Editor, Listener, getBlob: () => blob, failDownload: () => { failDownload = true; }, clicks: () => clicks,
    apply() { all(h.tree, n => n.type === Editor).forEach(n => n.props.onChange(flat('Same preset name'))); h.render(); },
    songs() { return all(h.tree, n => n.type === 'label' && n.props.className === 'eq-song').map(n => all(n, child => child.type === 'input')[0]); },
    add(files) { h.find(n => n.type === 'input' && n.props.type === 'file' && n.props.multiple).props.onChange({ target: { files, value: 'fixture' } }); h.render(); },
    listener() { return h.find(n => n.type === Listener); },
  });
}
{
  const h = pageFixture(); h.apply(); check(text(h.tree).includes('identical filter and preamp settings'), 'Identical presets are explicitly disclosed in setup');
  for (let i = 0; i < 30; i++) { h.songs()[i].props.onChange(); h.render(); }
  h.add([{ name: 'Extra.wav', size: 10 }]);
  check(h.songs().filter(n => n.props.checked).length === 30, 'Local upload cannot exceed 30 selected pool/local songs');
  check(text(h.tree).includes('only 30 songs can be selected'), 'Mixed-playlist limit has actionable feedback');
  h.find(n => n.type === 'button' && n.props['aria-label'] === 'Remove local file Extra').props.onClick(); h.render();
  check(!text(h.tree).includes('Remove local file Extra'), 'Local files can be removed without resetting presets');
  h.button('Clear selection').props.onClick(); h.render();
  h.add(Array.from({ length: 30 }, (_, i) => ({ name: `Local ${i}.wav`, size: 10 })));
  h.find(n => n.type === 'button' && n.props['aria-label'] === 'Remove local file Local 0').props.onClick(); h.render();
  h.add([{ name: 'Replacement.wav', size: 10 }]);
  check(h.songs().filter(n => n.props.checked).length === 30 && all(h.tree, n => n.props?.['aria-label'] === 'Remove local file Replacement').length === 1, 'Removing a file releases both a local-file slot and selection slot'); h.unmount();
}
{
  const h = pageFixture(); h.apply(); for (let i = 0; i < 3; i++) { h.songs()[i].props.onChange(); h.render(); }
  h.button('Hide presets & start').props.onClick(); h.render();
  check(h.listeners.get('beforeunload').size === 1, 'Active private session is protected on navigation');
  h.listener().props.onVolumeChange(.07); h.render();
  h.listener().props.onEvidence({ heard: [5, 5], start: 4, seconds: 15 }); h.render();
  const firstVote = h.button('Prefer A'); firstVote.props.onClick(); firstVote.props.onClick(); h.render();
  check(text(h.tree).includes('Song 2 of 3'), 'Double-click cannot record two songs using the old evidence');
  check(h.listener().props.initialVolume === .07, 'Comfortable listening volume persists on the next song');
  check(h.button('Prefer A').props.disabled, 'The next song starts with its own voting lock');
  let restoredFocus = false; const opener = { focus() { restoredFocus = true; } };
  h.button('Finish & reveal').props.onClick({ currentTarget: opener }); h.render();
  check(h.focus.at(-1) === 'End this session now?', 'Early-reveal confirmation receives keyboard focus');
  h.find(n => n.type === 'section' && n.props['aria-label'] === 'Confirm early reveal').props.onKeyDown({ key: 'Escape', preventDefault() {} }); h.render();
  check(restoredFocus && !text(h.tree).includes('End this session now?'), 'Escape cancels confirmation and restores the invoking control');
  h.button('Finish & reveal').props.onClick({ currentTarget: opener }); h.render(); h.button('End & reveal presets').props.onClick(); h.render();
  check(/A · Preset [12] · Same preset name/.test(text(h.tree)), 'Duplicate preset names remain distinguishable in per-song results');
  h.button('Download private results').props.onClick(); h.render(); const result = JSON.parse(await h.getBlob().text());
  check(result.playlist.length === 3 && result.unanswered === 2 && result.rounds[0].sourceId === result.playlist[0].id, 'Early-reveal JSON preserves the complete ordered playlist and unanswered count');
  check(result.revealedAt && h.clicks() === 1, 'Download contains the original reveal timestamp and triggers one browser download');
  check(h.listeners.get('beforeunload').size === 1 && text(h.tree).includes('Check that the file saved'), 'Requesting a download cannot silently disable the leave-page protection');
  h.failDownload(); h.button('Download private results').props.onClick(); h.render();
  check(text(h.tree).includes('Your results are still in this tab') && text(h.tree).includes('The reveal'), 'Download failure gives feedback and preserves results');
  h.button('New blind session').props.onClick({ currentTarget: opener }); h.render(); check(h.focus.at(-1) === 'Clear this session?', 'Clear-session confirmation receives focus');
  h.button('Clear session').props.onClick(); h.render(); check(h.listeners.get('beforeunload').size === 0 && all(h.tree, n => n.type === h.Editor).every(n => n.props.initialPreset), 'Explicit clearing removes the leave guard but restores applied presets');
  all(h.tree, n => n.type === h.Editor).forEach((n, i) => n.props.onChange(flat(`Preset ${i + 1}`))); h.render();
  h.button('Hide presets & start').props.onClick(); h.render(); h.listener().props.onEvidence({ heard: [5, 5], start: 0, seconds: 15 }); h.render(); h.button('Prefer A').props.onClick(); h.render();
  h.button('Finish & reveal').props.onClick({ currentTarget: opener }); h.render(); h.button('End & reveal presets').props.onClick(); h.render();
  check(!/Preset ([12]) · Preset \1/.test(text(h.tree)), 'Default preset names are not repeated in the revealed choice labels'); h.unmount();
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
  const h = mount('components/blind-eq-listener.tsx', { '@/lib/blind-eq-audio': { BlindEqPlayer: Player, prepareComparison: prepare } }, { document, window, fetch }, { song: options.song || { id: 'synthetic', title: 'Synthetic', artist: 'Fixture', url: '/tone.wav' }, presets: [flat('one'), flat('two')], match: true, initialVolume: .07, onVolumeChange: v => volumes.push(v), onEvidence: value => evidence.push(value) });
  return Object.assign(h, { players, requests, evidence, volumes, renders, async prepare() { h.button('Prepare this song').props.onClick(); await flush(); h.render(); }, hide() { document.visibilityState = 'hidden'; events.get('visibilitychange')?.(); }, show() { document.visibilityState = 'visible'; }, tick(seconds = .2) { players[0].elapsed += seconds; for (const fn of intervals) fn(); h.render(); } });
}
{
  const h = listenerFixture({ silent: true }); await h.prepare();
  check(text(h.tree).includes('silent or too quiet') && all(h.tree, n => n.type === 'input' && n.props['aria-label'] === 'Passage start').length === 1, 'A silent initial passage keeps the passage selector available');
  h.find(n => n.type === 'input' && n.props['aria-label'] === 'Passage start').props.onChange({ target: { value: '0' } }); h.render(); h.button('Prepare this passage').props.onClick(); await flush(); h.render();
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
  const h = listenerFixture(options); h.button('Prepare this song').props.onClick(); await flush(); h.unmount();
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
  if (action === 'change-passage') { h.find(n => n.type === 'input' && n.props['aria-label'] === 'Passage start').props.onChange({ target: { value: '0' } }); h.render(); h.button('Use this passage').props.onClick(); await flush(); h.render(); }
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
  const dsp = load('lib/blind-eq-audio.ts', id => id === './blind-eq' ? model : (() => { throw Error(id); })(), { AudioBuffer: Buffer, OfflineAudioContext: Offline });
  const buffer = new Buffer({ numberOfChannels: 2, length: 48_000 * 6, sampleRate: 48_000 }), controller = new AbortController();
  const render = dsp.prepareComparison(buffer, [flat('one'), flat('two')], 0, 5, true, controller.signal); controller.abort(); firstRender.resolve();
  await assert.rejects(render, /cancelled/); check(instances === 1, 'Cancellation after the first offline render prevents rendering the second preset');
  await assert.rejects(dsp.prepareComparison(buffer, [flat('one'), flat('two')], 0, 5, true, controller.signal), /cancelled/); check(instances === 1, 'An already-cancelled preparation creates no new audio context');
}
console.log(`PASS ${checks} actual blind EQ workflow checks: mixed playlist limits/removal, volume persistence, confirmation focus/Escape, private export completeness, failed downloads/leave guards, silent-passage recovery, stale async work, hidden/muted playback and DSP cancellation.`);

for (const rate of [44100, 48000]) {
 const h = pageFixture(rate); h.apply();
 const preset=flat('High filter');preset.channels[0].filters=[{type:'PK',hz:23000,gain:2,q:1}];
 all(h.tree,n=>n.type===h.Editor)[1].props.onChange(preset);h.render();h.songs()[0].props.onChange();h.render();
 h.button('Hide presets & start').props.onClick();h.render();
 if(rate===44100){check(text(h.tree).includes('Preset 2, Left filter 1'),'Rate failure identifies preset/channel/row before blinding');check(!h.listeners.get('beforeunload')?.size,'Invalid rate cannot enter a blinded session');}
 else {check(h.listener().props.context.sampleRate===48000,'Listener receives the same context validated at setup');}
 h.unmount();
}
console.log('PASS setup-time sample-rate boundaries and validated context handoff.');
