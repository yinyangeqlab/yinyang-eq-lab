import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../components/library-wave-player.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function fixture({ hostname = 'localhost', origin = 'http://localhost:5173', src = 'http://localhost:5173/music/missing.mp3', resume = () => Promise.resolve() } = {}) {
  const calls = [];
  const refs = [], states = [], effects = [], requests = [], timers = new Map(); let timerId = 0, recoveryOptions;
  const jsx = (type, props) => ({ type, props });
  const node = () => ({ connect() {}, disconnect() {}, gain: { value: 1, setTargetAtTime() {} }, frequency: {}, Q: {}, threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} });
  class AudioContext {
    state = 'running'; currentTime = 0; destination = node();
    resume() { calls.push('resume'); return resume(); } close() { this.state = 'closed'; return Promise.resolve(); }
    createMediaElementSource() { return node(); } createGain() { return node(); }
    createBiquadFilter() { return node(); } createDynamicsCompressor() { return node(); } createWaveShaper() { return node(); }
  }
  const React = {
    useRef(value) { const ref = { current: value }; refs.push(ref); return ref; },
    useState(value) { const index = states.length; states.push(value); return [value, next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useEffect(fn) { effects.push(fn); },
  };
  const exported = { exports: {} };
  vm.runInNewContext(code, { exports: exported.exports, module: exported, URL, AbortController, Float32Array, AudioContext,
    window: { location: { hostname, origin }, setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); } },
    fetch(url, options) { return new Promise(resolve => requests.push({ url, options, resolve })); },
    require(id) {
      if (id === 'react') return React;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (id === 'lucide-react') return { Play() {}, Pause() {}, Volume2() {}, VolumeX() {} };
      if (id === '@/lib/media-recovery') return { attachMediaRecovery(audio, options) { recoveryOptions = options; return { retry: () => false, handleError: () => false, dispose() {} }; } };
      if (id === '@/lib/curated-waveforms') return { curatedWaveform: () => null };
      if (id === '@/lib/music-preferences') return { playbackGain: () => 1 };
      if (id === '@/lib/eq-playback') return { replaceEqStage: () => ({ dispose() {} }), safeGain() {}, watchAudioInterruptions: () => () => {} };
      if (id === '@/components/track-waveform') return { __esModule: true, default() {} };
      throw Error('Unexpected dependency: ' + id);
    },
  });
  const tree = exported.exports.default({ track: { title: 'Synthetic', artist: 'Fixture', fileUrl: src, duration: 30 }, onPlay() {} });
  const find = (element, predicate) => {
    if (!element || typeof element !== 'object') return null;
    if (predicate(element)) return element;
    for (const child of [element.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found; }
    return null;
  };
  const media = find(tree, element => element.type === 'audio'), button = find(tree, element => element.type === 'button');
  const audio = { src, paused: true, currentTime: 0, error: { code: 4 }, pause() { this.paused = true; }, async play() { calls.push('play'); this.paused = false; media.props.onPlay({ currentTarget: this }); media.props.onPlaying(); } };
  media.props.ref.current = audio;
  const cleanups = effects.map(effect => effect()).filter(Boolean);
  return { calls, requests, timers, audio, media, button, get error() { return states[6]; }, get recovery() { return recoveryOptions; }, fail() { media.props.onError({ currentTarget: audio }); }, succeed() { audio.paused = false; media.props.onPlay({ currentTarget: audio }); media.props.onPlaying(); }, cleanup() { for (const fn of cleanups) fn(); } };
}
{
  let release; const resumed = new Promise(resolve => { release = resolve; });
  const h = fixture({ resume: () => resumed }); h.button.props.onClick();
  assert.deepEqual(h.calls, ['resume', 'play'], 'Library resume and play must both start inside the tap, before resume settles');
  h.button.props.onClick(); release(); await flush();
  check(h.audio.paused, 'Resolving an interrupted resume cannot undo an explicit Pause'); h.cleanup();
}
for (const status of [404, 503]) {
  const h = fixture(); h.fail(); check(h.requests.length === 1, 'Real component probes a local failed recording');
  check(h.requests[0].options.method === 'HEAD' && h.requests[0].options.credentials === 'same-origin', 'Probe stays read-only and same-origin');
  h.requests[0].resolve({ status }); await flush(); check(h.error.includes('not installed in this local copy'), 'Confirmed local missing audio has an actionable explanation');
  check(h.timers.size === 0, 'Settled request clears timeout'); h.cleanup();
}
for (const config of [{ hostname: 'yinyangeq.com', origin: 'https://yinyangeq.com', src: 'https://yinyangeq.com/music/x.mp3' }, { src: 'https://example.org/music/x.mp3' }]) {
  const h = fixture(config); h.fail(); check(h.requests.length === 0, 'Hosted or cross-origin media never gets a local-installation probe'); h.cleanup();
}
for (const status of [200, 401, 403, 500]) {
  const h = fixture(); h.fail(); h.requests[0].resolve({ status }); await flush(); check(!h.error.includes('not installed'), 'Other HTTP failures retain the generic error'); h.cleanup();
}
{
  const h = fixture(); h.fail(); const request = h.requests[0]; await h.button.props.onClick();
  check(request.options.signal.aborted, 'Retry cancels the old missing-audio request'); request.resolve({ status: 404 }); await flush();
  check(h.error === '' && !h.audio.paused, 'Delayed 404 cannot overwrite successful retry'); h.cleanup();
}
for (const action of ['succeed', 'recovering', 'recovered', 'cleanup', 'replace', 'source', 'timeout']) {
  const h = fixture(); h.fail(); const request = h.requests[0];
  if (action === 'succeed') h.succeed();
  if (action === 'recovering') h.recovery.onRecovering();
  if (action === 'recovered') h.recovery.onRecovered();
  if (action === 'cleanup') h.cleanup();
  if (action === 'replace') h.media.props.ref.current = { ...h.audio };
  if (action === 'source') h.audio.src = 'http://localhost:5173/music/different.mp3';
  if (action === 'timeout') for (const fn of h.timers.values()) fn();
  request.resolve({ status: 503 }); await flush();
  check(!h.error.includes('not installed'), 'Stale response ignored after ' + action);
  if (!['replace', 'source'].includes(action)) check(request.options.signal.aborted, 'Probe actively aborted on ' + action);
  h.cleanup();
}
{
  const h = fixture(); h.fail(); h.fail(); check(h.requests[0].options.signal.aborted, 'New failure supersedes the older probe');
  h.requests[0].resolve({ status: 404 }); await flush(); check(!h.error.includes('not installed'), 'Old completion cannot replace the newer failure state');
  h.requests[1].resolve({ status: 503 }); await flush(); check(h.error.includes('not installed'), 'Current failure can still report missing audio'); h.cleanup();
}
{
  const h = fixture(); let rejectOld;
  const success = h.audio.play.bind(h.audio);
  h.audio.play = () => new Promise((resolve, reject) => { rejectOld = reject; });
  const oldAttempt = h.button.props.onClick(); await flush();
  h.audio.play = success; await h.button.props.onClick();
  rejectOld(Error('Old play attempt rejected late')); await oldAttempt; await flush();
  check(h.error === '' && h.requests.length === 0, 'Late play rejection cannot start a probe or replace newer successful playback'); h.cleanup();
}
console.log(`PASS ${checks} actual LibraryWavePlayer checks: missing-file classification, hosted isolation, retry/success/recovery races, replacement/source changes, timeout, supersession and unmount cleanup. Synthetic audio/network only.`);
