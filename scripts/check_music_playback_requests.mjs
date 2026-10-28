import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

// Execute the real handlers with deferred media promises, including failures
// that a local, instantly buffered audio fixture cannot reliably reproduce.
const source = fs.readFileSync('components/music-panel.tsx', 'utf8');
const ast = ts.createSourceFile('music-panel.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['playContinuous', 'cancelPassage', 'markPlaybackStopped', 'startPlayback', 'listenToSide', 'toggleMusicPlayback', 'clearMusicSource'];
const bodies = new Map();
function visit(node) {
  if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) bodies.set(node.name.text, node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(bodies.size, names.length);
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
};
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const failure = name => Object.assign(new Error(name), { name });
function fixture() {
  const errors = [], calls = [], plays = [], resumes = [];
  const audio = { paused: true, play() { calls.push('play'); this.paused = false; const p = deferred(); plays.push(p); return p.promise; }, pause() { this.paused = true; }, removeAttribute() {}, load() {} };
  const state = {
    audioRef: { current: audio }, playbackRequestRef: { current: 0 }, sourceSerialRef: { current: 1 }, folderSerialRef: { current: 0 }, passageRunRef: { current: null },
    beforePlayback: undefined, file: { name: 'synthetic.wav' }, setupEngine() {}, applyFit() {}, selectSide() {},
    setPassageRun() {}, setSourceError: value => errors.push(value), mediaRecovery: { current: { retry: () => false } },
    engine: { current: { context: { currentTime: 0, resume() { calls.push('resume'); const p = deferred(); resumes.push(p); return p.promise; } }, transitionGain: { gain: { cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} } } } },
    testModeRef: { current: 'open' }, openMusicSourceRef: { current: 'own' }, isPlaying: true, notified: null,
    setIsPlaying: value => { state.isPlaying = value; }, onPlaybackChange: value => { state.notified = value; },
    curatedFetchRef: { current: 0 }, hashSerialRef: { current: 0 }, candidateUrlRef: { current: null }, measuredLufsRef: { current: null }, sourceKindRef: { current: 'uploaded' }, urlRef: { current: null }, resetHeard() {},
  };
  for (const name of ['SampleStatus', 'Meta', 'BitrateDetails', 'ChooserOpen', 'Duration', 'PassageOverride', 'Position', 'CandidateUrl', 'MusicVoteMessage', 'File', 'Analysis', 'CuratedPreview', 'Hashing', 'WaveformZoom', 'WaveformFocus', 'LoudnessStatus']) state['set' + name] = value => { state[name] = value; };
  vm.createContext(state);
  vm.runInContext(ts.transpileModule([...bodies.values()].join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, state);
  return { state, errors, calls, plays, resumes, audio };
}
let checks = 0;
for (const handler of ['startPlayback', 'listenToSide', 'toggleMusicPlayback']) {
  for (const mutation of ['replace', 'pause', 'unmount', 'new-request']) {
    const f = fixture();
    f.state[handler](...(handler === 'listenToSide' ? [0, true] : []));
    assert.deepEqual(f.calls, ['resume', 'play'], `${handler}: resume and play must both start in the user gesture`);
    f.resumes[0].resolve();
    if (mutation === 'replace') f.state.clearMusicSource();
    if (mutation === 'pause') { f.state.cancelPassage(); f.audio.pause(); }
    if (mutation === 'unmount') f.state.audioRef.current = null;
    if (mutation === 'new-request') {
      f.state.playContinuous(() => Promise.resolve(), () => Promise.reject(failure('NotAllowedError')));
      await settle();
      assert.match(f.errors.at(-1), /Playback could not start/);
    }
    const expected = [...f.errors];
    f.plays[0].reject(failure('NotAllowedError'));
    await settle();
    assert.deepEqual(f.errors, expected, `${handler}: ${mutation} must invalidate old errors`);
    checks++;
  }
}
for (const completion of ['success', 'failure', 'abort', 'stale-success']) {
  const f = fixture();
  const pending = f.state.playContinuous(() => f.state.engine.current.context.resume(), () => f.audio.play());
  f.resumes[0].resolve();
  if (completion === 'failure') f.plays[0].reject(failure('NotAllowedError'));
  else if (completion === 'abort') f.plays[0].reject(failure('AbortError'));
  else { if (completion === 'stale-success') { f.state.sourceSerialRef.current++; f.state.setSourceError('New source error'); } f.plays[0].resolve(); }
  const result = await pending;
  assert.equal(result, completion === 'success');
  if (completion === 'success') assert.deepEqual(f.errors, ['']);
  if (completion === 'failure') assert.match(f.errors.at(-1), /Playback could not start/);
  if (completion === 'abort') assert.deepEqual(f.errors, []);
  if (completion === 'stale-success') assert.deepEqual(f.errors, ['New source error']);
  checks++;
}
{
  const f = fixture();
  f.state.clearMusicSource();
  assert.equal(f.audio.paused, true);
  assert.equal(f.state.isPlaying, false, 'source reset updates the transport even if load cancels the queued pause event');
  assert.equal(f.state.notified, false);
  assert.equal(f.state.Meta.recordingId, '');
  assert.equal(f.state.Meta.sha256, null);
  assert.equal(f.state.Meta.songArtist, '');
  assert.equal(f.state.folderSerialRef.current, 1, 'source reset invalidates an in-flight folder scan');
  checks++;
}
{
  const f = fixture();
  let chooser = false;
  f.state.setChooserOpen = value => { chooser = value; };
  f.state.clearMusicSource(false);
  assert.equal(chooser, false, 'restoring a retained upload must preserve a closed chooser');
  f.state.clearMusicSource();
  assert.equal(chooser, true, 'an explicit source reset still opens the chooser');
  checks++;
}
console.log(`PASS ${checks} actual music playback request checks: parallel user gesture, current failures, deliberate aborts, stale failure/success, pause/source/remount/supersession, explicit stopped state.`);
