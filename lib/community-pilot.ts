import { communityEstimate, type CommunityBlock } from "@/lib/community-estimator";
import { COMMUNITY_NOTICE_VERSION } from "@/lib/community-notice";
import { targetContextVersion } from "@/lib/target-context-version";
export async function communityPilot(db: D1Database, catalogId: string) {
    const catalog = await db.prepare('SELECT catalog_json,method_version FROM community_catalogs WHERE id=?').bind(catalogId).first<{
        catalog_json: string;
        method_version: string;
    }>();
    if (!catalog)
        return null;
    const targets = JSON.parse(catalog.catalog_json) as {
        id: string;
        version: string;
    }[];
    const current = await db.prepare("SELECT id,name,points,measurement,headphone_type AS headphoneType,reference_system AS referenceSystem,submission_kind AS submissionKind,status FROM targets WHERE id IN(SELECT value FROM json_each(?))").bind(JSON.stringify(targets.map(t => t.id))).all<{
        id: string;
        points: string;
        status: string;
        headphoneType?: string;
        measurement?: string;
        referenceSystem?: string;
        submissionKind?: string;
    }>();
    for (const t of targets) {
        const now = current.results.find(r => r.id === t.id);
        if (!now || now.status !== 'approved' || await targetContextVersion(now) !== t.version)
            return { publicReady: false, status: 'catalog-changed', message: 'This frozen catalog is no longer comparable. No score was calculated.' };
    }
    const blocks = await db.prepare("SELECT b.id,b.subject_id FROM community_reference_blocks b JOIN community_personal_permissions p ON p.subject_id=b.subject_id JOIN privacy_accounts a ON a.subject_id=b.subject_id WHERE b.catalog_id=? AND b.notice_version=? AND p.enabled=1 AND p.notice_version=b.notice_version AND p.consent_token=b.consent_token AND a.submissions_enabled=1 AND b.subject_id NOT IN ('owner','invite:layout-test-only') AND NOT EXISTS(SELECT 1 FROM community_moderation m WHERE m.record_kind='community-reference' AND m.record_id=b.id AND m.excluded=1) LIMIT 501").bind(catalogId, COMMUNITY_NOTICE_VERSION).all<{
        id: string;
        subject_id: string;
    }>();
    if (blocks.results.length > 500)
        return { publicReady: false, status: 'analysis-limit', message: 'Use an offline reviewed analysis for more than 500 blocks.' };
    const assignments = await db.prepare('SELECT block_id,id,pair_index AS pairIndex,pair_probability AS probability,target_a_id AS a,target_b_id AS b,result FROM community_reference_assignments WHERE block_id IN(SELECT value FROM json_each(?)) ORDER BY block_id,ordinal LIMIT 5001').bind(JSON.stringify(blocks.results.map(b => b.id))).all<CommunityBlock['trials'][number] & {
        block_id: string;
    }>();
    if (assignments.results.length > 5000)
        return { publicReady: false, status: 'analysis-limit' };
    const input: CommunityBlock[] = blocks.results.map(block => ({ subject: block.subject_id, trials: assignments.results.filter(a => a.block_id === block.id) }));
    return { ...communityEstimate(targets.map(t => t.id), input), method: catalog.method_version };
}
export async function adaptiveCommunitySummary(db: D1Database) { const rows = await db.prepare("SELECT c.subject_id,c.target_a_id,c.target_b_id,c.result,c.headphone_type,c.protocol_version,c.scheduler_version,c.setup_fingerprint,c.selection_json,c.created_at FROM community_personal_choices c JOIN community_personal_permissions p ON p.subject_id=c.subject_id JOIN privacy_accounts a ON a.subject_id=c.subject_id WHERE p.enabled=1 AND p.consent_token=c.consent_token AND p.notice_version=c.notice_version AND a.submissions_enabled=1 AND c.subject_id NOT IN ('owner','invite:layout-test-only') AND NOT EXISTS(SELECT 1 FROM community_moderation m WHERE m.record_kind='community' AND m.record_id=c.id AND m.excluded=1) AND EXISTS(SELECT 1 FROM targets t WHERE t.id=c.target_a_id AND t.status='approved') AND EXISTS(SELECT 1 FROM targets t WHERE t.id=c.target_b_id AND t.status='approved') LIMIT 201").all<{
    subject_id: string;
    target_a_id: string;
    target_b_id: string;
    result: string;
    headphone_type: string;
    protocol_version: string;
    scheduler_version: string;
    setup_fingerprint: string;
    selection_json: string;
    created_at: number;
}>(); if (rows.results.length > 200)
    return { status: 'analysis-limit', publicReady: false, message:'Adaptive diagnostics are bounded to 200 rows to protect Worker cost. Use a reviewed offline analysis for larger datasets.' }; const current = await db.prepare("SELECT id,name,points,measurement,headphone_type AS headphoneType,reference_system AS referenceSystem,submission_kind AS submissionKind FROM targets WHERE status='approved' AND id IN(SELECT value FROM json_each(?))").bind(JSON.stringify([...new Set(rows.results.flatMap(r => [r.target_a_id, r.target_b_id]))])).all<{
    id: string;
    points: string;
    headphoneType?: string;
    measurement?: string;
    referenceSystem?: string;
    submissionKind?: string;
}>(); const versions = new Map(await Promise.all(current.results.map(async (t) => [t.id, await targetContextVersion(t)] as const))); const cells = new Map<string, Map<string, number[]>>(); let ties = 0; for (const r of rows.results) {
    const saved = JSON.parse(r.selection_json);
    if (saved.targetVersions?.[0] !== versions.get(r.target_a_id) || saved.targetVersions?.[1] !== versions.get(r.target_b_id))
        continue;
    const pair = [r.target_a_id, r.target_b_id].sort(), context = JSON.parse(r.selection_json);
    const key = JSON.stringify({ pair, headphones: r.headphone_type, protocol: r.protocol_version, scheduler: r.scheduler_version, period: new Date(r.created_at).toISOString().slice(0, 7), loudness: context.loudnessTarget, channel: context.channelMode, music: context.musicMode });
    const cell = cells.get(key) || new Map<string, number[]>(), scores = cell.get(r.subject_id) || [];
    const score = r.result === 'tie' ? .5 : r.result === 'a' ? 1 : 0;
    scores.push(r.target_a_id === pair[0] ? score : 1 - score);
    if (r.result === 'tie')
        ties++;
    cell.set(r.subject_id, scores);
    cells.set(key, cell);
} return { publicReady: false, kind: 'adaptive supporting evidence only', selectionCorrection: 'Unknown selection probabilities; no population or global ranking estimate.', ties, pairs: [...cells].map(([context, accounts]) => { const means = [...accounts.values()].map(v => v.reduce((a, b) => a + b, 0) / v.length); return { context: JSON.parse(context), accounts: means.length, accountMean: means.reduce((a, b) => a + b, 0) / means.length }; }) }; }
