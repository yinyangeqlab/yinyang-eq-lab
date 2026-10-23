// Run with: node --experimental-strip-types scripts/check_embed_shootout.mjs (strip-types is built in on newer Node).
import assert from 'node:assert/strict';
import {
  BAND_HZ, EmbedInputError, cleanTitle, curveBands, hashManageKey, newManageKey, newShootoutId, parseRun, planRounds, playbackTrims,
  summarize, wilson, SHOOTOUT_ID_PATTERN, MANAGE_KEY_PATTERN,
} from '../lib/embed-shootout.ts';
import { renderShootoutCard, encodePng } from '../lib/embed-card.ts';

// Round plans: every pair once; two targets repeat on all three sounds.
assert.deepEqual(planRounds(2).map(r => [r.a, r.b, r.signal]), [[0, 1, 'noise'], [0, 1, 'pad'], [0, 1, 'beat']]);
assert.equal(planRounds(3).length, 3); assert.equal(planRounds(4).length, 6);
assert.equal(new Set(planRounds(4).map(r => `${r.a}-${r.b}`)).size, 6);
for (const n of [0, 1, 5, 2.5, NaN]) assert.throws(() => planRounds(n));

// Ids and keys.
for (let i = 0; i < 50; i++) { assert.match(newShootoutId(), SHOOTOUT_ID_PATTERN); assert.match(newManageKey(), MANAGE_KEY_PATTERN); }
assert.notEqual(newManageKey(), newManageKey());
assert.equal(await hashManageKey('a'), await hashManageKey('a')); assert.notEqual(await hashManageKey('a'), await hashManageKey('b'));
assert.equal(cleanTitle('  <b>Hi</b>\n there  '), 'b Hi /b there'); assert.equal(cleanTitle(''), 'Blind shootout'); assert.equal(cleanTitle('x'.repeat(200)).length, 80);

// Run validation.
const good = (n, winner = 'a') => ({ picks: planRounds(n).map((_, round) => ({ round, winner, flipped: round % 2 === 0, signal: 'noise' })), kind: 'iem', sighted: false });
const parsed = parseRun(2, good(2));
assert.equal(parsed.picks.length, 3); assert.deepEqual(parsed.picks[0], [0, 1, 0, 1, 0]); assert.equal(parsed.kind, 'iem');
const bad = (mutate) => { const body = good(3); mutate(body); assert.throws(() => parseRun(3, body), EmbedInputError); };
bad(b => b.picks.pop()); bad(b => b.picks.push(b.picks[0])); bad(b => { b.picks[1].round = 0; }); bad(b => { b.picks[0].winner = 'c'; });
bad(b => { b.picks[0].flipped = 'yes'; }); bad(b => { b.picks[0].signal = 'live'; }); bad(b => { b.kind = 'robot'; }); bad(b => { b.picks[0].round = 9; }); bad(b => { b.picks = 'x'; }); bad(b => { b.picks[0] = null; });
assert.equal(parseRun(3, { ...good(3), kind: undefined }).kind, 'unknown');
assert.equal(parseRun(3, { ...good(3), sighted: 'true' }).sighted, false, 'only a real boolean marks a sighted run');

// Statistics, hand computed. Three targets, two blind runs and one sighted run.
//  run1: 0>1, 0>2, 1=2  -> T0 2.0, T1 0.5, T2 0.5 (favourite T0)
//  run2: 1>0, 2>0, 1>2  -> T1 2.0, T2 1.0, T0 0.0 (favourite T1)
const run = (picks, extra = {}) => ({ hour: 480000, kind: 'headphones', sighted: false, picks, ...extra });
const rows = [
  run([[0, 1, 0, 0, 0], [0, 2, 0, 1, 1], [1, 2, 2, 0, 2]]),
  run([[0, 1, 1, 0, 0], [0, 2, 1, 0, 1], [1, 2, 0, 1, 2]], { kind: 'iem', hour: 480030 }),
  run([[0, 1, 0, 0, 0], [0, 2, 0, 0, 1], [1, 2, 0, 0, 2]], { sighted: true }),
];
const s = summarize(3, rows);
assert.equal(s.runs, 2); assert.equal(s.sightedRuns, 1); assert.equal(s.decided, 5);
assert.deepEqual(s.targets.map(t => [t.wins, t.losses, t.ties, t.comparisons]), [[2, 2, 0, 4], [2, 1, 1, 4], [1, 2, 1, 4]]);
assert.deepEqual(s.targets.map(t => t.score), [0.5, 0.625, 0.375]);
assert.deepEqual(s.targets.map(t => t.favorite), [1, 1, 0]);
for (const t of s.targets) { assert.ok(t.low <= t.score && t.score <= t.high && t.low >= 0 && t.high <= 1); }
assert.deepEqual(s.pairs.map(p => [p.a, p.b, p.aWins, p.bWins, p.ties]), [[0, 1, 1, 1, 0], [0, 2, 1, 1, 0], [1, 2, 1, 0, 1]]);
assert.equal(s.repeatAgreement, null);
// Position bias: run1 picks shown first: r1 (flip 0, a wins) yes; r2 (flip 1, a wins) no. run2: r1 b wins flip 0 no; r2 b wins flip 0 no; r3 a wins flip 1 no.
assert.deepEqual(s.sideBias, { decided: 5, pickedFirstShown: 1 });
assert.deepEqual(s.byKind.headphones.scores, [2, 0.5, 0.5]); assert.equal(s.byKind.iem.runs, 1);
assert.equal(s.bySignal.noise.runs, 2); assert.deepEqual(s.timeline, [{ day: 20000, runs: 1 }, { day: 20001, runs: 1 }]);
// Sighted runs never move a score.
assert.deepEqual(summarize(3, rows.slice(0, 2)).targets, s.targets);
// Consistency for two targets.
const two = summarize(2, [run([[0, 1, 0, 0, 0], [0, 1, 0, 1, 1], [0, 1, 0, 0, 2]]), run([[0, 1, 0, 0, 0], [0, 1, 1, 0, 1], [0, 1, 2, 0, 2]])]);
assert.deepEqual(two.repeatAgreement, { agree: 1, total: 2 });
assert.equal(summarize(2, []).runs, 0); assert.equal(summarize(2, []).targets[0].score, 0);
assert.deepEqual(wilson(0, 0), [0, 1]);
const [lo, hi] = wilson(50, 100); assert.ok(lo > 0.39 && lo < 0.41 && hi > 0.59 && hi < 0.61);

