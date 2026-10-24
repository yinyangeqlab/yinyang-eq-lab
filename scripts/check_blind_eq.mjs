import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { captureAccountValues } from '../lib/account-sync.mjs';

const source = readFileSync(new URL('../lib/blind-eq.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { parseEqPresetText: parse, validateEqPreset, eqCoefficients, comparisonGains, createBlindSession, recordBlindRound, revealBlindSession } = await import('data:text/javascript;base64,' + Buffer.from(javascript).toString('base64'));
let assertions = 0;
const check = (condition, message) => { assert.ok(condition, message); assertions++; };
const rejects = (operation, pattern) => { assert.throws(operation, pattern); assertions++; };

const txt = '# Synthetic preset\nPreamp: -6 dB\nFilter 1: ON PK Fc 1000 Hz Gain 4 dB Q 2\nFilter 2: ON LSC Fc 100 Hz Gain -2 dB Q 0.7\nFilter 3: ON HSC Fc 8000 Hz Gain 1 dB Q 0.6';
const mono = parse(txt, 'Synthetic one');
check(mono.channels.every(c => c.filters.length === 3 && c.preampDb === -6), 'APO and Peace TXT copied to both channels');
check(mono.channels[0].filters[0].q === 2, 'Q is read from the correct capture');
mono.channels[0].filters[0].gain = 3;
check(mono.channels[1].filters[0].gain === 4, 'Left and Right do not share mutable filters');
const stereo = parse('CH: 0\nTYPE: PEQ\nPreamp: -2 dB\nFilter 1: ON PK Fc 70 Hz Gain 1 dB Q 1\nCH: 1\nTYPE: PEQ\nPreamp: -3 dB\nFilter 1: ON HSC Fc 4000 Hz Gain -2 dB Q 0.9', 'Synthetic two');
check(stereo.channels[0].filters[0].hz === 70 && stereo.channels[1].filters[0].type === 'HSC', 'Qudelix / PEQdB stereo channels remain distinct');
check(stereo.channels[0].preampDb === -2 && stereo.channels[1].preampDb === -3, 'Separate stereo preamps preserved');
const scoped = parse('\ufeffPreamp: -1 dB\r\nChannel: L\r\nPreamp: -2 dB\nFilter: ON PEQ Fc 200 Hz Gain +.5 dB Q .8 # inline comment\nChannel: R\nFilter 1: ON HS Fc 9000 Hz Gain -1 dB\nFilter 3: OFF NOT_SUPPORTED', 'Scoped');
check(scoped.channels[0].preampDb === -3 && scoped.channels[1].preampDb === -1, 'APO preamp directives sum only on selected channels');
check(scoped.channels[0].filters[0].gain === .5 && scoped.channels[1].filters[0].q === Math.SQRT1_2, 'BOM, CRLF, decimals, aliases, default shelf Q, disabled filters');
for (const text of ['GraphicEQ: 20 0; 100 2', 'Include: private.txt', 'Convolution: impulse.wav', 'Device: Speakers', 'Filter: ON PK Fc 100 Hz Gain 2 dB', 'Filter: ON LSC 12 dB Fc 100 Hz Gain 3 dB', 'Filter: ON LS 6dB Fc 100 Hz Gain 3 dB', 'Filter: ON PK Fc 100 Hz Gain 2 dB BW Oct 1', '[Frequencies]\nFrequency1=100', 'garbage', 'CH: 0\nPreamp: 0 dB', 'CH: 0\nChannel: R\nPreamp: 0 dB\nCH: 1\nPreamp: 0 dB']) rejects(() => parse(text, 'Bad'), /Unsupported|Q value|both CH|mix/);
for (const field of [{ hz: NaN }, { hz: 0 }, { hz: 24001 }, { gain: 31 }, { gain: Infinity }, { q: .01 }, { q: 21 }, { type: 'NO' }]) {
  const preset = structuredClone(mono); Object.assign(preset.channels[0].filters[0], field);
  rejects(() => validateEqPreset(preset), /Each filter/);
}
rejects(() => parse(txt.repeat(3000), 'Big'), /200 KB/);
rejects(() => parse('Preamp: 41 dB', 'Bad'), /Preamp/);
rejects(() => parse('Preamp: 30 dB\nPreamp: 30 dB', 'Bad'), /Preamp/);
rejects(() => parse(txt, ''), /name/);
rejects(() => parse(Array.from({ length: 33 }, () => 'Filter: ON PK Fc 100 Hz Gain 0 dB Q 1').join('\n'), 'Too many'), /32/);
check(parse('Preamp: 0 dB', 'Flat').channels.every(c => c.filters.length === 0), 'Flat reference supported');

function response(filter, frequency, sampleRate = 48000) {
  const { feedforward: b, feedback: a } = eqCoefficients(filter, sampleRate), w = 2 * Math.PI * frequency / sampleRate;
  const real = coefficients => coefficients.reduce((sum, value, index) => sum + value * Math.cos(w * index), 0);
  const imaginary = coefficients => coefficients.reduce((sum, value, index) => sum - value * Math.sin(w * index), 0);
  return 10 * Math.log10((real(b) ** 2 + imaginary(b) ** 2) / (real(a) ** 2 + imaginary(a) ** 2));
}
for (const gain of [-12, 0, 8]) {
  check(Math.abs(response({ type: 'PK', hz: 1000, gain, q: 2 }, 1000) - gain) < 1e-8, 'Peaking center has requested gain');
  check(Math.abs(response({ type: 'LSC', hz: 1000, gain, q: .8 }, 1000) - gain / 2) < 1e-8, 'Low shelf center has half its asymptotic gain');
  check(Math.abs(response({ type: 'HSC', hz: 1000, gain, q: .8 }, 1000) - gain / 2) < 1e-8, 'High shelf center has half its asymptotic gain');
}
check(Math.abs(response({ type: 'LSC', hz: 100, gain: 6, q: .5 }, 200) - response({ type: 'LSC', hz: 100, gain: 6, q: 2 }, 200)) > .5, 'Shelf Q changes response');
rejects(() => eqCoefficients({ type: 'PK', hz: 24000, gain: 0, q: 1 }, 48000), /Nyquist/);
for (const match of [true, false]) {
  const stats = [{ rms: .2, peak: 2 }, { rms: .1, peak: .8 }], gains = comparisonGains(stats, match);
  check(stats.every((stat, index) => stat.peak * gains[index] <= 10 ** (-3 / 20) + 1e-10), 'Common 3 dB sample-peak headroom');
  if (match) check(Math.abs(stats[0].rms * gains[0] - stats[1].rms * gains[1]) < 1e-12, 'Rendered RMS levels match');
  else check(gains[0] === gains[1], 'Without matching, preamp level differences preserved');
}
rejects(() => comparisonGains([{ rms: 0, peak: 0 }, { rms: .1, peak: .2 }], true), /silent/);
rejects(() => comparisonGains([{ rms: NaN, peak: 0 }, { rms: .1, peak: .2 }], true), /invalid/);

const round = { song: 'Synthetic song', artist: 'Fixture', start: 0, seconds: 15, choice: 'A', heard: [5, 5] };
for (const random of [() => 0, () => .99]) {
  let session = createBlindSession([mono, stereo], random), original = structuredClone(session);
  check(JSON.stringify(session.order) === (random() === 0 ? '[0,1]' : '[1,0]'), 'Both A/B assignments reachable');
  rejects(() => revealBlindSession(session), /at least one/);
  rejects(() => recordBlindRound(session, { ...round, heard: [5, 4.99] }), /five seconds/);
  session = recordBlindRound(session, round);
  session = recordBlindRound(session, { ...round, song: 'Second', choice: 'tie' });
  session = recordBlindRound(session, { ...round, song: 'Third', choice: 'skip', heard: [0, 0] });
  check(session.rounds.length === 3 && JSON.stringify(session.order) === JSON.stringify(original.order), 'Multiple songs preserve fixed mapping');
  check(original.rounds.length === 0, 'Recording is immutable');
  session = revealBlindSession(session);
  rejects(() => recordBlindRound(session, round), /already revealed/);
}
const storage = new Map([['private-blind-eq-fixture', JSON.stringify({ presets: [mono, stereo], choices: [round] })]]);
check(!Object.keys(captureAccountValues({ getItem: key => storage.get(key) ?? null })).length, 'Private data is outside Account Sync allowlist');
for (const file of ['app/eq-compare/page.tsx', 'components/blind-eq-editor.tsx', 'lib/blind-eq.ts']) {
  const content = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  check(!/localStorage|sessionStorage|fetch\(/.test(content), `${file} never persists or sends presets/results`);
}
// Exercise the real import handler and initial form, including automatic opt-in
// to separate preamps only when an imported preset actually needs them.
const editorSource = readFileSync(new URL('../components/blind-eq-editor.tsx', import.meta.url), 'utf8');
const require = createRequire(import.meta.url), compiledModule = { exports: {} };
const editorCode = ts.transpileModule(editorSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
vm.runInNewContext(editorCode, { module: compiledModule, exports: compiledModule.exports, require: id => id === '@/lib/blind-eq' ? { parseEqPresetText: parse, validateEqPreset } : require(id) });
const markup = renderToStaticMarkup(require('react').createElement(compiledModule.exports.default, { title: 'Test preset', initialName: 'Synthetic', onChange() {} }));
check(markup.includes('Preamp (dB)') && !markup.includes('Left<!-- --> preamp'), 'One shared preamp field is the initial form');
const restored = renderToStaticMarkup(require('react').createElement(compiledModule.exports.default, { title: 'Restored preset', initialName: 'Unused default', initialPreset: stereo, onChange() {} }));
check(restored.includes(stereo.name) && restored.includes('previous preset restored') && /Left(?:<!-- -->)? preamp/.test(restored), 'New-session editor restores the saved stereo preset rather than displaying defaults');
check(restored.includes('value="' + stereo.channels[0].preampDb + '"') && restored.includes('value="' + stereo.channels[1].preampDb + '"'), 'Restored channel preamps match the preset used for playback');
const ast = ts.createSourceFile('editor.tsx', editorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), handlers = new Map();
function visit(node) { if (ts.isFunctionDeclaration(node) && node.name) handlers.set(node.name.text, node.getText(ast)); ts.forEachChild(node, visit); }
visit(ast);
const handlerCode = ts.transpileModule(handlers.get('dirty') + '\n' + handlers.get('upload'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const state = { name: 'Synthetic import', parseEqPresetText: parse, onChange: preset => { state.preset = preset; }, setMessage() {}, setError() {}, setBusy() {}, setRows: value => { state.rows = value; }, setPreamps: value => { state.preamps = value; }, setSeparatePreamps: value => { state.separate = value; } };
const context = vm.createContext(state); vm.runInContext(handlerCode, context);
for (const [text, separate] of [[txt, false], ['CH: 0\nPreamp: -2 dB\nCH: 1\nPreamp: -3 dB', true]]) {
  state.file = { size: text.length, text: async () => text };
  await vm.runInContext('upload(file)', context);
  check(state.separate === separate, 'Import chooses shared versus independent preamps without changing values');
  check(state.preset.channels.every((channel, index) => String(channel.preampDb) === state.preamps[index]), 'Imported preamp values survive form population');
}
console.log(`PASS ${assertions} blind EQ checks: TXT formats, strict validation, stereo routing, shelf math, RMS/headroom, private session lifecycle and Sync exclusion.`);
