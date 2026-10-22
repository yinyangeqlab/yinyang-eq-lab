import assert from 'node:assert/strict';
import { selectedPassageIntervals, selectedPassageProgress } from '../lib/listening.ts';
import { shuffleComparisonPassage } from '../lib/comparison-passage.ts';

// A passage heard completely on both sides must always meet the 5.0 second requirement, whatever its rounded bounds.
const waveform = (phase) => { const make = factor => Array.from({ length: 400 }, (_, i) => factor * (0.3 + 0.5 * Math.abs(Math.sin(i / 9 + phase)))); return { minL: make(-1), maxL: make(1), minR: make(-1), maxR: make(1) }; };
let checked = 0;
for (const duration of [30, 95, 180, 241.3, 312.7]) {
  for (let i = 0; i < 400; i++) {
    const passage = shuffleComparisonPassage(duration, waveform(i / 17), [], 5, Math.random)?.passage;
    if (!passage) continue;
    checked++;
    const rows = [0, 1].map(side => ({ side, start: passage.start, end: passage.end, rate: 1 }));
    const [a, b] = selectedPassageProgress(selectedPassageIntervals(rows, passage));
    assert.ok(a >= 5 && b >= 5, `full passage ${passage.start}-${passage.end} gave ${a}/${b}`);
  }
}
assert.ok(checked > 1000, 'enough real passage positions were exercised');

// Tolerance is tight: genuinely incomplete listening still fails the gate.
const short = [{ side: 0, start: 10, end: 14.99, rate: 1 }, { side: 1, start: 10, end: 15, rate: 1 }];
const [a, b] = selectedPassageProgress(selectedPassageIntervals(short, { start: 10, end: 15 }));
assert.ok(a < 5 && b >= 5, 'a 10ms shortfall is still not enough');
assert.deepEqual(selectedPassageProgress([]), [0, 0]);
console.log(`Passage float-tolerance checks passed (${checked} generated passages).`);
