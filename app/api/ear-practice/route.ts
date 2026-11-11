import { env } from "cloudflare:workers";
import { isTestSubject, requireParticipantSubject } from "@/lib/admin-contributions";
import {
  EAR_PRACTICE_CONSENT, EAR_PRACTICE_RANGE, EAR_PRACTICE_MAX_STAGE, EAR_PRACTICE_PROTOCOL, EAR_PRACTICE_LEGACY_PROTOCOL,
  EAR_PRACTICE_STAGES, EAR_PRACTICE_SWEEP_SECONDS, earPracticeBandGain, earPracticeGuessMatches, earPracticeLocationAccuracy,
  type EarPracticeAnswer, type EarPracticeBand, type EarPracticeGuess, type EarPracticeSet, type EarPracticeDistribution,
} from "@/lib/ear-practice-ranking";
import { isReservedListenerNickname } from "@/lib/listener-nickname";
import { publicWriteGate } from "@/lib/public-write-gate";
import { readJsonObject, RequestInputError } from "@/lib/request-json";
import { dataIdentity } from "@/lib/submission-ownership";
import { screenTargetName } from "@/lib/target-name-policy";

type SetRow = { id: string; protocol: string; stage: number; bands: string; answer: string | null };
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const activeSession = "EXISTS(SELECT 1 FROM privacy_sessions WHERE subject_id=? AND token_hash=? AND expires_at>?)";
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
const formatSet = (row: SetRow | null): EarPracticeSet | null => row && ({
  id: row.id, stage: row.stage, count: (JSON.parse(row.bands) as EarPracticeBand[]).length,
  answer: row.answer ? JSON.parse(row.answer) : null,
  ...(row.protocol === EAR_PRACTICE_LEGACY_PROTOCOL ? { legacy: true } : {}),
});

function usernameConflict(error: unknown) {
  const cause = (error as { cause?: unknown })?.cause;
  return /UNIQUE constraint failed:.*ear_practice_username_idx/i.test(String(error) + String(cause));
}

function failure(error: unknown) {
  if (error instanceof RequestInputError) return json({ error: error.message }, error.status);
  if (usernameConflict(error)) {
    return json({ error: "That username is already in use. Choose another." }, 409);
  }
  return json({ error: "The practice leaderboard is temporarily unavailable." }, 503);
}

function cleanUsername(raw: unknown) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!/^[a-zA-Z0-9_-]{3,24}$/.test(value) || isReservedListenerNickname(value) || screenTargetName(value).blocked) {
    throw new RequestInputError("Use 3–24 letters, numbers, underscores or hyphens and choose a respectful username.", 400);
  }
  return value;
}

function readGuess(value: unknown): EarPracticeGuess {
  const guess = value as Partial<EarPracticeGuess> | null;
  if (!guess || (guess.kind !== "peak" && guess.kind !== "dip") || typeof guess.hz !== "number" ||
    !Number.isInteger(guess.hz) || guess.hz < EAR_PRACTICE_RANGE.from || guess.hz > EAR_PRACTICE_RANGE.to) {
    throw new RequestInputError("Choose a frequency and guess peak or dip.", 400);
  }
  return { kind: guess.kind, hz: guess.hz };
}

function randomFraction() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

function anonymousUsername() {
  return "Listener_" + Array.from(crypto.getRandomValues(new Uint8Array(6)), byte => byte.toString(16).padStart(2, "0")).join("");
}

function shuffle<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index--) {
    const next = Math.floor(randomFraction() * (index + 1));
    [items[index], items[next]] = [items[next], items[index]];
  }
  return items;
}

function bandShape(stage: number, difficulty: (typeof EAR_PRACTICE_STAGES)[number]) {
  const progress = (stage - 1) / (EAR_PRACTICE_MAX_STAGE - 1);
  return {
    gain: Math.round(Math.max(1.5, difficulty.gainDb * (1 - .6 * progress)) * 100) / 100,
    q: Math.round(difficulty.q * (1 + .5 * progress) * 100) / 100,
  };
}

