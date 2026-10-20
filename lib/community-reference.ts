import { matchedListeningProgress } from "@/lib/matched-listening";
import { targetContextVersion } from "@/lib/target-context-version";
import { RequestInputError } from "@/lib/request-json";
import { requireParticipantSubject } from "@/lib/admin-contributions";
import { communityPermission } from "@/lib/community-server";
import { COMMUNITY_NOTICE_VERSION } from "@/lib/community-notice";
import { targetHeadphoneType } from "@/lib/target-type";
import { listeningPool } from "@/lib/music-catalog";
import { parseIntervals, intervalStats } from "@/lib/listening";
export const COMMUNITY_METHOD = "uniform-reference-fixed10-v1";
export const REFERENCE_ROUNDS = 10;
export function referenceSystem(value:unknown){if(typeof value!=="string"||!value.trim()||value.length>120||/[\x00-\x1f\x7f]/.test(value)||/^(unknown|unspecified|none)$/i.test(value.trim()))throw new RequestInputError("Reference checks need a declared rig/reference-system label. Unknown remains available for Personal exploration.",400);return value.trim().replace(/\s+/g," ").toLowerCase();}
function referencePeriod(rig:unknown){return new Date().toISOString().slice(0,7)+" · "+referenceSystem(rig);}

export function randomIndex(length: number) { if (!Number.isSafeInteger(length) || length < 1 || length > 0x100000000)
    throw Error("Invalid random support"); const limit = Math.floor(0x100000000 / length) * length; let n; do {
    n = crypto.getRandomValues(new Uint32Array(1))[0];
} while (n >= limit); return n % length; }
export function referencePairs(ids: string[]) { const pairs: [
    string,
    string
][] = []; for (let a = 0; a < ids.length; a++)
    for (let b = a + 1; b < ids.length; b++)
        pairs.push([ids[a], ids[b]]); return pairs; }
type CatalogTarget = {
    id: string;
    name: string;
    points: string;
    measurement: string | null;
    headphoneType?: "ie" | "oe";
    referenceSystem?: string;
    submissionKind?: string;
    version?: string;
};
type Block = {
    id: string;
    catalog_id: string;
    consent_token: string;
    notice_version: string;
    setup_fingerprint: string;
    created_at: number;
};
async function active(db: D1Database, subject: string, participating: boolean) { requireParticipantSubject(subject); const p = await communityPermission(db, subject, participating); if (!p.enabled || !p.token)
    throw new RequestInputError("Enable the separate Community Preferences permission first.", 403); return p; }
