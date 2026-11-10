import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys=ON");
for (const migration of readdirSync(resolve(root, "drizzle")).filter(name => name.endsWith(".sql")).sort()) {
  db.exec(readFileSync(resolve(root, "drizzle", migration), "utf8"));
}
const prepare = sql => ({
  bind: (...args) => ({
    execute: () => { const statement = db.prepare(sql); return statement.columns().length ? { results: statement.all(...args) } : { meta: { changes: Number(statement.run(...args).changes) } }; },
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  }),
});
const storage = { prepare, batch: async statements => {
  db.exec("BEGIN");
  try {
    const results = statements.map(statement => statement.execute());
    db.exec("COMMIT");
    return results;
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}};
const subjects = {
  a: { subjectId: "browser:synthetic-a", sessionHash: "a".repeat(64) },
  b: { subjectId: "invite:synthetic-b", sessionHash: "b".repeat(64) },
  c: { subjectId: "invite:synthetic-c", sessionHash: "c".repeat(64) },
  layout: { subjectId: "invite:layout-test-only", sessionHash: "f".repeat(64) },
};
for (const user of Object.values(subjects)) {
  db.prepare("INSERT INTO privacy_accounts(subject_id) VALUES (?)").run(user.subjectId);
  db.prepare("INSERT INTO privacy_sessions(token_hash,subject_id,expires_at) VALUES(?,?,?)")
    .run(user.sessionHash, user.subjectId, Date.now() + 3_600_000);
}
let randomSequence = [];
let labelSequence = [];
const randomSource = { subtle: crypto.subtle, getRandomValues(array) {
  if (array instanceof Uint32Array && randomSequence.length) { array.fill(Math.floor(randomSequence.shift() * 2 ** 32)); return array; }
  if (array instanceof Uint8Array && labelSequence.length) { array.set(labelSequence.shift()); return array; }
  return crypto.getRandomValues(array);
} };
const load = (path, dependencies = {}) => {
  const { outputText } = ts.transpileModule(readFileSync(resolve(root, path), "utf8"),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const loadedModule = { exports: {} };
  const require = name => {
    if (!(name in dependencies)) throw Error("Unexpected dependency " + name);
    return dependencies[name];
  };
  new Function("module", "exports", "require", "crypto", outputText)(loadedModule, loadedModule.exports, require, randomSource);
  return loadedModule.exports;
};
const input = load("lib/request-json.ts");
const protocol = load("lib/ear-practice-ranking.ts");
let identity = subjects.a;
let limited = false;
const env = { DB: storage, OWNER_ANALYTICS_TOKEN: "synthetic-owner-token-for-route-testing" };
const dependencies = {
  "cloudflare:workers": { env },
  "@/lib/request-json": input,
  "@/lib/admin-contributions": load("lib/admin-contributions.ts", { "@/lib/request-json": input }),
  "@/lib/ear-practice-ranking": protocol,
  "@/lib/listener-nickname": load("lib/listener-nickname.ts"),
  "@/lib/public-write-gate": { publicWriteGate: async () => limited ? new Response(null, { status: 429 }) : null },
  "@/lib/submission-ownership": { dataIdentity: async () => {
    if (!identity) throw new input.RequestInputError("Sign in.", 401);
    return identity;
  } },
  "@/lib/target-name-policy": load("lib/target-name-policy.ts"),
  "@/lib/owner-access": load("lib/owner-access.ts", { "cloudflare:workers": { env } }),
};
const api = load("app/api/ear-practice/route.ts", dependencies);
const admin = load("app/api/owner-research/ear-practice/route.ts", dependencies);
const url = "https://fixture.invalid";
const request = (method, query = "", body, origin = url) => new Request(url + "/api/ear-practice" + query, {
  method, headers: { Origin: origin, ...(body ? { "Content-Type": "application/json" } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const body = async (promise, status = 200) => {
  const response = await promise;
  const json = await response.json();
  assert.equal(response.status, status, JSON.stringify(json));
  return json;
};
const startBody = (username, revision = 0) => ({ action: "start", id: crypto.randomUUID(), username, revision, consent: protocol.EAR_PRACTICE_CONSENT });
const start = data => body(api.POST(request("POST", "", data)));
const answer = (set, guesses) => body(api.POST(request("POST", "", { action: "answer", id: set.id, guesses })));
const scores = () => body(api.GET(request("GET")));
const my = () => body(api.GET(request("GET", "?mine=1")));
const adminRequest = auth => new Request(url + "/api/owner-research/ear-practice", {
  headers: auth ? { Authorization: "Bearer " + env.OWNER_ANALYTICS_TOKEN } : {},
});

async function analyseAudio(set) {
  const response = await api.GET(request("GET", "?audio=" + set.id));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "audio/wav");
  const bytes = await response.arrayBuffer();
  const wave = new DataView(bytes);
  const rate = wave.getUint32(24, true);
  const frames = wave.getUint32(40, true) / 4;
  const { from, to } = protocol.EAR_PRACTICE_RANGE;
  const duration = protocol.EAR_PRACTICE_SWEEP_SECONDS;
  assert.equal(frames, duration * rate);
  const guesses = [];
  let group = null;
  let neutralSamples = 0;
  for (let index = 0; index + 480 <= frames; index += 480) {
    let reference = 0, mystery = 0;
    for (let at = index; at < index + 480; at++) {
      const a = wave.getInt16(44 + at * 4, true);
      const b = wave.getInt16(46 + at * 4, true);
      reference += a * a;
      mystery += b * b;
      if (a === b) neutralSamples++;
    }
    const db = 10 * Math.log10(mystery / reference);
    const hz = Math.round(from * (to / from) ** ((index + 240) / frames));
    if (Math.abs(db) > .15) {
      if (!group || Math.abs(db) > Math.abs(group.db)) group = { db, hz };
    } else if (group) {
      guesses.push({ kind: group.db > 0 ? "peak" : "dip", hz: group.hz });
      group = null;
    }
  }
  if (group) guesses.push({ kind: group.db > 0 ? "peak" : "dip", hz: group.hz });
  assert.equal(guesses.length, set.count, JSON.stringify(guesses));
  assert(neutralSamples > frames * .1);
  return guesses;
}

assert.equal((await scores()).participants, 0);
identity = subjects.layout;
assert.equal((await my()).canPublish, false);
await body(api.POST(request("POST", "", startBody("PrivateFixture"))), 403);
identity = null;
await body(api.GET(request("GET", "?mine=1")), 401);
assert.equal((await scores()).participants, 0);
identity = subjects.a;
await body(api.POST(request("POST", "", { ...startBody("FixtureAlpha"), consent: "" })), 400);
await body(api.POST(request("POST", "", startBody("FixtureAlpha"), "https://cross-origin.invalid")), 403);
limited = true;
assert.equal((await api.POST(request("POST", "", startBody("FixtureAlpha")))).status, 429);
limited = false;

const starter = startBody("FixtureAlpha");
const [{ set }, { set: repeated }] = await Promise.all([start(starter), start(starter)]);
assert.deepEqual(set, repeated);
assert.deepEqual(Object.keys(set).sort(), ["answer", "count", "id", "stage"]);
assert.equal(set.answer, null);
assert.equal((await my()).set.answer, null);
assert.equal((await scores()).rows[0].attempts, 1);
identity = subjects.b;
await body(api.GET(request("GET", "?audio=" + set.id)), 409);
await body(api.POST(request("POST", "", startBody("fixturealpha"))), 409);
identity = subjects.a;

const deliberateMiss = await answer(set, []);
assert.equal(deliberateMiss.set.answer.correct, false);
assert.equal(deliberateMiss.set.answer.bands.length, 1);
assert.equal((await scores()).rows[0].correct, 0);
const second = (await start(startBody("FixtureAlpha"))).set;
assert.equal(second.stage, 1);
const attack = await analyseAudio(second);
const [win, retry] = await Promise.all([answer(second, attack), answer(second, attack)]);
assert.equal(win.set.answer.correct, true);
assert.deepEqual(win, retry);
assert.deepEqual((await scores()).rows[0], { username: "FixtureAlpha", furthest: 1, correct: 1, attempts: 2, rank: 1, accuracy: win.set.answer.accuracy / 2 });
const third = (await start(startBody("FixtureAlpha"))).set;
assert.equal(third.stage, 2);
assert.equal((await scores()).rows[0].attempts, 3);
assert.deepEqual((await my()).set, third);

const linked = { subjectId: subjects.a.subjectId, sessionHash: "d".repeat(64) };
db.prepare("INSERT INTO privacy_sessions VALUES(?,?,?)").run(linked.sessionHash, linked.subjectId, Date.now() + 3_600_000);
identity = linked;
assert.deepEqual((await my()).set, third);
await body(api.PATCH(request("PATCH", "", { username: "RenamedAlpha" })));
assert.equal((await scores()).rows[0].username, "RenamedAlpha");
assert.equal((await admin.GET(adminRequest(false))).status, 403);
assert.equal((await body(admin.GET(adminRequest(true)))).rows[0].participantId, subjects.a.subjectId);
assert(!JSON.stringify(await scores()).includes("synthetic-a"));

identity = subjects.b;
await start(startBody("FixtureBravo"));
db.prepare("UPDATE ear_practice_scores SET furthest=99,correct=99,attempts=102 WHERE subject_id=?").run(identity.subjectId);
db.prepare("UPDATE ear_practice_sets SET answer='{}' WHERE subject_id=?").run(identity.subjectId);
const hardest = (await start(startBody("FixtureBravo"))).set;
assert.equal(hardest.stage, 100);
assert.equal(hardest.count, 6);
const hardAttack = await analyseAudio(hardest);
const hardWin = await answer(hardest, hardAttack);
assert.equal(hardWin.set.answer.correct, true);
assert.deepEqual(hardWin.set.answer.bands.map(band => band.kind).sort(), ["dip", "dip", "dip", "peak", "peak", "peak"]);
assert(hardWin.set.answer.bands.every(band => Math.abs(band.gain) >= 1.5 && Math.abs(band.gain) <= 3.6 && band.q >= 2.1));
assert([1, 2, 3].includes(hardWin.set.answer.difficulty));
assert.equal((await scores()).rows[0].furthest, 100);
await body(api.POST(request("POST", "", startBody("FixtureBravo"))), 409);

identity = subjects.a;
await body(api.DELETE(request("DELETE")));
assert.equal((await my()).username, null);
assert.equal((await my()).set, null);
assert.equal((await scores()).rows.length, 1);
await body(api.POST(request("POST", "", startBody("RenamedAlpha"))), 409);
db.prepare("DELETE FROM privacy_accounts WHERE subject_id=?").run(subjects.b.subjectId);
assert.equal((await scores()).participants, 0);


const exactBands = () => JSON.parse(db.prepare("SELECT bands FROM ear_practice_sets WHERE subject_id=?").get(identity.subjectId).bands);
const exactGuesses = () => exactBands().map(({ kind, hz }) => ({ kind, hz }));
const resetProfile = () => db.prepare("DELETE FROM ear_practice_profiles WHERE subject_id=?").run(identity.subjectId);
const close = (actual, expected) => assert(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const peak = hz => ({ kind: "peak", hz });
close(protocol.earPracticeLocationAccuracy([peak(1000)], [peak(1000)]), 100);
close(protocol.earPracticeLocationAccuracy([peak(1000 * 2 ** .25)], [peak(1000)]), 75);
close(protocol.earPracticeLocationAccuracy([peak(2000)], [peak(1000)]), 0);
close(protocol.earPracticeLocationAccuracy([peak(4000)], [peak(1000), peak(4000)]), 50);
close(protocol.earPracticeLocationAccuracy([peak(4000), peak(1000)], [peak(1000), peak(4000)]), 100);
close(protocol.earPracticeLocationAccuracy([peak(1000), peak(1000)], [peak(1000), peak(4000)]), 50);
close(protocol.earPracticeLocationAccuracy([], [peak(1000)]), 0);

identity = subjects.c;
assert.equal((await my()).needsConsent, true);
await body(api.POST(request("POST", "", { ...startBody("FixtureCharlie"), consent: "ear-practice-public-v1" })), 400);
const concurrent = await Promise.all([start(startBody("FixtureCharlie")), start(startBody("FixtureCharlie"))]);
assert.equal(concurrent[0].set.id, concurrent[1].set.id);
assert.equal((await scores()).rows[0].attempts, 1);
assert.equal((await my()).needsConsent, false);
const cSet = concurrent[0].set;
assert.deepEqual(Object.keys(cSet).sort(), ["answer", "count", "id", "stage"]);
assert.equal((await start(startBody("DifferentNameIgnored"))).set.id, cSet.id);
const cExact = await answer(cSet, exactGuesses());
assert.equal(cExact.set.answer.correct, true);
close(cExact.set.answer.accuracy, 100);
assert([1, 2, 3].includes(cExact.set.answer.difficulty));
await answer(cSet, []);
close((await scores()).rows[0].accuracy, 100);
assert.equal((await scores()).rows[0].attempts, 1);
const wrongKindSet = (await start(startBody("Ignored"))).set;
close((await scores()).rows[0].accuracy, 50);
const wrongKind = exactGuesses().map(guess => ({ ...guess, kind: guess.kind === "peak" ? "dip" : "peak" }));
const wrong = await answer(wrongKindSet, wrongKind);
assert.equal(wrong.set.answer.correct, false);
close(wrong.set.answer.accuracy, 100);
close((await scores()).rows[0].accuracy, 100);
assert.equal((await scores()).rows[0].correct, 1);
const emptySet = (await start(startBody("Ignored"))).set;
await answer(emptySet, []);
close((await scores()).rows[0].accuracy, 200 / 3);

// Force each class at early/middle/final levels, preserving class secrecy.
const mixes = [];
for (const level of [1, 50, 100]) {
  const progress = (level - 1) / 99;
  const exaggerated = .6 - .45 * progress;
  const rolls = [exaggerated / 2, exaggerated + .15, exaggerated + .3 + (1 - exaggerated - .3) / 2];
  for (let index = 0; index < rolls.length; index++) {
    resetProfile();
    if (level > 1) {
      await start(startBody("FixtureCharlie"));
      db.prepare("UPDATE ear_practice_scores SET furthest=?,correct=?,attempts=? WHERE subject_id=?").run(level - 1, level - 1, level, identity.subjectId);
      db.prepare("UPDATE ear_practice_sets SET answer='{}' WHERE subject_id=?").run(identity.subjectId);
    }
    randomSequence = [rolls[index]];
    const trial = (await start(startBody("FixtureCharlie"))).set;
    assert.equal(trial.stage, level);
    assert.equal(trial.count, 1 + [11, 26, 46, 66, 86].filter(threshold => level >= threshold).length);
    assert(!("difficulty" in trial));
    assert(!("bands" in trial));
    const bands = exactBands();
    const difficulty = protocol.EAR_PRACTICE_STAGES[index];
    const gain = Math.round(Math.max(1.5, difficulty.gainDb * (1 - .6 * progress)) * 100) / 100;
    const q = Math.round(difficulty.q * (1 + .5 * progress) * 100) / 100;
    for (let at = 0; at < bands.length; at++) {
      const band = bands[at];
      assert.equal(Math.abs(band.gain), gain);
      assert.equal(band.q, q);
      assert(band.hz >= 100 && band.hz <= 9500);
      assert(band.halfWidth > 0 && band.halfWidth <= 1);
      if (at) {
        const gap = Math.log2(band.hz / bands[at - 1].hz);
        assert(gap > .59);
        assert(band.halfWidth + bands[at - 1].halfWidth < gap);
      }
    }
    const revealed = await answer(trial, exactGuesses());
    assert.equal(revealed.set.answer.difficulty, index + 1);
    close(revealed.set.answer.accuracy, 100);
    mixes.push({ level, difficulty: difficulty.label, gain, q, count: trial.count });
  }
}

// Omitting the first feature still earns precise credit on later locations.
resetProfile();
await start(startBody("FixtureCharlie"));
db.prepare("UPDATE ear_practice_scores SET furthest=85,correct=85,attempts=86 WHERE subject_id=?").run(identity.subjectId);
db.prepare("UPDATE ear_practice_sets SET answer='{}' WHERE subject_id=?").run(identity.subjectId);
const omissions = (await start(startBody("Ignored"))).set;
const omitted = await answer(omissions, exactGuesses().slice(1));
assert.equal(omitted.set.answer.correct, false);
close(omitted.set.answer.accuracy, 100 * (omissions.count - 1) / omissions.count);

// Deterministic high/low random draws move centers well outside old slot cues.
const frequencyDraws = [];
for (const locationRoll of [.02, .98]) {
  db.prepare("UPDATE ear_practice_sets SET answer='{}' WHERE subject_id=?").run(identity.subjectId);
  randomSequence = [.1, .1, .1, .1, .1, .1, .1, ...Array(6).fill(locationRoll)];
  await start(startBody("Ignored"));
  const bands = exactBands();
  frequencyDraws.push(bands.map(band => band.hz));
  for (let at = 1; at < bands.length; at++) {
    assert(Math.log2(bands[at].hz / bands[at - 1].hz) > .59);
    assert(bands[at].halfWidth + bands[at - 1].halfWidth < Math.log2(bands[at].hz / bands[at - 1].hz));
  }
}
assert(frequencyDraws[1].every((hz, at) => Math.log2(hz / frequencyDraws[0][at]) > 3));

// v1 can finish but never contaminates the mixed-protocol scoreboard.
resetProfile();
db.prepare("INSERT INTO ear_practice_profiles(subject_id,username) VALUES(?,?)").run(identity.subjectId, "LegacyCharlie");
db.prepare("INSERT INTO ear_practice_scores(subject_id,protocol,furthest,correct,attempts,consent_version,created_at) VALUES(?,?,99,99,100,?,0)")
  .run(identity.subjectId, protocol.EAR_PRACTICE_LEGACY_PROTOCOL, "ear-practice-public-v1");
const legacyId = crypto.randomUUID();
const legacyBand = { kind: "peak", hz: 1000, gain: 2.4, q: 4.2, halfWidth: 1 };
db.prepare("INSERT INTO ear_practice_sets(subject_id,id,protocol,stage,bands,created_at) VALUES(?,?,?,100,?,0)")
  .run(identity.subjectId, legacyId, protocol.EAR_PRACTICE_LEGACY_PROTOCOL, JSON.stringify([legacyBand]));
assert.equal((await my()).needsConsent, true);
assert.equal((await my()).set.legacy, true);
assert.equal((await scores()).participants, 0);
assert.equal((await start(startBody("Ignored"))).set.id, legacyId);
const legacy = (await my()).set;
await analyseAudio(legacy);
const legacyWin = await answer(legacy, [peak(1000)]);
assert.equal(legacyWin.set.legacy, true);
assert.equal(legacyWin.set.answer.correct, true);
assert.equal((await scores()).participants, 0);
assert.equal(db.prepare("SELECT furthest FROM ear_practice_scores WHERE subject_id=? AND protocol=?").get(identity.subjectId, protocol.EAR_PRACTICE_LEGACY_PROTOCOL).furthest, 100);
const modern = (await start(startBody("Ignored"))).set;
assert.equal(modern.stage, 1);
assert.equal(modern.legacy, undefined);
assert.equal((await scores()).participants, 1);
assert.equal((await scores()).rows[0].attempts, 1);
assert.equal((await my()).needsConsent, false);
await answer(modern, []);
db.prepare("UPDATE ear_practice_sets SET protocol='unsupported-preview' WHERE subject_id=?").run(identity.subjectId);
await body(api.GET(request("GET", "?mine=1")), 409);
await body(api.POST(request("POST", "", startBody("Ignored"))), 409);
db.prepare("UPDATE ear_practice_sets SET protocol=? WHERE subject_id=?").run(protocol.EAR_PRACTICE_PROTOCOL, identity.subjectId);

// Opaque automatic public labels survive reload/rename; collision retries safely.
resetProfile();
const fixedLabel = "Listener_010101010101";
identity = subjects.a;
const aRevision = (await my()).revision;
await start(startBody(fixedLabel, aRevision));
identity = subjects.c;
labelSequence = [Array(6).fill(1), Array(6).fill(2)];
const anon = await start(startBody("   "));
assert.equal(anon.username, "Listener_020202020202");
assert.equal((await my()).username, anon.username);
assert.equal((await start(startBody(""))).username, anon.username);
await body(api.PATCH(request("PATCH", "", { username: "NamedCharlie" })));
assert.equal((await my()).username, "NamedCharlie");
assert.equal(db.prepare("SELECT subject_id FROM ear_practice_profiles WHERE username='NamedCharlie'").get().subject_id, subjects.c.subjectId);
assert(!JSON.stringify(await scores()).includes(subjects.c.subjectId));

// Session and revision guards still prevent stale tabs changing results.
const protectedId = (await my()).set.id;
db.prepare("DELETE FROM privacy_sessions WHERE token_hash=?").run(identity.sessionHash);
await body(api.POST(request("POST", "", { action: "answer", id: protectedId, guesses: exactGuesses() })), 409);
assert.equal(db.prepare("SELECT answer FROM ear_practice_sets WHERE subject_id=?").get(identity.subjectId).answer, null);
assert.equal(db.prepare("SELECT accuracy_sum FROM ear_practice_scores WHERE subject_id=?").get(identity.subjectId).accuracy_sum, 0);
db.prepare("INSERT INTO privacy_sessions VALUES(?,?,?)").run(identity.sessionHash, identity.subjectId, Date.now() + 3_600_000);
await body(api.DELETE(request("DELETE")));
await body(api.POST(request("POST", "", startBody(""))), 409);
const revision = (await my()).revision;
await start(startBody("", revision));
assert.equal((await my()).needsConsent, false);

// Full population statistics, global tie ranks and safe pagination.
db.prepare("DELETE FROM ear_practice_profiles").run();
const addScore = (id, username, { wins=10, losses=2, accuracy=80, level=10, legacy=false } = {}) => {
  db.prepare("INSERT OR IGNORE INTO privacy_accounts(subject_id) VALUES(?)").run(id);
  db.prepare("INSERT INTO ear_practice_profiles(subject_id,username) VALUES(?,?)").run(id, username);
  db.prepare("INSERT INTO ear_practice_scores(subject_id,protocol,furthest,correct,attempts,accuracy_sum,consent_version,created_at) VALUES(?,?,?,?,?,?,?,0)")
    .run(id, legacy ? protocol.EAR_PRACTICE_LEGACY_PROTOCOL : protocol.EAR_PRACTICE_PROTOCOL, level, wins, wins + losses, accuracy * (wins + losses), protocol.EAR_PRACTICE_CONSENT);
};
for (let index = 0; index < 105; index++) addScore("browser:fixture-page-" + index, "Public_" + String(index).padStart(3, "0"));
addScore("browser:fixture-higher-accuracy", "HighAccuracy", { accuracy: 90, level: 1 });
addScore("browser:fixture-higher-level", "HighLevel", { level: 99 });
addScore("browser:fixture-fewer-loss", "FewerLoss", { losses: 1, accuracy: 50 });
addScore("browser:fixture-more-wins", "MoreWins", { wins: 11, losses: 100, accuracy: 1 });
addScore("browser:fixture-old", "HistoricalOnly", { wins: 1000, legacy: true });
addScore("browser:fixture-withdrawn", null);
addScore("owner", "PrivateOwner", { wins: 1000 });
addScore("invite:layout-test-only", "PrivateLayout", { wins: 1000 });
const firstPage = await scores();
assert.equal(firstPage.participants, 109);
assert.equal(firstPage.page, 0);
assert.equal(firstPage.pageSize, 100);
assert.equal(firstPage.rows.length, 100);
assert.equal(firstPage.distribution.length, 101);
assert.equal(firstPage.distribution.reduce((sum, bin) => sum + bin.count, 0), 109);
assert.deepEqual(firstPage.rows.slice(0, 5).map(row => [row.username, row.rank]), [
  ["MoreWins", 1], ["FewerLoss", 2], ["HighAccuracy", 3], ["HighLevel", 4], ["Public_000", 5],
]);
assert(firstPage.rows.slice(4).every(row => row.rank === 5));
const secondPage = await body(api.GET(request("GET", "?page=1")));
assert.equal(secondPage.rows.length, 9);
assert(secondPage.rows.every(row => row.rank === 5));
assert.deepEqual(secondPage.distribution, firstPage.distribution);
assert.equal(secondPage.participants, 109);
assert.equal(new Set([...firstPage.rows, ...secondPage.rows].map(row => row.username)).size, 109);
assert(!JSON.stringify(firstPage).includes("browser:"));
assert(!JSON.stringify(firstPage).includes("Private"));
const ownerSecond = await body(admin.GET(new Request(url + "/api/owner-research/ear-practice?page=1", { headers: { Authorization: "Bearer " + env.OWNER_ANALYTICS_TOKEN } })));
assert.equal(ownerSecond.rows.length, 9);
assert(ownerSecond.rows.every(row => row.participantId.startsWith("browser:")));
assert.deepEqual(ownerSecond.rows.map(({ participantId, ...row }) => row), secondPage.rows);
for (const page of ["-1", "1.5", "NaN", "1000001", "", "1e2"]) {
  await body(api.GET(request("GET", "?page=" + page)), 400);
  await body(admin.GET(new Request(url + "/api/owner-research/ear-practice?page=" + page, { headers: { Authorization: "Bearer " + env.OWNER_ANALYTICS_TOKEN } })), 400);
}
assert.equal((await body(api.GET(request("GET", "?page=1000000")))).rows.length, 0);
assert.throws(() => db.prepare("UPDATE ear_practice_scores SET accuracy_sum=-1 WHERE subject_id='browser:fixture-more-wins'").run());
assert.throws(() => db.prepare("UPDATE ear_practice_scores SET accuracy_sum=100*attempts+1 WHERE subject_id='browser:fixture-more-wins'").run());

// Equal displayed tenths share rank even if unrounded averages differ.
addScore("browser:fixture-near-tie-a", "NearTieA", { accuracy: 67.03 });
addScore("browser:fixture-near-tie-b", "NearTieB", { accuracy: 67.04 });
const nearTies = (await body(api.GET(request("GET", "?page=1")))).rows.slice(-2);
assert.deepEqual(nearTies.map(row => [row.username, row.rank]), [["NearTieA", 110], ["NearTieB", 110]]);

console.log(JSON.stringify({
  protocol: protocol.EAR_PRACTICE_PROTOCOL, consent: protocol.EAR_PRACTICE_CONSENT,
  originalPrivacyAndAudioRegression: true, anonymousCollisionRetryAndRename: true,
  randomClassesHiddenUntilAnswer: mixes.length, locationIndependentOfKind: true,
  optimalOmissionMatching: true, unfinishedAttemptsZeroAccuracy: true,
  startAndAnswerRetriesIdempotent: true, legacyResumeAndSeparateScores: true,
  staleRevisionAndSessionGuarded: true, unknownProtocolRejected: true,
  nonoverlappingBandsAndUnpredictableLocations: true,
  participantsBeyondFirstPage: firstPage.participants, globalExactTiesAcrossPages: true,
  privateAndWithdrawnSubjectsExcluded: true, schemaAccuracyBounds: true,
  audioAnalysisStillCanCheat: true,
}, null, 2));
