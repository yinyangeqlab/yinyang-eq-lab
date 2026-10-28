import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const parse = path => ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const personal = parse('app/shootout/personal/page.tsx'), panel = parse('components/music-panel.tsx'), shootout = parse('app/shootout/page.tsx');
function find(ast, predicate) { let found; function visit(n) { if (!found && predicate(n)) found = n; ts.forEachChild(n, visit); } visit(ast); assert.ok(found); return found; }
const named = (ast, name) => find(ast, n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(ast);
const effect = (ast, text) => find(ast, n => ts.isCallExpression(n) && n.expression.getText(ast) === 'useEffect' && n.arguments[0].getText(ast).includes(text)).arguments[0].getText(ast);
function context(code, state) { vm.createContext(state); vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, state); return state; }
let checks = 0;
for (const fail of [false, true]) {
  const events = [], retained = { name: 'synthetic.wav' };
  const state = { run: { music: { mode: 'upload' } }, emptyPair: [0, 0], musicRemountPending: { current: false }, retained,
    safely(fn) { try { fn(); } catch { events.push('quota'); } },
    update() { events.push('save'); if (fail) throw Error('quota'); },
    player: { current: { stop: () => events.push('stop') } },
    setUploadedSong(value) { state.retained = value; events.push('clear-upload'); }, setHeard() { events.push('reset'); }, setNotice() {},
  };
  context(named(personal, 'chooseMusic'), state).chooseMusic({ mode: 'pool', ids: [] });
  if (fail) { assert.equal(state.retained, retained); assert.deepEqual(events, ['save', 'quota']); assert.equal(state.musicRemountPending.current, false); }
  else { assert.equal(state.retained, null); assert.deepEqual(events, ['save', 'stop', 'clear-upload', 'reset']); assert.equal(state.musicRemountPending.current, true); }
  checks++;
}
for (const scenario of ['non-music', 'music', 'closed', 'other-focus']) {
  let focused = 0;
  const body = {}, state = { pairToken: 'next', previousMusicPlayer: { current: 'old' }, musicRemountPending: { current: scenario !== 'non-music' }, musicChooserOpen: scenario !== 'closed', musicFocusKey: { current: 'source' }, document: { body, activeElement: scenario === 'other-focus' ? {} : body, querySelectorAll: () => [{ dataset: { musicControl: 'source' }, focus: () => focused++ }] } };
  context('const restore = ' + effect(personal, 'musicRemountPending.current') + '; restore();', state);
  assert.equal(focused, scenario === 'music' ? 1 : 0);
  assert.equal(state.musicRemountPending.current, false);
  state.pairToken = 'later'; vm.runInContext('restore()', state); assert.equal(focused, scenario === 'music' ? 1 : 0, 'restore must be one-shot');
  checks++;
}
const songAction = find(personal, n => ts.isJsxAttribute(n) && n.name.getText(personal) === 'songActions').initializer.expression;
const songCondition = songAction.left.getText(personal);
for (const [mode, ids, excluded, expected] of [['song', ['a'], [], false], ['playlist', ['a'], [], false], ['playlist', ['a', 'b'], [], true], ['playlist', ['a', 'b'], ['b'], false], ['upload', [], [], false], ['pool', [], [], true]]) {
  const state = { music: { mode }, listeningPool: [{ url: 'a' }, { url: 'b' }], excludedRecordings: excluded, includedRecordings: mode === 'pool' ? undefined : ids };
  context('const canChooseAnother = ' + songCondition + ';', state);
  assert.equal(vm.runInContext('canChooseAnother', state), expected); checks++;
}
for (const [revealed, busy, active, expected] of [[true, false, 'body', 1], [true, false, 'choice', 1], [true, true, 'body', 0], [false, false, 'body', 0], [true, false, 'other', 0]]) {
  let focused = 0; const body = {}, state = { revealed, busy, document: { body, activeElement: active === 'body' ? body : { closest: () => active === 'choice' } }, continueButton: { current: { focus: () => focused++ } } };
  context('const revealFocus = ' + effect(shootout, 'continueButton.current') + '; revealFocus();', state);
  assert.equal(focused, expected); checks++;
}
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function folderFixture() {
  const errors = [], statuses = [], decodes = [];
  const state = { testMode: "open", file: null, folderSerialRef: { current: 0 }, sourceSerialRef: { current: 1 }, audioRef: { current: {} }, testModeRef: { current: 'open' }, openMusicSourceRef: { current: 'own' }, samplesRef: { current: [] }, sampleIndexRef: { current: -1 },
    stereoFile() { const p = deferred(); decodes.push(p); return p.promise; }, setSampleStatus: s => statuses.push(s), setSourceError: s => errors.push(s), setSamples() {}, setSampleChoice() {},
  };
  context(named(panel, 'chooseFolder'), state); return { state, errors, statuses, decodes };
}
const file = name => ({ name, webkitRelativePath: 'Synthetic/' + name });
for (const mutation of ['source', 'file', 'unmount']) {
  const f = folderFixture(), pending = f.state.chooseFolder([file('old.wav')]);
  if (mutation === 'source') { f.state.folderSerialRef.current++; f.state.sourceSerialRef.current++; f.state.openMusicSourceRef.current = 'pool'; }
  if (mutation === 'file') f.state.sourceSerialRef.current++;
  if (mutation === 'unmount') f.state.audioRef.current = null;
  f.decodes[0].resolve(true); await pending;
  if(mutation==='file'){assert.equal(f.state.samplesRef.current[0].name,'old.wav','file selection does not discard the independent folder scan');assert.deepEqual(f.errors,['']);}else{assert.equal(f.state.samplesRef.current.length,0,mutation+' invalidates the folder scan');assert.deepEqual(f.errors,[]);} checks++;
}
{
  const f = folderFixture(), first = f.state.chooseFolder([file('old.wav')]), second = f.state.chooseFolder([file('new.wav')]);
  f.decodes[1].resolve(true); await second; f.decodes[0].resolve(true); await first;
  assert.equal(f.state.samplesRef.current[0].name, 'new.wav'); assert.deepEqual(f.errors, ['']);
  assert.match(f.statuses.at(-1), /Choose a folder song or press Play/); checks++;
}
console.log(`PASS ${checks} actual player/picker review checks: atomic failed save, one-shot focus, eligible songs, reveal focus, delayed folder scan supersession/source/file/unmount and successful recovery.`);
