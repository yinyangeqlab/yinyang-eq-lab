import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Minimal browser globals: storage, events and the root element the shell marks for reduced motion.
const store = new Map();
let storageBroken = false;
globalThis.localStorage = {
  getItem: key => { if (storageBroken) throw Error('denied'); return store.has(key) ? store.get(key) : null; },
  setItem: (key, value) => { if (storageBroken) throw Error('denied'); store.set(key, String(value)); },
};
const listeners = new Map();
globalThis.window = {
  addEventListener: (type, fn) => listeners.set(type, [...(listeners.get(type) || []), fn]),
  removeEventListener: (type, fn) => listeners.set(type, (listeners.get(type) || []).filter(item => item !== fn)),
  dispatchEvent: event => { for (const fn of listeners.get(event.type) || []) fn(event); return true; },
};
globalThis.document = { documentElement: { dataset: {} } };

const prefs = await import('../lib/display-preferences.ts');
const KEY = 'yinyang-display-preferences';

assert.deepEqual(prefs.readDisplayPreferences(), { motion: 'auto', singleKeyShortcuts: true }, 'defaults keep motion and shortcuts on');
store.set(KEY, '{not json');
assert.deepEqual(prefs.readDisplayPreferences(), { motion: 'auto', singleKeyShortcuts: true }, 'corrupt storage falls back to defaults');
store.set(KEY, JSON.stringify({ motion: 'sideways', singleKeyShortcuts: 'no' }));
assert.deepEqual(prefs.readDisplayPreferences(), { motion: 'auto', singleKeyShortcuts: true }, 'unknown values never disable features');
store.delete(KEY);

let notified = 0;
const stop = prefs.subscribeDisplayPreferences(() => notified++);
prefs.writeDisplayPreferences({ motion: 'reduced' });
assert.equal(document.documentElement.dataset.motion, 'reduced', 'pausing motion marks the root element');
assert.deepEqual(JSON.parse(store.get(KEY)), { motion: 'reduced', singleKeyShortcuts: true }, 'writes merge with existing choices');
prefs.writeDisplayPreferences({ singleKeyShortcuts: false });
assert.deepEqual(prefs.readDisplayPreferences(), { motion: 'reduced', singleKeyShortcuts: false }, 'second choice keeps the first');
prefs.writeDisplayPreferences({ motion: 'auto' });
assert.equal('motion' in document.documentElement.dataset, false, 'resuming motion removes the root marker');
assert.equal(notified, 3, 'each write notifies subscribers in this tab');
stop();
prefs.writeDisplayPreferences({ motion: 'auto' });
assert.equal(notified, 3, 'unsubscribed listeners are not called');

storageBroken = true;
assert.doesNotThrow(() => prefs.writeDisplayPreferences({ motion: 'reduced' }), 'unavailable storage never breaks the page');
assert.equal(document.documentElement.dataset.motion, 'reduced', 'the current page still applies the choice without storage');
storageBroken = false;

// Display preferences are per-browser: they must not enter account Sync.
const { ACCOUNT_SYNC_KEYS } = await import('../lib/account-sync.mjs');
assert.equal(ACCOUNT_SYNC_KEYS.includes(KEY), false, 'display preferences are excluded from account Sync');

// The playback handler only suppresses letter/number shortcuts; Space and arrows are handled before the check.
const panel = readFileSync(new URL('../components/music-panel.tsx', import.meta.url), 'utf8');
const handler = panel.slice(panel.indexOf('const handlePlaybackShortcut'), panel.indexOf('event.preventDefault(); event.stopPropagation();', panel.indexOf('const handlePlaybackShortcut')));
assert.match(handler, /if \(side !== null && !readDisplayPreferences\(\)\.singleKeyShortcuts\) return;/, 'letter/number shortcuts honor the preference');
assert.ok(handler.indexOf('toggleWithSpace(event); return;') < handler.indexOf('singleKeyShortcuts'), 'Space playback is unaffected by the preference');

console.log('Display preference checks passed.');
