import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";

// Execute the shipped handlers with controlled API responses, without writing votes
// to production or depending on a browser's audio hardware.
const source = readFileSync(new URL("../app/shootout/page.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = new Map();
let finishVisibility;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name) handlers.set(node.name.text, node.getText(ast));
  if (ts.isJsxExpression(node) && node.getText(ast).includes("Finish &amp; see results")) {
    // Extract the condition actually guarding the results button.
    const expression = node.expression;
    if (expression && ts.isBinaryExpression(expression)) finishVisibility = expression.left.getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(finishVisibility, "Results button must exist");
const code = ts.transpileModule(["vote", "saveTrial", "finishBlindTest"].map(name => handlers.get(name)).join("\n"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
function harness({ mode = "blind", voteStatus = 200, runStatus = 201, failure,passageRequired=true,sharedAdmin=false } = {}) {
  const stored = new Map();
  const calls = [];
  const state = {
    sharedAdmin,saveAdminTestRecord(){},passageRequired,pair: ["a", "b"], busy: false, revealed: false, sessionExpired: false, sessionFinished: false,
    trialId: "trial", testMode: mode, headphoneType: "ie", sessionId: "session", trials: [],
    selectedMeasurement: { points: [[20, 0], [20000, 0]] },
    allTargets: [{ id: "a", name: "Alpha", status: "approved", points: [[20, 1]] }, { id: "b", name: "Beta", status: "approved", points: [[20, 2]] }],
    requireMeasurement: () => true, touchBlind() {}, browserVoterId: () => "voter", openFeedbackId: () => "feedback",
    voteDataAccepted:true, setReviewVoteData:value=>{state.reviewVoteData=value;}, submissionsEnabled: true, openFeedbackId: () => "local-open-id", VOTE_DATA_NOTICE_VERSION: "test", crypto: webcrypto,
    curveVersion:async points=>JSON.stringify(points),
    fitAutoEq: (_measurement, points) => ({ filters: [{ hz: 100, q: 1, gain: points[0][1] }], rms: 1, preamp: -1 }),
    musicPanelRef: { current: { heard: () => [6, 6], snapshot:()=>({overlapSeconds:6}), isHashing: () => false, finish: () => ({ heardA: 6, heardB: 6, intervals: [] }), stop() {} } },
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
    setTrials: update => { state.trials = typeof update === "function" ? update(state.trials) : update; },
    setRevealed: value => { state.revealed = value; }, setBusy: value => { state.busy = value; },
    setMessage: value => { state.message = value; }, setSessionFinished: value => { state.sessionFinished = value; },
    setPair: value => { state.pair = value; }, setTab: value => { state.tab = value; }, refresh: async () => {},
    fetch: async url => {
      calls.push(url);
      // The answer must already be visible and stored while either write is pending.
      assert.equal(state.revealed, true);
      assert.equal(state.trials.length, 1);
      if (failure === url) throw new Error("Offline");
      const status = url === "/api/votes" ? voteStatus : runStatus;
      return { ok: status < 400, json: async () => {
        if (failure === "json" && url === "/api/votes") throw new SyntaxError("Invalid JSON");
        return { error: status === 429 ? "Submission limit reached. Please try again later." : "Submission failed." };
      } };
    },
  };
  const context = vm.createContext(state);
  vm.runInContext(code, context);
  return { state, context, stored, calls };
}
for (const mode of ["blind", "bring"]) {
  for (const scenario of [{}, { voteStatus: 429 }, { voteStatus: 409 }, { voteStatus: 500 }, { failure: "/api/votes" }, { failure: "json" }, { runStatus: 500 }, { failure: "/api/listening-runs" }]) {
    const { state, context, stored } = harness({ mode, ...scenario });
    await vm.runInContext("vote(0)", context);
    assert.equal(state.revealed, true, JSON.stringify(scenario));
    assert.equal(state.busy, false);
    assert.equal(state.trials.length, 1, "A completed answer must be saved exactly once");
    assert.equal(state.trials[0].recorded, Object.keys(scenario).length === 0);
    assert.equal(JSON.parse(stored.get("target-lab-trials")).length, 1);
    assert.equal(state.trials[0].sessionId, "session");
    if (Object.keys(scenario).length) assert.match(state.message, /saved to My results/);
  }
}
// Reproduce a seventh result after six ranked submissions, and finishing from
// the next unanswered pairing. Previous trials must remain in the same session.
const seventh = harness({ voteStatus: 429 });
const previous = Array.from({ length: 6 }, (_, index) => ({ id: `old-${index}`, sessionId: "session", recorded: true, mode: "blind", pair: ["other-a", "other-b"] }));
seventh.state.trials = previous;
seventh.state.fetch = async url => ({ ok: url !== "/api/votes", json: async () => ({ error: "Submission limit reached." }) });
await vm.runInContext("vote(1)", seventh.context);
assert.equal(seventh.state.trials.length, 7);
assert.equal(seventh.state.revealed, true);
assert.equal(seventh.state.trials[6].recorded, false);
seventh.state.sessionTrials = seventh.state.trials;
seventh.state.revealed = false;
assert.equal(vm.runInContext(finishVisibility, seventh.context), true, "Results stay available on the next pairing");
vm.runInContext("finishBlindTest()", seventh.context);
assert.equal(seventh.state.sessionFinished, true);
assert.equal(seventh.state.pair, null);
for (const choice of [0, 1, 2]) {
  const { state, context } = harness();
  await vm.runInContext(`vote(${choice})`, context);
  assert.equal(state.revealed, true);
  assert.equal(state.trials[0].result, ["a", "b", "tie"][choice]);
}
const repeat = harness();
repeat.state.trials = [{ id: 'earlier', mode: 'blind', pair: ['a','b'], recorded: true, winnerId: 'a' }];
const repeatCalls = [];
repeat.state.fetch = async url => { repeatCalls.push(url); return { ok: true, json: async () => ({ok:true}) }; };
await vm.runInContext('vote(1)', repeat.context);
assert.ok(repeatCalls.includes('/api/votes'), 'A changed preference on a repeated pair must reach the ranking API');
assert.equal(repeat.state.trials.length, 2);
assert.equal(repeat.state.trials[1].recorded, true);
assert.equal(repeat.state.trials[1].winnerId, 'b');
const locked = harness();
locked.state.musicPanelRef.current.heard = () => [4, 6];
await vm.runInContext("vote(0)", locked.context);
assert.equal(locked.state.revealed, false, "Listening requirement remains enforced");
assert.equal(locked.state.trials.length, 0);
console.log("Blind completion verified: seventh-vote rate limit, failed writes, A/B/tie reveals, single saved answer, listening gate, and results on the next pairing.");

const archived = harness();
archived.stored.set("target-lab-trials", JSON.stringify([{id:"archived",recorded:false}]));
vm.runInContext('saveTrial({id:"new",recorded:false})', archived.context);
assert.deepEqual(JSON.parse(archived.stored.get("target-lab-trials")).map(row=>row.id), ["archived","new"]);
console.log("New trial saves preserve archived browser records for restoration.");

const practice = harness({mode:"open"}); practice.state.submissionsEnabled = false;
await vm.runInContext('vote(0)',practice.context);
assert.equal(practice.calls.length,0,"Paused local comparisons must not make server submissions");
assert.equal(practice.state.trials.length,0,"Unagreed users cannot use local-only comparison");
assert.equal(practice.state.reviewVoteData,true);

const privateOpen=harness({mode:"open"});privateOpen.state.allTargets[1].status="private";
await vm.runInContext("vote(0)",privateOpen.context);
assert.equal(privateOpen.state.trials.length,1);assert.equal(privateOpen.state.revealed,true);
assert.equal(privateOpen.calls.length,0,"Private-target Open choices never make a network submission");
assert.match(privateOpen.state.message,/only to My results/);
console.log("Private-target Open comparison remains local without a research API call.");

for(const mode of ["blind","bring","open"]){for(const seconds of [0,6]){const free=harness({mode,passageRequired:false});free.state.musicPanelRef.current.heard=()=>[seconds,seconds];free.state.musicPanelRef.current.snapshot=()=>({overlapSeconds:seconds});free.state.musicPanelRef.current.finish=()=>({heardA:seconds,heardB:seconds,overlapSeconds:seconds,intervals:[]});free.state.trialId=null;await vm.runInContext("vote(0)",free.context);assert.equal(free.calls.length,0,"unchecked comparisons never submit, even with matched evidence");assert.equal(free.state.trials.length,1);assert.equal(free.state.trials[0].matchedPassageRequired,false);assert.equal(free.state.trials[0].matchedPassage,seconds>=5);assert.match(free.state.message,/saved only/);}}
console.log("PASS all free-listening modes remain local at zero or qualifying matched seconds.");

for(const mode of ["blind","bring","open"]){const h=harness({mode,sharedAdmin:true});h.state.trialId=null;await vm.runInContext("vote(0)",h.context);assert.equal(h.calls.length,0);assert.equal(h.state.trials.length,1);assert.equal(h.state.trials[0].adminTestOnly,true);assert.equal(h.state.trials[0].recorded,false);}
console.log("PASS admin comparisons in every mode remain private even with matched listening and no server trial.");
