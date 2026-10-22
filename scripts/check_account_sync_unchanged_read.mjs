import assert from 'node:assert/strict';
import { readAccountState } from '../lib/account-sync-transfer.mjs';
import { accountDataDigest } from '../lib/device-sync.mjs';

// The server pages saved account data two parts at a time and every check used to download every page. A check that
// finds the account exactly where this browser last acknowledged it must stop after the first response.
const known = { epoch: 'epoch-1', revision: 7, accountKey: 'account-1', values: { 'target-lab-trials': '[{"id":"a"}]' } };
const emptyDigest = await accountDataDigest({});

function server(first, calls = []) {
  const pages = [
    { segmented: true, initialized: true, epoch: 'epoch-1', revision: 7, accountKey: 'account-1', sections: {}, dataDigest: emptyDigest, parts: [], nextPart: 'page-2', ...first },
    { segmented: true, parts: [], nextPart: 'page-3' },
    { segmented: true, parts: [], nextPart: null },
  ];
  const fetcher = async url => { calls.push(String(url)); const page = pages[Math.min(calls.length, 3) - 1]; return { ok: true, json: async () => page }; };
  return { fetcher, calls };
}
const read = async (first, knownState) => { const { fetcher, calls } = server(first); const messages = []; const state = await readAccountState('/api/my-profile/sync', fetcher, message => messages.push(message), knownState); return { state, calls: calls.length, messages }; };

// Unchanged: one request, no download or verification activity, and the stored copy is returned unchanged.
let result = await read({}, known);
assert.equal(result.calls, 1, 'an unchanged account costs one request');
assert.equal(result.state.unchanged, true);
assert.equal(result.state.values, known.values, 'the acknowledged local copy is reused as-is');
assert.deepEqual(result.messages, [], 'no download or verification activity is reported');
assert.equal(result.state.epoch, 'epoch-1');
assert.equal(result.state.revision, 7);
assert.equal(result.state.parts, undefined);
assert.equal(result.state.nextPart, undefined);

// Anything that could make the stored copy stale downloads every page, exactly as before.
for (const [name, first, knownState] of [
  ['no acknowledged copy', {}, null],
  ['a newer revision', { revision: 8 }, known],
  ['an older revision', { revision: 6 }, known],
  ['a rotated epoch (for example after erasure)', { epoch: 'epoch-2' }, known],
  ['a different account', { accountKey: 'account-2' }, known],
  ['an account not yet initialized', { initialized: false }, known],
]) {
  result = await read(first, knownState);
  assert.equal(result.calls, 3, name + ' downloads all pages');
  assert.equal(result.state.unchanged, undefined, name + ' is not treated as unchanged');
  assert.deepEqual(result.state.values, {}, name + ' returns the downloaded values');
  assert.ok(result.messages.includes('Downloading saved account data…'));
}

// Integrity checking still applies to a full download.
await assert.rejects(read({ revision: 8, dataDigest: 'wrong' }, known), /integrity/i);

// Without an account key on the acknowledged copy the epoch and revision still decide.
result = await read({}, { epoch: 'epoch-1', revision: 7, values: {} });
assert.equal(result.calls, 1);

// Unsegmented responses are returned untouched.
const plain = await readAccountState('/x', async () => ({ ok: true, json: async () => ({ segmented: false, values: { a: '1' }, epoch: 'epoch-1', revision: 7 }) }), () => {}, known);
assert.deepEqual(plain.values, { a: '1' });

console.log('Account sync unchanged-read checks passed: one request when nothing changed, full verified download otherwise.');
