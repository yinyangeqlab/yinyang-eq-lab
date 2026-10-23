import assert from 'node:assert/strict';
import { personalStartBlock, retainedSongFor } from '../lib/personal-start-status.ts';

const ready = { playbackReady: true, musicChosen: true, setupReady: true, sharingState: 'ready' };

// Nothing blocks a fully prepared setup.
assert.equal(personalStartBlock(ready), null);
assert.equal(personalStartBlock({ ...ready, sharingState: 'unavailable' }), null, 'a ready setup is never blocked by a later sharing failure');

// Every block says why, in a sentence, and names the way forward.
const cases = [
  ['storage', { ...ready, storageError: 'Quota exceeded.' }, /storage is unavailable.*Quota exceeded/i],
  ['headphones', { ...ready, hasHeadphones: false }, /Pick your headphones in step 1/],
  ['channel', { ...ready, playbackReady: false }, /Channel matching.*Uploaded.*Auto or Off/i],
  ['music', { ...ready, musicChosen: false }, /Choose at least one song/i],
  ['sharing-unavailable', { ...ready, setupReady: false, sharingState: 'unavailable' }, /could not be checked.*stays on this device/i],
  ['checking', { ...ready, setupReady: false, sharingState: 'checking' }, /Checking your settings/],
  ['checking', { ...ready, setupReady: false, sharingState: 'ready' }, /Checking your settings/],
];
for (const [kind, input, pattern] of cases) {
  const block = personalStartBlock(input);
  assert.equal(block?.kind, kind, kind);
  assert.match(block.message, pattern, kind);
}

// Priority: a storage failure is reported before anything that depends on it.
assert.equal(personalStartBlock({ storageError: 'x', playbackReady: false, musicChosen: false, setupReady: false, sharingState: 'unavailable' }).kind, 'storage');
assert.equal(personalStartBlock({ playbackReady: false, musicChosen: false, setupReady: false }).kind, 'channel');
assert.equal(personalStartBlock({ ...ready, hasHeadphones: true }), null, 'headphones chosen never blocks');
assert.equal(personalStartBlock({ hasHeadphones: false, playbackReady: false, musicChosen: false, setupReady: false }).kind, 'headphones', 'missing headphones is the first thing to fix');
assert.equal(personalStartBlock({ storageError: 'x', hasHeadphones: false, playbackReady: true, musicChosen: true, setupReady: true }).kind, 'storage', 'storage is still reported first');
assert.equal(personalStartBlock({ playbackReady: true, musicChosen: false, setupReady: false }).kind, 'music');

// A chosen Upload song is reloaded each round except during finalist checks, and never for other music sources.
const song = { name: 'song.wav' };
assert.equal(retainedSongFor('upload', 'explore', song), song);
assert.equal(retainedSongFor('upload', undefined, song), song);
assert.equal(retainedSongFor('upload', 'confirm', song), null, 'finalist checks still need a different song');
assert.equal(retainedSongFor('pool', 'explore', song), null);
assert.equal(retainedSongFor('playlist', 'explore', song), null);
assert.equal(retainedSongFor('upload', 'explore', null), null);

console.log('Personal start-status checks passed: every blocked Start explains itself; Upload songs persist between rounds except in finalist checks.');

// Custom target pools: too few targets explains itself; callers that omit the pool keep their old meaning.
{
  const base = { playbackReady: true, musicChosen: true, setupReady: false, hasHeadphones: true };
  assert.equal(personalStartBlock({ ...base, poolSize: 1, minPool: 2 }).kind, 'pool');
  assert.equal(personalStartBlock({ ...base, poolSize: 2, minPool: 2 }).kind, 'checking');
  assert.equal(personalStartBlock({ ...base }).kind, 'checking');
  assert.equal(personalStartBlock({ ...base, hasHeadphones: false, poolSize: 0, minPool: 2 }).kind, 'headphones', 'headphones are explained before the pool');
  console.log('PASS custom pool start reasons');
}