// Curves: normalised at 1 kHz, resampled to bands, clamped, tolerant of unsorted input.
const slope = [[20, 10], [1000, 0], [20000, -10]];
const bands = curveBands(slope.slice().reverse());
assert.equal(bands.length, BAND_HZ.length); assert.equal(bands[BAND_HZ.indexOf(1000)], 0);
assert.ok(bands[0] > 5 && bands.at(-1) < -5); assert.ok(bands.every((v, i) => i === 0 || v <= bands[i - 1] + 1e-9));
assert.equal(Math.max(...curveBands([[20, 500], [1000, 0], [20000, 0]])), 24);
assert.throws(() => curveBands([[1000, 0]]));

// Loudness matching: equal mean band power afterwards and no clipping headroom lost.
const flat = new Array(BAND_HZ.length).fill(0), bass = flat.map((_, i) => (i < 6 ? 8 : 0)), bright = flat.map((_, i) => (i > 20 ? 6 : 0));
const trims = playbackTrims([flat, bass, bright]);
const meanPower = (curve, trim) => { const lo = BAND_HZ.indexOf(125), hi = BAND_HZ.indexOf(8000); return 10 * Math.log10(curve.slice(lo, hi + 1).reduce((x, db) => x + 10 ** (db / 10), 0) / (hi - lo + 1)) + trim; };
const levels = [flat, bass, bright].map((curve, i) => meanPower(curve, trims[i]));
assert.ok(Math.max(...levels) - Math.min(...levels) < 0.02, JSON.stringify(levels));
assert.ok(Math.max(...[flat, bass, bright].map((curve, i) => Math.max(...curve) + trims[i])) <= -1 + 1e-6, 'no curve may exceed -1 dB after trimming');
assert.ok(trims.every(t => t <= 0));

// Preview card: a real PNG of the documented size, stable for an id, different between ids.
const png = await renderShootoutCard('k7m2q9xwab', 2), again = await renderShootoutCard('k7m2q9xwab', 2), other = await renderShootoutCard('h3v8nrt5cd', 4);
assert.deepEqual([...png.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
const view = new DataView(png.buffer, png.byteOffset); assert.equal(view.getUint32(16), 1200); assert.equal(view.getUint32(20), 630);
assert.ok(png.length > 50_000 && png.length < 1_500_000, `card size ${png.length}`);
assert.deepEqual(png, again); assert.notDeepEqual(png, other);
// The encoder round-trips pixels (checked through inflate of the IDAT stream).
const tiny = await encodePng(new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 9, 8, 7]), 2, 2);
const idat = (() => { let o = 8; while (o < tiny.length) { const len = new DataView(tiny.buffer, tiny.byteOffset).getUint32(o), type = String.fromCharCode(...tiny.slice(o + 4, o + 8)); if (type === 'IDAT') return tiny.slice(o + 8, o + 8 + len); o += 12 + len; } })();
const raw = new Uint8Array(await new Response(new Blob([idat]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
// Row 0: (255,0,0),(0,255,0); row 1: (0,0,255),(9,8,7). Sub filter subtracts the previous pixel, modulo 256.
assert.deepEqual([...raw], [1, 255, 0, 0, 1, 255, 0, 1, 0, 0, 255, 9, 8, 8]);
console.log('PASS embedded shootout: round plans, validation, statistics, curve bands, loudness matching and PNG card.');
