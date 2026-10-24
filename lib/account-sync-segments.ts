import { RequestInputError } from '@/lib/request-json';
import { ACCOUNT_SYNC_KEYS, ACCOUNT_ARRAY_KEYS, validateAccountValues } from '@/lib/account-sync.mjs';
import { digest, accountDataDigest } from '@/lib/device-sync.mjs';
import { PART_CHARACTERS, PACKET_PARTS, assembleValues } from '@/lib/account-sync-transfer.mjs';
import { ACCOUNT_SYNC_NOTICE_VERSION } from '@/lib/account-sync-notice.mjs';
import { readAccountSync, syncLocation, type SyncAccount, type SyncState } from '@/lib/account-sync-state';
import type { accountSyncIdentity } from '@/lib/account-sync-identity';
type Account = Awaited<ReturnType<typeof accountSyncIdentity>>;
type Section = {
    kind: 'array' | 'value';
    count: number;
    digest: string;
    version: string;
};
type Manifest = Record<string, Section>;
type Version = {
    id: string;
    subject_id: string;
    device_id: string;
    epoch: string;
    base_revision: number;
    manifest: string;
    committed_at: number | null;
};
type Part = {
    key: string;
    entry: number;
    part: number;
    total: number;
    text: string;
    hash?: string;
};
function fail(message: string, status = 409): never { throw new RequestInputError(message, status); }
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function segmentedHead(payload: string): {
    format: 3;
    version: string;
    digest: string | null;
} | null { const value = JSON.parse(payload); return value?.format === 3 && typeof value.version === 'string' ? value : null; }
function authorization(account: Account) { return { sql: `EXISTS(SELECT 1 FROM private_tester_devices d JOIN account_device_status ds ON ds.session_hash=d.session_hash JOIN private_tester_invites i ON i.id=d.invite_id JOIN privacy_sessions s ON s.subject_id=? JOIN account_sync_permissions p ON p.subject_id=s.subject_id WHERE s.token_hash=? AND d.session_hash=? AND d.invite_id=? AND d.expires_at>? AND i.revoked_at IS NULL AND i.session_expires_at>unixepoch() AND s.expires_at>? AND ds.sync_enabled=1 AND p.enabled=1 AND p.notice_version=?) AND NOT EXISTS(SELECT 1 FROM owner_profile_devices revoked WHERE revoked.id=? AND revoked.revoked_at IS NOT NULL)`, args: [account.subject_id, account.syncSession, account.syncAccess, account.invite_id, Math.floor(Date.now() / 1000), Date.now(), ACCOUNT_SYNC_NOTICE_VERSION, account.deviceId] }; }
async function entries(db: D1Database, subject: string, key: string, version: string) { const result: {
    entry_index: number;
    content_hash: string | null;
    owner_kind: string | null;
    owner_id: string | null;
}[] = []; let after = -1; for (;;) {
    const rows = (await db.prepare('SELECT e.entry_index,e.content_hash,e.owner_kind,e.owner_id FROM account_sync_entries e JOIN account_sync_versions v ON v.id=e.version_id WHERE v.subject_id=? AND e.version_id=? AND e.storage_key=? AND e.entry_index>? ORDER BY e.entry_index LIMIT 256').bind(subject, version, key, after).all<typeof result[number]>()).results;
    result.push(...rows);
    if (rows.length < 256)
        return result;
    after = rows.at(-1)!.entry_index;
} }
async function sectionHashes(db: D1Database, subject: string, manifest: Manifest, verify = false) { const result: Manifest = {}; for (const [key, section] of Object.entries(manifest)) {
    const rows = await entries(db, subject, key, section.version);
    if (rows.some(row => !row.content_hash) || section.kind === 'value' && rows.length !== 1)
        fail('Saved account data is incomplete. Local data is unchanged.');
    const valueHash = section.kind === 'array' ? await digest({ kind: 'array', entries: rows.map(row => row.content_hash) }) : rows[0].content_hash!;
    if (verify && (rows.length !== section.count || valueHash !== section.digest))
        fail('Transfer is incomplete or does not match the saved-data manifest.');
    result[key] = { ...section, count: rows.length, digest: valueHash };
} return result; }
export async function syncSections(db: D1Database, account: SyncAccount, row: SyncState) {
    const head = segmentedHead(row.payload);
    if (!head)
        return null;
    const version = await db.prepare('SELECT manifest FROM account_sync_versions WHERE id=? AND subject_id=? AND committed_at IS NOT NULL').bind(head.version, account.subject_id).first<{
        manifest: string;
    }>();
    if (!version)
        fail('Saved account data is unavailable. Local data is unchanged.', 503);
    let sections = JSON.parse(version!.manifest) as Manifest;
    if (!head.digest) {
        sections = await sectionHashes(db, account.subject_id, sections);
        head.digest = await digest(Object.fromEntries(Object.entries(sections).map(([key, section]) => [key, section.digest])));
        const at = syncLocation(account);
        const fresh = await db.prepare(`UPDATE ${at.table} SET payload=? WHERE ${at.column}=? AND epoch=? AND revision=? AND payload=? RETURNING revision`).bind(JSON.stringify(head), at.id, row.epoch, row.revision, row.payload).first();
        if (!fresh)
            fail('Account changed while checking deletion. Retry with its current copy.');
        await db.prepare('UPDATE account_sync_versions SET manifest=? WHERE id=? AND subject_id=?').bind(JSON.stringify(sections), head.version, account.subject_id).run();
        row.payload = JSON.stringify(head);
    }
    return { sections, dataDigest: head.digest! };
}
export async function syncPartPage(db: D1Database, account: SyncAccount, row: SyncState, cursor = '') {
    const state = await syncSections(db, account, row);
    if (!state)
        return null;
    let after: [
        string,
        number,
        number
    ] = ['', -1, -1];
    if (cursor) {
        try {
            after = JSON.parse(cursor);
        }
        catch {
            fail('Invalid sync cursor.', 400);
        }
        if (!Array.isArray(after) || after.length !== 3 || typeof after[0] !== 'string' || after[0].length > 100 || !Number.isSafeInteger(after[1]) || !Number.isSafeInteger(after[2]))
            fail('Invalid sync cursor.', 400);
    }
    const rows = (await db.prepare(`SELECT p.storage_key AS key,p.entry_index AS entry,p.part_index AS part,e.part_count AS total,p.payload AS text,e.content_hash AS hash FROM account_sync_parts p JOIN account_sync_entries e ON e.version_id=p.version_id AND e.storage_key=p.storage_key AND e.entry_index=p.entry_index JOIN account_sync_versions v ON v.id=p.version_id WHERE v.subject_id=? AND EXISTS(SELECT 1 FROM json_each(?) j WHERE j.key=p.storage_key AND json_extract(j.value,'$.version')=p.version_id) AND (p.storage_key>? OR (p.storage_key=? AND p.entry_index>?) OR(p.storage_key=? AND p.entry_index=? AND p.part_index>?)) ORDER BY p.storage_key,p.entry_index,p.part_index LIMIT 3`).bind(account.subject_id, JSON.stringify(state.sections), after[0], after[0], after[1], after[0], after[1], after[2]).all<Part>()).results;
    const parts = rows.slice(0, 2), last = parts.at(-1);
    return { segmented: true, ...state, parts, nextPart: rows.length > 2 && last ? JSON.stringify([last.key, last.entry, last.part]) : null };
}
export async function storedAccountValues(db: D1Database, account: SyncAccount, row: SyncState) { if (!segmentedHead(row.payload))
    return validateAccountValues(JSON.parse(row.payload)); const parts: Part[] = []; let page = await syncPartPage(db, account, row); const sections = page!.sections; for (;;) {
    parts.push(...page!.parts);
    if (!page!.nextPart)
        break;
    page = await syncPartPage(db, account, row, page!.nextPart);
} return assembleValues(sections, parts); }
export async function storedAccountDigest(db: D1Database, account: SyncAccount, row: SyncState | null) { if (!row)
    return accountDataDigest({}); const sections = await syncSections(db, account, row); return sections ? sections.dataDigest : accountDataDigest(JSON.parse(row.payload)); }
