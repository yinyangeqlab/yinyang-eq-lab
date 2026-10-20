/** Offline design validation only. Not a live ranking, public endpoint or analysis of participant records.
 * Fixed per-listener horizons and complete, truthful randomized sampling probabilities are required.
 * Selection/stopping/nonresponse assumptions are documented in docs/COMMUNITY_PREFERENCE_DESIGN.md.
 */
import assert from 'node:assert/strict';
export function estimateCommunityPreference({catalog,referenceWeights,accounts}) {
  assert.ok(catalog.length>=2&&new Set(catalog).size===catalog.length);
  const k=catalog.length,q=referenceWeights??catalog.map(()=>1/k),pairs=[];
  assert.equal(q.length,k);assert.ok(q.every(w=>Number.isFinite(w)&&w>0&&w<1));assert.ok(Math.abs(q.reduce((a,b)=>a+b,0)-1)<1e-10);
  for(let a=0;a<k;a++)for(let b=a+1;b<k;b++)pairs.push([a,b]);
  assert.ok(accounts.length>0&&new Set(accounts.map(a=>a.id)).size===accounts.length,'Linked devices must be collapsed before analysis');
  const totals=catalog.map(()=>0),naiveWins=catalog.map(()=>0),naiveN=catalog.map(()=>0),listeners=catalog.map(()=>0),vectors=[];
  for(const account of accounts){
    assert.ok(Number.isInteger(account.fixedRounds)&&account.fixedRounds>0);
    assert.equal(account.trials.length,account.fixedRounds,'Incomplete/outcome-stopped blocks require separate missingness analysis');
    const seen=new Set(),values=catalog.map(()=>0),encountered=new Set();
    for(const trial of account.trials){
      assert.ok(trial.id&&!seen.has(trial.id),'A saved result cannot count twice');seen.add(trial.id);
      const p=trial.probabilities;
      assert.ok(Array.isArray(p)&&p.length===pairs.length&&p.every(v=>Number.isFinite(v)&&v>0),'Unknown propensities or zero support cannot be corrected');
      assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-10);
      assert.ok(Number.isInteger(trial.pairIndex)&&trial.pairIndex>=0&&trial.pairIndex<pairs.length);
      assert.ok(['a','b','tie'].includes(trial.result));
      const [a,b]=pairs[trial.pairIndex],s=trial.result==='a'?1:trial.result==='b'?0:.5;
      values[a]+=s*q[b]/((1-q[a])*p[trial.pairIndex]*account.fixedRounds);
      values[b]+=(1-s)*q[a]/((1-q[b])*p[trial.pairIndex]*account.fixedRounds);
      naiveWins[a]+=s;naiveWins[b]+=1-s;naiveN[a]++;naiveN[b]++;encountered.add(a);encountered.add(b);
    }
    for(let i=0;i<k;i++){totals[i]+=values[i];if(encountered.has(i))listeners[i]++;}vectors.push(values);
  }
  // Do not clip estimates outside [0,1]: high variance is a diagnostic, not a reason to hide it.
  return {catalog,score:totals.map(n=>n/accounts.length),naive:naiveWins.map((n,i)=>naiveN[i]?n/naiveN[i]:null),listeners,vectors,accounts:accounts.length,publicReady:false};
}
export function pairList(k){const result=[];for(let a=0;a<k;a++)for(let b=a+1;b<k;b++)result.push([a,b]);return result;}
