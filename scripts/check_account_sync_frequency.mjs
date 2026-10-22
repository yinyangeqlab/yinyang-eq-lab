import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Runs the real automatic-sync effect with stubbed transport to count network use. Page changes, refreshes, tab
// switches and data events must not multiply account reads or status reports, and a rate-limit response must back off.
const source = readFileSync('components/account-auto-sync.tsx', 'utf8');
const ast = ts.createSourceFile('client.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let effect;
(function visit(node) { if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect') effect = node.arguments[0].getText(ast); ts.forEachChild(node, visit); })(ast);
assert.ok(effect, 'automatic sync effect found');
const compiled = ts.transpileModule('const run=' + effect + ';run();', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

const values = new Map([['target-lab-trials', '[]']]);
let clock = 1_000_000_000_000;
const TestDate = class extends Date { static now() { return clock; } };
const stats = { reads: 0, reports: 0, statuses: [] };
let readFailure = null;
const remote = { epoch: 'e1', revision: 3, initialized: true, enabled: true, segmented: true, values: { 'target-lab-trials': '[]' }, accountKey: 'k', sections: {}, protectedAccount: true };
const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k) };
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function mount(pathname = '/my-profile') {
  const handlers = new Map();
  const add = (type, fn) => handlers.set(type, [...(handlers.get(type) || []), fn]);
  let timer;
  const doc = { visibilityState: 'visible', addEventListener: add, removeEventListener() {} };
  const win = { dispatchEvent() {}, setInterval(fn) { timer = fn; return 1; }, clearInterval() {}, addEventListener: add, removeEventListener() {} };
  const context = vm.createContext({
    pathname, Date: TestDate, localStorage: storage, document: doc, window: win, Event, Math, JSON, Number, Promise, Error, console,
    navigator: { locks: { request: async (_name, work) => work() } },
    same: sameJson,
    setStatus: value => stats.statuses.push(value), setConflicts() {}, setRefresh() {}, setAccountSyncActivity() {},
    readSyncBase: async () => ({ epoch: 'e1', revision: 3, accountKey: 'k', values: { ...remote.values } }),
    writeSyncBase: async () => {},
    captureAccountValues: () => ({ 'target-lab-trials': values.get('target-lab-trials') }),
    applyAccountValues() {}, validateAccountValues() {}, mergeAccountValues: (_b, local) => ({ values: local, conflicts: [] }),
    accountDataDigest: async () => 'digest-1',
    readAccountState: async () => { stats.reads++; if (readFailure) throw Object.assign(Error('Too many requests. Please wait a minute.'), { status: readFailure }); return { ...remote }; },
    writeAccountState: async () => remote,
    fetch: async (url) => { if (String(url).includes('/devices')) stats.reports++; return { ok: true, json: async () => ({}) }; },
  });
  vm.runInContext(compiled, context);
  const fire = type => Promise.all((handlers.get(type) || []).map(fn => fn()));
  return { tick: () => timer(), fire, doc };
}
const settle = async () => { for (let i = 0; i < 30; i++) await new Promise(resolve => setTimeout(resolve, 1)); };
const snapshot = () => ({ reads: stats.reads, reports: stats.reports });

// First mount checks the account once and reports once.
let page = mount('/');
await settle();
assert.deepEqual(snapshot(), { reads: 1, reports: 1 }, 'first mount performs one check and one heartbeat');

// Client navigation, refresh and other tabs re-mount the effect: no additional reads or reports inside the interval.
for (const path of ['/shootout', '/music-library', '/my-data', '/']) { clock += 2000; page = mount(path); await settle(); }
assert.deepEqual(snapshot(), { reads: 1, reports: 1 }, 'page changes and reloads reuse the shared last-check time');

// Focus, tab visibility and data events are passive while the interval has not elapsed.
for (let i = 0; i < 5; i++) { clock += 1000; await page.fire('focus'); await page.fire('visibilitychange'); await page.fire('yinyang-data-changed'); page.tick(); }
await settle();
assert.deepEqual(snapshot(), { reads: 1, reports: 1 }, 'focus, visibility, data events and timer ticks do not force reads');

// After the interval, returning to the tab checks once; an unchanged state is not re-reported within the heartbeat window.
clock += 31_000; await page.fire('focus'); await settle();
assert.equal(stats.reads, 2, 'a check runs once the interval has elapsed');
assert.equal(stats.reports, 1, 'identical state is not reported again inside the heartbeat window');
await page.fire('focus'); await page.fire('visibilitychange'); await settle();
assert.equal(stats.reads, 2, 'repeated focus after a check does not read again');

// The heartbeat still refreshes before the two-minute "synced" freshness window ends.
clock += 31_000; page.tick(); await settle();
assert.equal(stats.reads, 3);
assert.equal(stats.reports, 2, 'heartbeat is sent at least once a minute during active checks');

// A local edit is uploaded promptly instead of waiting for the interval.
values.set('target-lab-trials', '[{"id":"edit"}]');
const beforeEdit = stats.reads; page.tick(); await settle();
assert.equal(stats.reads, beforeEdit + 1, 'local edits bypass the check interval');
values.set('target-lab-trials', '[]');

// Rate limiting: one quiet wait, no extra report, and no retry from focus, visibility, navigation or reloads.
clock += 31_000; readFailure = 429; stats.statuses.length = 0;
const reportsBefore = stats.reports; page.tick(); await settle();
const readsAtLimit = stats.reads;
assert.match(stats.statuses.at(-1), /waiting a minute/i, 'rate limit shows a calm wait message');
assert.equal(stats.reports, reportsBefore, 'a rate-limit response sends no additional report');
for (let i = 0; i < 3; i++) { clock += 5000; await page.fire('focus'); await page.fire('visibilitychange'); page.tick(); mount('/shootout'); await settle(); }
assert.equal(stats.reads, readsAtLimit, 'passive events and remounts respect the backoff');
readFailure = null; clock += 70_000; page.tick(); await settle();
assert.equal(stats.reads, readsAtLimit + 1, 'sync resumes automatically after the wait');
assert.match(stats.statuses.at(-1), /matches the account/, 'status recovers after the wait');

// An explicit permission change is the only event that bypasses timing.
const explicitBefore = stats.reads; await page.fire('yinyang-sync-permission-changed'); await settle();
assert.equal(stats.reads, explicitBefore + 1, 'explicit permission changes check immediately');

// Timing hints are device-local browser data: never copied into the account or merged between devices.
const { ACCOUNT_SYNC_KEYS } = await import('../lib/account-sync.mjs');
for (const key of ['yinyang-account-sync-last-poll', 'yinyang-account-sync-last-report', 'yinyang-account-sync-retry-at']) assert.equal(ACCOUNT_SYNC_KEYS.includes(key), false, key + ' is not account-synced');

console.log('Account sync frequency checks passed: shared check interval, passive focus/visibility/navigation, heartbeat dedupe, calm rate-limit backoff and local-only timing hints.');
