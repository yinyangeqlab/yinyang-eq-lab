import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Run the real vote route against a controlled database, never production votes.
const source = readFileSync(new URL("../app/api/votes/route.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const voterId = "11111111-1111-4111-8111-111111111111";
const trialId = "22222222-2222-4222-8222-222222222222";
const schema = Object.fromEntries(["votes", "rankedTrials", "targets", "rankedPairClaims", "listeningRuns", "comparisonRecords"].map(table => [table, new Proxy({ table }, { get: (target, key) => target[key] ?? key })]));
async function submit({ recentCount = 0, gate = false, used = false, prior = false, age = 11000, heard = 6, result, checks = [] } = {}) {
  let batches = 0; let savedVote;
  let targetRead = 0;
  const db = {
    select(fields) {
      let table;
      const query = {
        from(value) { table = value; return query; }, get: async()=>({id:"run",voterId,testMode:"blind",headphoneType:"ie",targetAId:"a",targetBId:"b",result:"a",protocolVersion:"matched-passage-v2",intervals:"[]",researchContext:"{}"}), where() { return query; }, orderBy() { return query; }, limit() { return query; },
        then(resolve, reject) {
          let rows;
          if (table === schema.listeningRuns) rows = checks;
          else if (table === schema.rankedTrials) rows = [{ id: trialId, voterId, testMode: "blind", sideA: "a", sideB: "b", protocolVersion:"matched-passage-v2",issuedAt: Date.now() - age }];
          else if (table === schema.targets) rows = [{ id: targetRead++ ? "b" : "a", name: "Target", rating: 1500, wins: 0, losses: 0, status: "approved" }];
          else if (fields?.otherReason) rows = Array.from({ length: recentCount }, () => ({ createdAt: Date.now() - 1000, otherReason: "" }));
          else if (fields?.id) rows = used ? [{ id: trialId }] : [];
          else rows = prior ? [{ id: "previous" }] : [];
          return Promise.resolve(rows).then(resolve, reject);
        },
      };
      return query;
    },
    insert(table) { return { values: value => { if(table===schema.votes)savedVote = value; return value; } }; },
    update() { return { set: () => ({ where() {} }) }; },
    async batch() { batches++; },
  };
  const imports = {"@/lib/public-targets":{publicTargetPredicate:{}},
    "@/lib/listening-protocol":{LISTENING_PROTOCOL:"matched-passage-v2"},
    "cloudflare:workers":{env:{DB:{prepare:()=>({bind:()=>({first:async()=>({subject_id:"test-account"})})})}}},
    "@/lib/submission-ownership": { submissionContext: async () => ({subjectId:"test-account",shareMusic:true,requireTrial:async()=>{},record:()=>({})}) },
    "@/lib/active-submissions": { activeSubmissions: async () => (kind,id) => id !== "removed-check" },
    "drizzle-orm": Object.fromEntries(["and", "desc", "eq", "gte", "or"].map(name => [name, (...args) => ({ name, args })])),
    "@/db": { getDb: () => db }, "@/db/schema": schema,
    "@/lib/preference-ranking": { checkReliability: (correct, total) => ({ mean: (correct + 2) / (total + 4) }) },
    "@/lib/listening": { parseIntervals: value => value, intervalStats: () => ({heardA:6,heardB:6,overlapSeconds:6}) },
    "@/lib/feedback": { cleanFeedback: () => ({ otherReason: "", reasonSide: "a", reasonTags: [] }) },
    "@/lib/target-type": { targetHeadphoneType: () => "ie" },
    "@/lib/request-json": { readJsonObject: request => request.json(), requestInputResponse: () => null },
    "@/lib/public-write-gate": { publicWriteGate: async () => gate ? Response.json({ error: "Submission limit reached." }, { status: 429 }) : null },
  };
  const context = vm.createContext({ exports: {}, require: name => { assert.ok(imports[name], name); return imports[name]; }, Response, Date });
  vm.runInContext(code, context);
  const response = await context.exports.POST(new Request("https://example.test/api/votes", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ winnerId: "a", loserId: "b", voterId, trialId, testMode: "blind", headphoneType: "ie", result, heardA: heard, heardB: heard, intervals: [] }),
  }));
  return { status: response.status, batches, ...(checks.length ? { reliabilityWeight: savedVote?.reliabilityWeight } : {}) };
}
for (const recentCount of [0, 6, 50, 60]) {
  assert.deepEqual(await submit({ recentCount }), { status: 200, batches: 1 }, `${recentCount} recent votes must not block a valid new pairing`);
}
assert.deepEqual(await submit({ prior: true }), { status: 200, batches: 1 }, "A new trial of a repeated pair must count");
for (const [options, status] of [[{ gate: true }, 429], [{ used: true }, 409], [{ age: 9000 }, 403], [{ heard: 4 }, 400], [{ result: "tie" }, 400]]) {
  assert.deepEqual(await submit(options), { status, batches: 0 });
}
const checked = await submit({checks:Array.from({length:12},()=>({trialId:'issued',testMode:'blind',heardA:6,heardB:6,result:'tie'}))});
assert.equal(checked.status,200); assert.equal(checked.reliabilityWeight,1,'Checks do not weight preferences');
console.log("Vote route accepts the seventh and 51st votes; shared throttling, replay protection, repeated pairs, undecided exclusion, and listening requirements remain enforced.");

const removedCheck = await submit({checks:[{id:'removed-check',trialId:'issued',testMode:'blind',heardA:6,heardB:6,result:'tie'}]});
assert.equal(removedCheck.reliabilityWeight,1,'Removed checks cannot calibrate future votes');
