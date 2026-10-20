"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CommunitySharing from '@/components/community-sharing';
import CommunityMethod from '@/components/community-method';
import MusicPanel, { type MusicPanelHandle } from '@/components/music-panel';
import BeforeYouListen from '@/components/before-you-listen';
import { useListeningReminder } from '@/components/use-listening-reminder';
import type { PersonalSharingState } from '@/lib/personal-contribution-status';
import type { HeadphoneMeasurement } from '@/lib/measurement';
import type { Point } from '@/lib/curves';
import { listeningPool } from '@/lib/music-catalog';
import { matchedListeningProgress } from '@/lib/matched-listening';
import { communityEstimate } from '@/lib/community-estimator';
import TournamentHeader from '@/components/tournament-header';
import './community.css';
type Assignment = {
    id: string;
    ordinal: number;
    recordingId: string;
    pair: [
        string,
        string
    ];
    targets: {
        id: string;
        points: Point[];
    }[];
};
type Reference = {
    block: string | null;
    setupFingerprint?: string;
    assignment?: Assignment;
    complete?: boolean;
    answered?: number;
    rounds?: number;
};
async function digest(value: unknown) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
export default function CommunityPreferences() {
    const [permission, setPermission] = useState<PersonalSharingState>({ enabled: false, token: null, state: 'checking' }), [measurements, setMeasurements] = useState<HeadphoneMeasurement[]>([]), [measurementId, setMeasurementId] = useState(''), [reference, setReference] = useState<Reference | null>(null), [preview, setPreview] = useState(false), [example, setExample] = useState(false), [exampleMode, setExampleMode] = useState('empty'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [heard, setHeard] = useState<[
        number,
        number
    ]>([0, 0]), [side, setSide] = useState<0 | 1>(0);
    const player = useRef<MusicPanelHandle>(null), setupKey = useRef(''), requestVersion = useRef(0);
    const reminder = useListeningReminder();
    const measurement = measurements.find(m => m.id === measurementId);
    const referenceMeasurement = useMemo(() => measurement ? { ...measurement, channelMatchMode: undefined, channelMatchPreset: undefined, leftPoints: undefined, rightPoints: undefined } : undefined, [measurement]);
    const permissionChanged = useCallback((p: PersonalSharingState) => { setPermission(p); if (p.state === 'ready' && !p.enabled && !p.testOnly)
        player.current?.pause(); }, []);
    useEffect(() => { try {
        const rows = JSON.parse(localStorage.getItem('target-lab-measurements') || '[]');
        setMeasurements(Array.isArray(rows) ? rows : []);
    }
    catch { } }, []);
    async function call(body: unknown) { const version = ++requestVersion.current; setBusy(true); setError(''); try {
        const r = await fetch('/api/community-preferences/reference', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), b = await r.json() as Reference & {
            error?: string;
        };
        if (version !== requestVersion.current) return;
        if (!r.ok)
            throw Error(b.error || 'Could not save this check.');
        setReference(b);
        setHeard([0, 0]);
    }
    catch (e) {
        if (version !== requestVersion.current) return;
        setError(e instanceof Error ? e.message : String(e));
    }
    finally {
        if (version === requestVersion.current) setBusy(false);
    } }
    async function start() { if (!measurement)
        return; setupKey.current = await digest({ measurement: measurement.points, type: measurement.type, rig: measurement.rig, loudness: '-16', channel: 'off' }); setPreview(false); await call({ action: 'start', headphoneType: measurement.type, rig:measurement.rig, setupFingerprint: setupKey.current }); }
    async function answer(result: 'a' | 'b' | 'tie' | 'skip') { const snapshot = player.current?.snapshot(); if (result !== 'skip' && (!snapshot || snapshot.heardA < 5 || snapshot.heardB < 5 || !matchedListeningProgress(snapshot.intervals).complete)) {
        setError('Listen to the same five seconds on A and B first.');
        return;
    } player.current?.pause(); if (preview) {
        setReference(null);
        setError('Preview finished. No answer was saved or sent.');
        return;
    } if (!reference?.assignment || !measurement)
        return; await call({ action: 'answer', id: reference.assignment.id, headphoneType: measurement.type, rig:measurement.rig, setupFingerprint: setupKey.current, result, recordingId: snapshot?.recordingId, intervals: snapshot?.intervals || [] }); }
    async function previewCheck() {
        setError(''); setBusy(true);
        try {
            const response = await fetch('/api/targets');
            if (!response.ok) throw Error('Sample curves could not be loaded. Try again.');
            const rows = await response.json() as {id:string;points:Point[]}[];
            if (!Array.isArray(rows) || rows.length < 2) throw Error('Two sample curves are needed for this preview.');
            setPreview(true); setHeard([0, 0]);
            setReference({block:'preview-only',answered:0,rounds:10,assignment:{id:'preview-only',ordinal:0,recordingId:listeningPool[0].url,pair:[rows[0].id,rows[1].id],targets:rows.slice(0,2).map(row=>({id:row.id,points:row.points}))}});
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Preview unavailable.'); }
        finally { setBusy(false); }
    }
    const assignment = reference?.assignment;
    const matched = matchedListeningProgress(player.current?.snapshot()?.intervals || []);
    const refreshHeard = useCallback((value: [number, number]) => { setHeard([...value]); }, []);
    const referenceSongs = useMemo(() => assignment ? [assignment.recordingId] : [], [assignment?.recordingId]);
    const ready = !!assignment && matched.complete;
    const exampleRows = useMemo(() => { const ids = ['Example A', 'Example B', 'Example C']; if (exampleMode === 'empty')
        return communityEstimate(ids, []); const pairs = [[ids[0], ids[1]], [ids[0], ids[2]], [ids[1], ids[2]]]; return communityEstimate(ids, Array.from({ length: 120 }, (_, a) => ({ subject: 'synthetic-' + a, trials: Array.from({ length: 10 }, (_, i) => { const p = (a + i) % 3, [left, right] = pairs[p]; return { id: a + '-' + i, pairIndex: p, probability: 1 / 3, a: left, b: right, result: exampleMode === 'ties' ? 'tie' as const : p === 1 ? 'b' as const : 'a' as const }; }) }))); }, [exampleMode]);
    return <main className="shell community-page"><div className="site-contents" inert={reminder.open}><TournamentHeader/><div className="content shootout-content community-content"><header><span className="mini-label">PROSPECTIVE RESEARCH PILOT</span><h1>Community Preferences</h1><p>Patterns from Personal Tournaments, checked against a separate randomized reference sample.</p></header><p className="community-pilot-notice"><strong>Validation pilot</strong> · Public numeric results remain withheld pending independent listener validation and privacy review.</p><CommunitySharing onChange={permissionChanged}/><section className="community-panel"><h2>Optional reference checks</h2><p>Compare the same audio on two targets. Each block contains ten assigned comparisons; your headphone measurement stays on this device.</p><details className="community-reference-help"><summary>Setup, timing and skipped-check rules</summary><p>Ten assignments are fixed before your answers. Compare at least five seconds of source audio on both sides. Shared passages can be separate sections of the song. Pause and resume in this account; keep the same setup. Skipping is allowed, but a block with skipped or missing answers is excluded from the primary complete-block estimate. We record that missingness for validation.</p><p>Reference checks require the same declared rig/reference-system label as your measurement. Unknown or mismatched systems are not pooled. They use Listening Pool music, −16 LUFS source matching and channel correction off. Your measurement stays on this device. <a href="/shootout?tab=measurements">Add an upload or catalog measurement</a> first.</p></details><label>Headphone setup<select disabled={!!assignment} value={measurementId} onChange={e => setMeasurementId(e.target.value)}><option value="">Choose a saved measurement</option>{measurements.map(m => <option key={m.id} value={m.id}>{m.name} · {m.rig}</option>)}</select></label><div className="community-actions"><button disabled={busy || !measurement || !permission.enabled || permission.testOnly} onClick={() => void start()}>Start or resume ten reference checks</button>{permission.testOnly && <button disabled={busy} onClick={() => void previewCheck()}>Preview a check · no contribution</button>}</div>{reference?.complete && <p role="status">This reference block is complete. You can manage or delete it in My data.</p>}{assignment && <><p>{preview ? 'Test preview · no answer is sent' : `Reference check ${assignment.ordinal + 1} / ${reference?.rounds}`} · listen before choosing.</p><div className="community-listen"><button aria-pressed={side === 0} onClick={() => void player.current?.listen(0)}>Listen A <small>{matched.displaySeconds.toFixed(1)} / 5 s matched</small></button><button aria-pressed={side === 1} onClick={() => void player.current?.listen(1)}>Listen B <small>{matched.displaySeconds.toFixed(1)} / 5 s matched</small></button></div><div className={`community-match-status ${ready ? 'complete' : ''}`} role="status" aria-live="off"><strong>Shared audio compared · {matched.displaySeconds.toFixed(1)} / 5 s</strong><progress aria-label="Source audio heard on both A and B" max={5} value={Math.min(5, matched.seconds)}/><span>Only audio heard on both A and B counts. Different shared passages add together; replaying the same passage does not add extra time.</span><small>A listened: {matched.heardA.toFixed(1)} s · B listened: {matched.heardB.toFixed(1)} s · {matched.segments.length} shared {matched.segments.length === 1 ? 'passage' : 'passages'}</small></div><div className="music-panel-host"><MusicPanel key={assignment.id} ref={player} beforePlayback={reminder.request} pair={assignment.pair} testMode="blind" loudnessTarget="-16" targets={assignment.targets} suggestions={[]} measurement={referenceMeasurement} includedRecordingIds={referenceSongs} consent={false} onSideChange={setSide} onHeard={refreshHeard} onPassagePlay={() => void player.current?.playPassage()}/></div><div className="community-actions community-votes"><button disabled={busy || !ready || !preview && !permission.enabled} onClick={() => void answer('a')}>Prefer A</button><button disabled={busy || !ready || !preview && !permission.enabled} onClick={() => void answer('tie')}>No Preference / Tie</button><button disabled={busy || !ready || !preview && !permission.enabled} onClick={() => void answer('b')}>Prefer B</button><button disabled={busy || !preview && !permission.enabled} onClick={() => void answer('skip')}>Skip this check</button><button onClick={() => { requestVersion.current++; setBusy(false); player.current?.pause(); setReference(null); setHeard([0, 0]); setPreview(false); }}>Pause reference block</button></div></>}{error && <p role="status">{error}</p>}</section><section className="community-panel"><h2>Results are still being validated</h2><p>Public numeric results are withheld while independent listener validation and privacy review are pending. We will show uncertainty and inconclusive results rather than promise a universal winner. Older private-only contributions stay private.</p><button onClick={() => setExample(v => !v)}>{example ? 'Hide' : 'View'} simulated results layout</button>{example && <div className="community-example"><strong>Simulated example · no participant data</strong><label>Example scenario<select value={exampleMode} onChange={e => setExampleMode(e.target.value)}><option value="empty">No evidence</option><option value="ties">All ties</option><option value="cycle">Preference cycle</option></select></label>{exampleRows.rows.map(r => <p key={r.id}>{r.id} · {r.state.replaceAll("-", " ")} · {r.score === null ? "no estimate" : `approximate band ${Math.floor(r.lower * 10) * 10}–${Math.ceil(r.upper * 10) * 10}%`} · no rank assigned</p>)}{exampleRows.cycle && <p>Preferences form a cycle. No universal winner is claimed.</p>}</div>}<CommunityMethod /></section></div></div>{reminder.open && <BeforeYouListen skip={reminder.skip} onSkipChange={reminder.setSkip} onReady={reminder.ready}/>}</main>;
}