export async function nextReference(db: D1Database, subject: string, participating: boolean, type: string, rig: unknown) {
    const permission = await active(db, subject, participating);
    const period = referencePeriod(rig);
    const catalog = await db.prepare("SELECT id,catalog_json,music_json FROM community_catalogs WHERE period=? AND headphone_type=?").bind(period, type).first<{
        id: string;
        catalog_json: string;
        music_json: string;
    }>();
    if (!catalog)
        return { block: null };
    const block = await db.prepare("SELECT * FROM community_reference_blocks WHERE subject_id=? AND catalog_id=?").bind(subject, catalog.id).first<Block>();
    if (!block)
        return { block: null };
    if (block.consent_token !== permission.token)
        throw new RequestInputError("Permission changed. This old reference block is excluded; delete it in My data before starting another.", 409);
    const assignments = await db.prepare("SELECT id,ordinal,target_a_id,target_b_id,recording_id,recording_version,result FROM community_reference_assignments WHERE block_id=? ORDER BY ordinal").bind(block.id).all<{
        id: string;
        ordinal: number;
        target_a_id: string;
        target_b_id: string;
        recording_id: string;
        recording_version: string | null;
        result: string | null;
    }>();
    const next = assignments.results.find(r => r.result === null);
    if (!next)
        return { block: block.id, complete: true, answered: assignments.results.length, rounds: REFERENCE_ROUNDS };
    if (next.recording_version && (listeningPool.find(t => t.url === next.recording_id)?.sha256 ?? null) !== next.recording_version)
        throw new RequestInputError('The assigned recording changed. This block cannot continue.', 409);
    const frozen = JSON.parse(catalog.catalog_json) as CatalogTarget[];
    const current = await db.prepare("SELECT id,name,points,measurement,headphone_type AS headphoneType,reference_system AS referenceSystem,submission_kind AS submissionKind,status FROM targets WHERE id IN (?,?)").bind(next.target_a_id, next.target_b_id).all<{
        id: string;
        points: string;
        status: string;
        headphoneType?: string;
        measurement?: string;
        referenceSystem?: string;
        submissionKind?: string;
    }>();
    for (const id of [next.target_a_id, next.target_b_id]) {
        const t = current.results.find(t => t.id === id);
        if (!t || t.status !== 'approved' || await targetContextVersion(t) !== frozen.find(f => f.id === id)?.version)
            throw new RequestInputError("A reference target changed or became unavailable. This block cannot be continued.", 409);
    }
    return { block: block.id, setupFingerprint: block.setup_fingerprint, assignment: { id: next.id, ordinal: next.ordinal, recordingId: next.recording_id, pair: [next.target_a_id, next.target_b_id], targets: current.results.map(t => ({ id: t.id, points: JSON.parse(t.points) })) }, answered: assignments.results.filter(r => r.result !== null).length, rounds: REFERENCE_ROUNDS };
}
export async function startReference(db: D1Database, subject: string, sessionHash: string, participating: boolean, type: unknown, setup: unknown, rig:unknown) { const permission = await active(db, subject, participating); if (!['ie', 'oe'].includes(String(type)) || typeof setup !== "string" || !/^[a-f0-9]{64}$/.test(setup))
    throw new RequestInputError("Choose a headphone setup first.", 400); const period = referencePeriod(rig); let catalog = await db.prepare("SELECT id,catalog_json,music_json FROM community_catalogs WHERE period=? AND headphone_type=?").bind(period, String(type)).first<{
    id: string;
    catalog_json: string;
    music_json: string;
}>(); if (!catalog) {
    const rows = await db.prepare("SELECT id,name,points,measurement,headphone_type AS headphoneType,reference_system AS referenceSystem,submission_kind AS submissionKind FROM targets WHERE status='approved' AND lower(trim(reference_system))=? AND NOT EXISTS(SELECT 1 FROM submission_owners o WHERE o.record_kind='target' AND o.record_id=targets.id AND o.subject_id IN ('owner','invite:layout-test-only')) ORDER BY id LIMIT 257").bind(referenceSystem(rig)).all<CatalogTarget>();
    const eligible = rows.results.filter(t => targetHeadphoneType(t) === type);
    if (eligible.length < 2 || rows.results.length > 256)
        throw new RequestInputError("The reference catalog needs 2–256 approved curves with the same declared reference-system label and headphone category. Unknown or mismatched systems cannot be pooled.", 409);
    await db.prepare("INSERT OR IGNORE INTO community_catalogs VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(), period, String(type), JSON.stringify(await Promise.all(eligible.map(async (t) => ({ id: t.id, version: await targetContextVersion(t) })))), JSON.stringify(listeningPool.map(t => ({ url: t.url, version: t.sha256 ?? null }))), COMMUNITY_METHOD).run();
    catalog = await db.prepare("SELECT id,catalog_json,music_json FROM community_catalogs WHERE period=? AND headphone_type=?").bind(period, String(type)).first<{
        id: string;
        catalog_json: string;
        music_json: string;
    }>();
} if (!catalog)
    throw Error('Catalog unavailable'); const existing = await db.prepare("SELECT id FROM community_reference_blocks WHERE subject_id=? AND catalog_id=?").bind(subject, catalog.id).first(); if (existing)
    return nextReference(db, subject, participating, String(type),rig); const entries = JSON.parse(catalog.catalog_json) as CatalogTarget[], pairs = referencePairs(entries.map(t => t.id)), songs = JSON.parse(catalog.music_json) as {
    url: string;
    version: string | null;
}[], id = crypto.randomUUID(); const statements = [db.prepare("INSERT INTO community_reference_blocks VALUES(?,?,?,?,?,?,?)").bind(id, subject, catalog.id, permission.token, COMMUNITY_NOTICE_VERSION, setup, Date.now()), db.prepare("INSERT INTO submission_owners(record_kind,record_id,subject_id,session_hash) VALUES('community-reference',?,?,?)").bind(id, subject, sessionHash)]; for (let ordinal = 0; ordinal < REFERENCE_ROUNDS; ordinal++) {
    const index = randomIndex(pairs.length), pair = pairs[index], flip = randomIndex(2), song = songs[randomIndex(songs.length)];
    statements.push(db.prepare("INSERT INTO community_reference_assignments(id,block_id,ordinal,pair_index,pair_probability,side_probability,target_a_id,target_b_id,recording_id,recording_probability,recording_version) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, ordinal, index, 1 / pairs.length, .5, pair[flip], pair[1 - flip], song.url, 1 / songs.length, song.version));
} await db.batch(statements); return nextReference(db, subject, participating, String(type),rig); }
export async function answerReference(db: D1Database, subject: string, participating: boolean, body: Record<string, unknown>) { await active(db, subject, participating); const type = String(body.headphoneType); const next = await nextReference(db, subject, participating, type,body.rig); if (!('assignment' in next) || !next.assignment || body.id !== next.assignment.id)
    throw new RequestInputError("This is not the next reference assignment.", 409); if (body.setupFingerprint !== next.setupFingerprint)
    throw new RequestInputError("Restore the headphone setup assigned to this block.", 409); if (!['a', 'b', 'tie', 'skip'].includes(String(body.result)))
    throw new RequestInputError("Choose A, B, tie or skip.", 400); const intervals = parseIntervals(body.intervals), stats = intervalStats(intervals); if (!Array.isArray(body.intervals) || body.intervals.length > 200 || intervals.length !== body.intervals.length || intervals.some(row => row.rate !== 1))
    throw new RequestInputError('Invalid playback intervals.', 400); if (body.result !== 'skip' && (stats.heardA < 5 || stats.heardB < 5 || !matchedListeningProgress(intervals).complete || body.recordingId !== next.assignment.recordingId))
    throw new RequestInputError('Compare at least five seconds of shared source audio on both targets using the assigned song.', 400); const track = listeningPool.find(t => t.url === next.assignment.recordingId); if (!track || intervals.some(t => t.end > track.duration + .5))
    throw new RequestInputError('Playback exceeds the assigned recording.', 400); const block = await db.prepare('SELECT created_at FROM community_reference_blocks WHERE id=?').bind(next.block).first<{
    created_at: number;
}>(); const prior = await db.prepare('SELECT playback_json FROM community_reference_assignments WHERE block_id=? AND result IS NOT NULL').bind(next.block).all<{
    playback_json: string | null;
}>(); let elapsedHeard = stats.heardA + stats.heardB; for (const r of prior.results) {
    const x = intervalStats(parseIntervals(JSON.parse(r.playback_json || '[]')));
    elapsedHeard += x.heardA + x.heardB;
} if (!block || elapsedHeard > (Date.now() - block.created_at) / 1000 + 1)
    throw new RequestInputError('Playback intervals exceed elapsed block time.', 400); await db.prepare('UPDATE community_reference_assignments SET result=?,playback_json=?,answered_at=? WHERE id=? AND result IS NULL').bind(String(body.result), JSON.stringify(intervals), Date.now(), next.assignment.id).run(); return nextReference(db, subject, participating, type,body.rig); }