function newBands(stage: number): EarPracticeBand[] {
  const count = 1 + [11, 26, 46, 66, 86].filter(threshold => stage >= threshold).length;
  const progress = (stage - 1) / (EAR_PRACTICE_MAX_STAGE - 1);
  const roll = randomFraction();
  const exaggeratedChance = .6 - .45 * progress;
  const difficulty = EAR_PRACTICE_STAGES[roll < exaggeratedChance ? 0 : roll < exaggeratedChance + .3 ? 1 : 2];
  const { gain, q } = bandShape(stage, difficulty);
  const startsWithPeak = randomFraction() < .5;
  const kinds = shuffle(Array.from({ length: count }, (_, index): EarPracticeGuess["kind"] =>
    (index % 2 === 0) === startsWithPeak ? "peak" : "dip"));
  // Randomize positions across the usable range. Fixed per-band slots would
  // reveal high-level centers closely enough to guess without listening.
  const minimumGap = .6;
  const freeSpan = Math.log2(95) - (count - 1) * minimumGap;
  const frequencies = Array.from({ length: count }, () => randomFraction() * freeSpan)
    .sort((a, b) => a - b)
    .map((position, index) => Math.round(100 * 2 ** (position + index * minimumGap)));
  return kinds.map((kind, band) => ({
    kind,
    hz: frequencies[band],
    gain: kind === "peak" ? gain : -gain, q,
    halfWidth: count === 1 ? 1 : Math.min(1, .45 * Math.min(
      band ? Math.log2(frequencies[band] / frequencies[band - 1]) : Infinity,
      band + 1 < count ? Math.log2(frequencies[band + 1] / frequencies[band]) : Infinity,
    )),
  }));
}

async function loadSet(db: D1Database, subjectId: string) {
  const row = await db.prepare("SELECT id,protocol,stage,bands,answer FROM ear_practice_sets WHERE subject_id=?")
    .bind(subjectId).first<SetRow>();
  if (row && row.protocol !== EAR_PRACTICE_PROTOCOL && row.protocol !== EAR_PRACTICE_LEGACY_PROTOCOL) {
    throw new RequestInputError("This saved challenge uses an unsupported format.", 409);
  }
  return row;
}

