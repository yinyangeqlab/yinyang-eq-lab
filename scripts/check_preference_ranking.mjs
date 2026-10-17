import assert from 'node:assert/strict';
import { rankPreferences, listenerReliability, checkReliability } from '../lib/preference-ranking.ts';
const targets = ['a','b','c'].map(id => ({ id, name: id, creator: 'Test' }));
const vote = (i, voter = `browser-${i}`, winner = 'a', loser = 'b') => ({id:`vote-${i}`,voterId:voter,winnerId:winner,loserId:loser});
const get = (rank,id='a') => rank.rows.find(row => row.id === id);
assert.equal(rankPreferences(targets, []).voteCount,0);
const one = rankPreferences(targets,[vote(0)]);
const many = rankPreferences(targets,Array.from({length:100},(_,i)=>vote(i)));
assert.ok(get(many).sd < get(one).sd, 'Independent evidence narrows model SD');
assert.ok(get(many).rating > get(one).rating);
assert.ok(get(many).lower > get(one).lower);
const repeats = rankPreferences(targets,Array.from({length:1000},(_,i)=>vote(i,'same-browser')));
assert.equal(repeats.voteCount,1000,'Every decisive repeat is counted');
assert.ok(get(repeats).effectiveComparisons < 1.001,'Repeated evidence saturates at declared cluster weight');
assert.ok(get(repeats).sd > get(many).sd,'One browser cannot claim the certainty of many independent browsers');
const changed = [vote(1,'same-browser'), vote(2,'same-browser','b','a')];
const balanced = rankPreferences(targets,changed);
assert.ok(Math.abs(get(balanced).rating-1500)<1e-7,'Changed votes contribute symmetrically');
assert.equal(get(balanced).wins,1); assert.equal(get(balanced).losses,1);
assert.deepEqual(rankPreferences(targets,[...changed].reverse()), balanced,'Order does not change ranking');
assert.deepEqual(rankPreferences(targets,[...changed,{...vote(3), result:'tie'},{...vote(4), loserId:'a'}]),balanced,'Unknown answers and identical-target checks leave rating and SD unchanged');
assert.deepEqual(rankPreferences(targets,[...changed,changed[0]]), balanced, 'Duplicate IDs cannot add evidence');
const good=listenerReliability(Array.from({length:20},()=>({voterId:'same-browser',result:'tie'})));
const poor=listenerReliability(Array.from({length:20},()=>({voterId:'same-browser',result:'a'})));
assert.ok(good.get('same-browser').mean>poor.get('same-browser').mean);
assert.ok(checkReliability(20,20).sd<checkReliability(1,1).sd);
assert.ok(get(rankPreferences(targets,[{...vote(1,'same-browser'),reliabilityWeight:good.get('same-browser').mean}])).rating>get(rankPreferences(targets,[{...vote(1,'same-browser'),reliabilityWeight:poor.get('same-browser').mean}])).rating,'Check reliability affects influence');
// A disconnected target never becomes precise merely because another pair has many tests.
const disconnected = rankPreferences(targets,[...Array.from({length:100},(_,i)=>vote(i)),vote(101,'new','c','b')]);
assert.ok(get(disconnected,'c').sd>get(disconnected,'a').sd);
for (const row of [...one.rows,...many.rows,...repeats.rows,...disconnected.rows]) {
 for (const key of ['rating','sd','lower','upper']) assert.ok(Number.isFinite(row[key]),key);
 assert.ok(row.sd>0&&row.sd<=350.000001); assert.ok(row.lower<row.upper);
}
console.log('Preference model: repeat/reversal counting, order invariance, uncertainty reduction, correlation cap, check reliability, tie/check exclusion, and finite sparse estimates pass.');