async function stage(db: D1Database, account: Account, id: unknown) { if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id))
    fail('Invalid transfer identifier.', 400); const version = await db.prepare('SELECT * FROM account_sync_versions WHERE id=? AND subject_id=? AND device_id=? AND committed_at IS NULL').bind(id, account.subject_id, account.deviceId).first<Version>(); if (!version)
    fail('This transfer needs to restart. Saved copies are retained.'); const current = (await readAccountSync(db, account, true))!; if (current.epoch !== version!.epoch || current.revision !== version!.base_revision)
    fail('Account changed during transfer. Merge with its current copy before retrying.'); return { version: version!, current }; }
async function entryOwner(db: D1Database, account: Account, key: string, value: Record<string, unknown> | null) {
    if (!value || typeof value !== 'object')
        return null;
    if (key === 'target-lab-trials' && value.recorded === true) {
        const row = await db.prepare("SELECT record_kind,record_id FROM submission_owners WHERE subject_id=? AND ((record_kind='vote' AND record_id=?) OR(record_kind IN('run','open') AND record_id=?)) LIMIT 1").bind(account.subject_id, value.serverTrialId || value.id || '', value.id || '').first<{
            record_kind: string;
            record_id: string;
        }>();
        if (!row)
            fail('A saved result belongs to another account or was erased. Local data is unchanged.', 422);
        return row;
    }
    const kind = key === 'target-lab-measurements' && value.researchContributionId ? 'measurement' : key === 'target-lab-private-targets' && value.submissionId ? 'target' : null;
    if (!kind)
        return null;
    const id = kind === 'measurement' ? value.researchContributionId : value.submissionId;
    const row = await db.prepare('SELECT record_kind,record_id FROM submission_owners WHERE subject_id=? AND record_kind=? AND record_id=?').bind(account.subject_id, kind, id).first<{
        record_kind: string;
        record_id: string;
    }>();
    if (!row)
        fail('A saved contribution belongs to another account or was erased. Local data is unchanged.', 422);
    return row;
}
export async function segmentedSyncWrite(db: D1Database, account: Account, body: Record<string, unknown>) {
    const auth = authorization(account), at = syncLocation(account);
    if (body.action === 'begin') {
        if (typeof body.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.id) || typeof body.epoch !== 'string' || !Number.isSafeInteger(body.revision) || !body.manifest || typeof body.manifest !== 'object' || Array.isArray(body.manifest))
            fail('Read current account state before starting a transfer.', 400);
        const current = (await readAccountSync(db, account, true))!;
        if (current.epoch !== body.epoch || current.revision !== body.revision)
            fail('Account changed. Merge with its latest copy.');
        const previous = await syncSections(db, account, current), manifest: Manifest = {};
        for (const [key, raw] of Object.entries(body.manifest as Record<string, Record<string, unknown>>)) {
            if (!ACCOUNT_SYNC_KEYS.includes(key) || !raw || !['array', 'value'].includes(String(raw.kind)) || !Number.isSafeInteger(raw.count) || Number(raw.count) < 0 || raw.kind === 'value' && raw.count !== 1 || !hash(raw.digest))
                fail('Invalid saved-data section.', 400);
            if ((raw.kind === 'array') !== ACCOUNT_ARRAY_KEYS.includes(key) || raw.reuse !== undefined && typeof raw.reuse !== 'boolean')
                fail('Invalid section type.', 400);
            const old = previous?.sections[key];
            if (raw.reuse && (!old || old.digest !== raw.digest || old.kind !== raw.kind || old.count !== raw.count))
                fail('The reusable account section changed.');
            manifest[key] = { kind: raw.kind as Section['kind'], count: Number(raw.count), digest: raw.digest, version: raw.reuse ? old!.version : body.id };
        }
        const existing = await db.prepare('SELECT id FROM account_sync_versions WHERE id=? AND subject_id=? AND device_id=? AND committed_at IS NULL').bind(body.id, account.subject_id, account.deviceId).first();
        await db.prepare(`INSERT OR IGNORE INTO account_sync_versions(id,subject_id,device_id,epoch,base_revision,manifest,created_at) SELECT ?,?,?,?,?,?,? WHERE ${auth.sql}`).bind(body.id, account.subject_id, account.deviceId, body.epoch, body.revision, JSON.stringify(manifest), Date.now(), ...auth.args).run();
        const version = await stage(db, account, body.id);
        if (version.version.manifest !== JSON.stringify(manifest))
            fail('This transfer identifier already describes different data.');
        // Only unfinished transfers can expire; current committed data is never age-trimmed.
        await db.prepare(`DELETE FROM account_sync_versions WHERE subject_id=? AND committed_at IS NULL AND id<>? AND (device_id=? OR created_at<?) AND ${auth.sql}`).bind(account.subject_id, body.id, account.deviceId, Date.now() - 86400000, ...auth.args).run();
        return { ok: true, resumed: !!existing };
    }
    const { version, current } = await stage(db, account, body.id), manifest = JSON.parse(version.manifest) as Manifest;
    if (body.action === 'parts') {
        if (!Array.isArray(body.parts) || !body.parts.length || body.parts.length > PACKET_PARTS)
            fail('Invalid transfer packet.', 400);
        const statements: D1PreparedStatement[] = [], touched = new Map<string, {
            key: string;
            entry: number;
            total: number;
        }>();
        const stageGuard = `EXISTS(SELECT 1 FROM account_sync_versions v JOIN ${at.table} h ON h.${at.column}=? WHERE v.id=? AND v.subject_id=? AND v.device_id=? AND v.committed_at IS NULL AND h.epoch=v.epoch AND h.revision=v.base_revision) AND ${auth.sql}`;
        const guardArgs = [at.id, version.id, account.subject_id, account.deviceId, ...auth.args];
        for (const raw of body.parts) {
            if (!raw || typeof raw !== 'object' || Array.isArray(raw))
                fail('Invalid saved-data piece.', 400);
            const part = raw as Part, s = manifest[part.key];
            if (!s || s.version !== version.id || !Number.isSafeInteger(part.entry) || part.entry < 0 || part.entry >= s.count || !Number.isSafeInteger(part.total) || part.total < 1 || !Number.isSafeInteger(part.part) || part.part < 0 || part.part >= part.total || typeof part.text !== 'string' || !part.text.length || part.text.length > PART_CHARACTERS)
                fail('Invalid saved-data piece.', 400);
            statements.push(db.prepare(`INSERT OR IGNORE INTO account_sync_entries(version_id,storage_key,entry_index,part_count) SELECT ?,?,?,? WHERE ${stageGuard}`).bind(version.id, part.key, part.entry, part.total, ...guardArgs));
            statements.push(db.prepare(`INSERT OR IGNORE INTO account_sync_parts(version_id,storage_key,entry_index,part_index,payload) SELECT ?,?,?,?,? WHERE ${stageGuard} AND EXISTS(SELECT 1 FROM account_sync_entries e WHERE e.version_id=? AND e.storage_key=? AND e.entry_index=? AND e.part_count=? AND e.content_hash IS NULL)`).bind(version.id, part.key, part.entry, part.part, part.text, ...guardArgs, version.id, part.key, part.entry, part.total));
            touched.set(JSON.stringify([part.key, part.entry]), { key: part.key, entry: part.entry, total: part.total });
        }
        await db.batch(statements);
        for (const raw of body.parts) {
            const part = raw as Part, found = await db.prepare('SELECT p.payload,e.part_count FROM account_sync_parts p JOIN account_sync_entries e ON e.version_id=p.version_id AND e.storage_key=p.storage_key AND e.entry_index=p.entry_index WHERE p.version_id=? AND p.storage_key=? AND p.entry_index=? AND p.part_index=?').bind(version.id, part.key, part.entry, part.part).first<{
                payload: string;
                part_count: number;
            }>();
            if (found?.payload !== part.text || found.part_count !== part.total)
                fail('Transfer permission or an existing piece changed. Restart safely.');
        }
        for (const { key, entry, total } of touched.values()) {
            const ready = await db.prepare('SELECT content_hash FROM account_sync_entries WHERE version_id=? AND storage_key=? AND entry_index=?').bind(version.id, key, entry).first<{
                content_hash: string | null;
            }>();
            if (ready?.content_hash)
                continue;
            const rows = (await db.prepare('SELECT part_index,payload FROM account_sync_parts WHERE version_id=? AND storage_key=? AND entry_index=? ORDER BY part_index').bind(version.id, key, entry).all<{
                part_index: number;
                payload: string;
            }>()).results;
            if (rows.length !== total)
                continue;
            if (rows.some((row, index) => row.part_index !== index))
                fail('Transfer pieces are incomplete.');
            let value: unknown, owner: Awaited<ReturnType<typeof entryOwner>>;
            try {
                value = JSON.parse(rows.map(row => row.payload).join(''));
                validateAccountValues({ [key]: JSON.stringify(manifest[key].kind === 'array' ? [value] : value) });
                owner = await entryOwner(db, account, key, value as Record<string, unknown> | null);
            }
            catch (error) {
                await db.prepare('DELETE FROM account_sync_entries WHERE version_id=? AND storage_key=? AND entry_index=?').bind(version.id, key, entry).run();
                if (error instanceof RequestInputError)
                    throw error;
                fail('Invalid saved data. Embedded audio/files and browser handles cannot be synced.', 400);
            }
            const object = value as Record<string, unknown> | null, sourceIds = manifest[key].kind === 'array' && object && typeof object === 'object' ? [object.id, object.recordId, object.serverTrialId, object.researchContributionId, object.submissionId].filter(value => typeof value === 'string') : [];
            await db.prepare(`UPDATE account_sync_entries SET content_hash=?,source_ids=?,owner_kind=?,owner_id=? WHERE version_id=? AND storage_key=? AND entry_index=? AND ${stageGuard}`).bind(await digest(value), JSON.stringify([...new Set(sourceIds)]), owner?.record_kind || null, owner?.record_id || null, version.id, key, entry, ...guardArgs).run();
        }
        return { ok: true };
    }
    if (body.action !== 'commit')
        fail('Choose a transfer action.', 400);
    const sections = await sectionHashes(db, account.subject_id, manifest, true), dataDigest = await digest(Object.fromEntries(Object.entries(sections).map(([key, s]) => [key, s.digest]))), payload = JSON.stringify({ format: 3, version: version.id, digest: dataDigest });
    const owned = `NOT EXISTS(SELECT 1 FROM account_sync_entries e JOIN account_sync_versions v ON v.id=e.version_id WHERE v.subject_id=? AND EXISTS(SELECT 1 FROM json_each(?) j WHERE j.key=e.storage_key AND json_extract(j.value,'$.version')=e.version_id) AND e.owner_kind IS NOT NULL AND NOT EXISTS(SELECT 1 FROM submission_owners o WHERE o.subject_id=v.subject_id AND o.record_kind=e.owner_kind AND o.record_id=e.owner_id))`;
    await db.batch([
        db.prepare(`UPDATE ${at.table} SET payload=?,initialized=1,revision=revision+1,updated_at=? WHERE ${at.column}=? AND epoch=? AND revision=? AND ${auth.sql} AND ${owned} AND EXISTS(SELECT 1 FROM account_sync_versions WHERE id=? AND committed_at IS NULL)`).bind(payload, Date.now(), at.id, current.epoch, current.revision, ...auth.args, account.subject_id, JSON.stringify(sections), version.id),
        db.prepare(`UPDATE account_sync_versions SET committed_at=?,manifest=? WHERE id=? AND subject_id=? AND EXISTS(SELECT 1 FROM ${at.table} WHERE ${at.column}=? AND json_extract(payload,'$.version')=? AND epoch=? AND revision=?)`).bind(Date.now(), JSON.stringify(sections), version.id, account.subject_id, at.id, version.id, current.epoch, current.revision + 1),
    ]);
    const saved = (await readAccountSync(db, account))!;
    if (saved.epoch !== current.epoch || saved.revision !== current.revision + 1 || segmentedHead(saved.payload)?.version !== version.id)
        fail('Account data, ownership or device permission changed during transfer. Merge and retry.');
    // Retain every section referenced by the current head, including reused measurements.
    await db.prepare(`DELETE FROM account_sync_entries WHERE version_id IN(SELECT id FROM account_sync_versions WHERE subject_id=? AND committed_at IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM ${at.table} h JOIN account_sync_versions v ON v.id=json_extract(h.payload,'$.version') JOIN json_each(v.manifest) j WHERE h.${at.column}=? AND j.key=account_sync_entries.storage_key AND json_extract(j.value,'$.version')=account_sync_entries.version_id)`).bind(account.subject_id, at.id).run();
    await db.prepare(`DELETE FROM account_sync_versions WHERE subject_id=? AND committed_at IS NOT NULL AND id NOT IN(SELECT json_extract(h.payload,'$.version') FROM ${at.table} h WHERE h.${at.column}=? UNION SELECT json_extract(j.value,'$.version') FROM ${at.table} h JOIN account_sync_versions v ON v.id=json_extract(h.payload,'$.version') JOIN json_each(v.manifest) j WHERE h.${at.column}=?)`).bind(account.subject_id, at.id, at.id).run();
    await db.prepare(`UPDATE account_sync_versions SET manifest='{}' WHERE subject_id=? AND committed_at IS NOT NULL AND id NOT IN(SELECT json_extract(payload,'$.version') FROM ${at.table} WHERE ${at.column}=?)`).bind(account.subject_id, at.id).run();
    return { segmented: true, epoch: saved.epoch, revision: saved.revision, initialized: true, enabled: true, sections, dataDigest };
}