// Interleaved PCM carries the matched Reference and Mystery in two channels.
// The response contains audio bytes and no hidden frequency or answer fields.
function renderRound(bands: EarPracticeBand[]) {
  const sampleRate = 24_000;
  const frames = sampleRate * EAR_PRACTICE_SWEEP_SECONDS;
  const buffer = new ArrayBuffer(44 + frames * 4);
  const wav = new DataView(buffer);
  const label = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index++) wav.setUint8(offset + index, text.charCodeAt(index));
  };
  label(0, "RIFF"); wav.setUint32(4, buffer.byteLength - 8, true); label(8, "WAVE");
  label(12, "fmt "); wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true); wav.setUint16(22, 2, true);
  wav.setUint32(24, sampleRate, true); wav.setUint32(28, sampleRate * 4, true);
  wav.setUint16(32, 4, true); wav.setUint16(34, 16, true);
  label(36, "data"); wav.setUint32(40, frames * 4, true);

  const step = (EAR_PRACTICE_RANGE.to / EAR_PRACTICE_RANGE.from) ** (1 / frames);
  const amplitude = .16 * 10 ** (-EAR_PRACTICE_STAGES[0].gainDb / 20);
  const fadeFrames = sampleRate * .025;
  let phase = 0;
  let frequency = EAR_PRACTICE_RANGE.from;
  for (let index = 0; index < frames; index++) {
    const envelope = Math.min(1, index / fadeFrames, (frames - 1 - index) / fadeFrames);
    const sample = Math.sin(phase) * amplitude * envelope * 32767;
    let gainDb = 0;
    for (const band of bands) gainDb += earPracticeBandGain(band, frequency);
    const gain = gainDb ? 10 ** (gainDb / 20) : 1;
    wav.setInt16(44 + index * 4, Math.round(sample), true);
    wav.setInt16(46 + index * 4, Math.round(sample * gain), true);
    phase += 2 * Math.PI * frequency / sampleRate;
    frequency *= step;
  }
  return buffer;
}

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const db = env.DB!;
    if (query.has("audio")) {
      const identity = await dataIdentity();
      requireParticipantSubject(identity.subjectId);
      const set = await loadSet(db, identity.subjectId);
      if (!set || set.id !== query.get("audio") || set.answer) {
        return json({ error: "This ranked challenge is no longer active." }, 409);
      }
      const bands = JSON.parse(set.bands) as EarPracticeBand[];
      return new Response(renderRound(bands), { headers: { ...headers, "Content-Type": "audio/wav" } });
    }
    if (query.has("mine")) {
      const identity = await dataIdentity();
      if (isTestSubject(identity.subjectId)) return json({ canPublish: false, username: null, revision: 0, needsConsent: true, set: null });
      const profile = await db.prepare("SELECT username,cleared_at FROM ear_practice_profiles WHERE subject_id=?")
        .bind(identity.subjectId).first<{ username: string | null; cleared_at: number }>();
      const current = await loadSet(db, identity.subjectId);
      const score = await db.prepare("SELECT consent_version FROM ear_practice_scores WHERE subject_id=? AND protocol=?")
        .bind(identity.subjectId, EAR_PRACTICE_PROTOCOL).first<{ consent_version: string }>();
      return json({
        canPublish: true, username: profile?.username ?? null, revision: profile?.cleared_at ?? 0,
        needsConsent: score?.consent_version !== EAR_PRACTICE_CONSENT,
        set: formatSet(current),
      });
    }
    const rawPage = query.get("page") ?? "0";
    const page = Number(rawPage);
    if (!/^\d+$/.test(rawPage) || !Number.isSafeInteger(page) || page > 1_000_000) throw new RequestInputError("Choose a valid results page.", 400);
    const [rows, population] = await db.batch([
      db.prepare("SELECT p.username,s.furthest,s.correct,s.attempts,s.accuracy_sum/s.attempts AS accuracy,RANK() OVER(ORDER BY s.correct DESC,(s.attempts-s.correct) ASC,ROUND(s.accuracy_sum/s.attempts,1) DESC,s.furthest DESC) AS rank FROM ear_practice_scores s JOIN ear_practice_profiles p USING(subject_id) WHERE s.protocol=? AND p.username IS NOT NULL AND s.subject_id NOT IN ('owner','invite:layout-test-only') ORDER BY rank,lower(p.username) LIMIT 100 OFFSET ?")
        .bind(EAR_PRACTICE_PROTOCOL, page * 100),
      db.prepare("SELECT s.furthest AS level,count(*) AS count FROM ear_practice_scores s JOIN ear_practice_profiles p USING(subject_id) WHERE s.protocol=? AND p.username IS NOT NULL AND s.subject_id NOT IN ('owner','invite:layout-test-only') GROUP BY s.furthest")
        .bind(EAR_PRACTICE_PROTOCOL),
    ]);
    const counts = new Map((population.results as EarPracticeDistribution[]).map(row => [row.level, row.count]));
    const distribution = Array.from({ length: EAR_PRACTICE_MAX_STAGE + 1 }, (_, level) => ({ level, count: counts.get(level) ?? 0 }));
    return json({ rows: rows.results, distribution, participants: distribution.reduce((total, bin) => total + bin.count, 0), page, pageSize: 100 });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("Origin") !== new URL(request.url).origin) throw new RequestInputError("Invalid origin.", 403);
    const identity = await dataIdentity();
    const subject = identity.subjectId;
    requireParticipantSubject(subject);
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 2048);
    const db = env.DB!;
    const now = Date.now();
    const session = [subject, identity.sessionHash, now] as const;
    if (data.action === "start") {
      const protocol = EAR_PRACTICE_PROTOCOL;
      if (typeof data.id !== "string" || !uuid.test(data.id) || data.consent !== EAR_PRACTICE_CONSENT ||
        typeof data.revision !== "number" || !Number.isSafeInteger(data.revision)) {
        throw new RequestInputError("Agree to the current leaderboard notice.", 400);
      }
      const profile = await db.prepare("SELECT username,cleared_at FROM ear_practice_profiles WHERE subject_id=?")
        .bind(subject).first<{ username: string | null; cleared_at: number }>();
      if ((profile?.cleared_at ?? 0) !== data.revision) throw new RequestInputError("Your leaderboard settings changed. Reopen ranked practice.", 409);
      const existing = await loadSet(db, subject);
      if (existing && (!existing.answer || existing.id === data.id)) {
        return json({ set: formatSet(existing), username: profile?.username ?? null });
      }
      const score = await db.prepare("SELECT furthest FROM ear_practice_scores WHERE subject_id=? AND protocol=?")
        .bind(subject, protocol).first<{ furthest: number }>();
      const stage = (score?.furthest ?? 0) + 1;
      if (stage > EAR_PRACTICE_MAX_STAGE) throw new RequestInputError("You’ve cleared all 100 stages.", 409);
      const anonymous = data.username === undefined || data.username === null || (typeof data.username === "string" && !data.username.trim());
      let username = profile?.username ?? (anonymous ? anonymousUsername() : cleanUsername(data.username));
      const stageGuard = " AND COALESCE((SELECT furthest FROM ear_practice_scores WHERE subject_id=? AND protocol=?),0)+1=?";
      const stageArgs = [subject, protocol, stage];
      const bands = newBands(stage);
      for (let retry = 0; ; retry++) {
        try {
          await db.batch([
            db.prepare("INSERT INTO ear_practice_profiles(subject_id,username) SELECT ?,? WHERE " + activeSession + " AND COALESCE((SELECT cleared_at FROM ear_practice_profiles WHERE subject_id=?),0)=? ON CONFLICT(subject_id) DO UPDATE SET username=excluded.username WHERE ear_practice_profiles.username IS NULL")
              .bind(subject, username, ...session, subject, data.revision),
            db.prepare("INSERT INTO ear_practice_sets(subject_id,id,protocol,stage,bands,created_at) SELECT ?,?,?,?,?,? WHERE " + activeSession + " AND EXISTS(SELECT 1 FROM ear_practice_profiles WHERE subject_id=? AND cleared_at=? AND username IS NOT NULL)" + stageGuard + " ON CONFLICT(subject_id) DO UPDATE SET id=excluded.id,protocol=excluded.protocol,stage=excluded.stage,bands=excluded.bands,created_at=excluded.created_at,answer=NULL WHERE ear_practice_sets.id!=excluded.id AND ear_practice_sets.answer IS NOT NULL")
              .bind(subject, data.id, protocol, stage, JSON.stringify(bands), now, ...session, subject, data.revision, ...stageArgs),
            db.prepare("INSERT INTO ear_practice_scores(subject_id,protocol,correct,attempts,consent_version,created_at) SELECT ?,?,0,1,?,? WHERE changes()=1 ON CONFLICT(subject_id,protocol) DO UPDATE SET attempts=ear_practice_scores.attempts+1,consent_version=excluded.consent_version")
              .bind(subject, protocol, EAR_PRACTICE_CONSENT, now),
          ]);
          break;
        } catch (error) {
          if (!profile?.username && anonymous && usernameConflict(error) && retry < 2) {
            username = anonymousUsername();
            continue;
          }
          throw error;
        }
      }
      const result = await loadSet(db, subject);
      if (!result) throw new RequestInputError("Your leaderboard settings changed. Reopen ranked practice.", 409);
      const savedProfile = await db.prepare("SELECT username,cleared_at FROM ear_practice_profiles WHERE subject_id=?")
        .bind(subject).first<{ username: string | null; cleared_at: number }>();
      if (savedProfile?.cleared_at !== data.revision) throw new RequestInputError("Your leaderboard settings changed. Reopen ranked practice.", 409);
      return json({ set: formatSet(result), username: savedProfile?.username ?? null });
    }

    const set = await loadSet(db, subject);
    if (!set || set.id !== data.id) throw new RequestInputError("This ranked challenge is no longer active.", 409);
    if (data.action !== "answer") throw new RequestInputError("Choose a ranked practice action.", 400);
    if (set.answer) return json({ set: formatSet(set) });
    const bands = JSON.parse(set.bands) as EarPracticeBand[];
    if (!Array.isArray(data.guesses) || data.guesses.length > bands.length) throw new RequestInputError("Check the number of guesses.", 400);
    const guesses = data.guesses.map(readGuess).sort((a, b) => a.hz - b.hz);
    const difficulty = set.protocol === EAR_PRACTICE_PROTOCOL ? EAR_PRACTICE_STAGES.find(difficulty => {
      const shape = bandShape(set.stage, difficulty);
      return shape.gain === Math.abs(bands[0].gain) && shape.q === bands[0].q;
    })?.id : undefined;
    const result: EarPracticeAnswer = {
      ...(difficulty === undefined ? {} : { difficulty }),
      accuracy: earPracticeLocationAccuracy(guesses, bands),
      guesses, bands, correct: guesses.length === bands.length && bands.every((band, index) => earPracticeGuessMatches(guesses[index], band)),
    };
    await db.batch([
      db.prepare("UPDATE ear_practice_sets SET answer=? WHERE subject_id=? AND id=? AND answer IS NULL AND " + activeSession)
        .bind(JSON.stringify(result), subject, set.id, ...session),
      db.prepare("UPDATE ear_practice_scores SET correct=correct+?,furthest=max(furthest,?),accuracy_sum=accuracy_sum+? WHERE subject_id=? AND protocol=? AND changes()=1")
        .bind(Number(result.correct), result.correct ? set.stage : 0, set.protocol === EAR_PRACTICE_PROTOCOL ? result.accuracy! : 0, subject, set.protocol),
    ]);
    const current = await loadSet(db, subject);
    if (!current || current.id !== set.id || !current.answer) throw new RequestInputError("This challenge changed on another device.", 409);
    return json({ set: formatSet(current) });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    if (request.headers.get("Origin") !== new URL(request.url).origin) throw new RequestInputError("Invalid origin.", 403);
    const identity = await dataIdentity();
    requireParticipantSubject(identity.subjectId);
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 1024);
    const username = cleanUsername(data.username);
    const result = await env.DB!.prepare("UPDATE ear_practice_profiles SET username=? WHERE subject_id=? AND username IS NOT NULL AND " + activeSession)
      .bind(username, identity.subjectId, identity.subjectId, identity.sessionHash, Date.now()).run();
    if (!result.meta.changes) throw new RequestInputError("Start a ranked set to choose a public username.", 409);
    return json({ username });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    if (request.headers.get("Origin") !== new URL(request.url).origin) throw new RequestInputError("Invalid origin.", 403);
    const identity = await dataIdentity();
    requireParticipantSubject(identity.subjectId);
    const subject = identity.subjectId;
    const now = Date.now();
    const session = [subject, identity.sessionHash, now] as const;
    const db = env.DB!;
    await db.batch([
      db.prepare("DELETE FROM ear_practice_scores WHERE subject_id=? AND " + activeSession).bind(subject, ...session),
      db.prepare("DELETE FROM ear_practice_sets WHERE subject_id=? AND " + activeSession).bind(subject, ...session),
      db.prepare("UPDATE ear_practice_profiles SET username=NULL,cleared_at=max(cleared_at+1,?) WHERE subject_id=? AND " + activeSession)
        .bind(now, subject, ...session),
    ]);
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
