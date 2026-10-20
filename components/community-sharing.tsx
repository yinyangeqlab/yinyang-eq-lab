"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { COMMUNITY_NOTICE, COMMUNITY_NOTICE_VERSION } from "@/lib/community-notice";
import { notifySharingChoicesChanged } from "@/lib/browser-data";
import type { PersonalSharingState } from "@/lib/personal-contribution-status";
export type PersonalSharing = PersonalSharingState;
const ignoreChange = (_choice: PersonalSharing) => { };
export default function CommunitySharing({ onChange = ignoreChange }: {
    onChange?: (choice: PersonalSharing) => void;
}) {
    const [choice, setChoice] = useState<PersonalSharing>({ enabled: false, token: null }), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false), [error, setError] = useState("");
    const requestVersion = useRef(0), pendingSave = useRef(false), queuedReload = useRef(false);
    const load = useCallback(async () => {
        if (pendingSave.current) {
            queuedReload.current = true;
            return;
        }
        const version = ++requestVersion.current;
        onChange({ enabled: false, token: null, state: "checking" });
        setLoaded(false);
        try {
            const response = await fetch("/api/community-preferences/personal", { cache: "no-store" });
            const result = await response.json() as PersonalSharing & {
                error?: string;
            };
            if (version !== requestVersion.current)
                return;
            if (!response.ok)
                throw Error(result.error || "Could not load research sharing.");
            const confirmed = { ...result, state: "ready" as const };
            setChoice(confirmed);
            onChange(confirmed);
            setLoaded(true);
            setError("");
        }
        catch (cause) {
            if (version !== requestVersion.current)
                return;
            onChange({ enabled: false, token: null, state: "unavailable" });
            setError(cause instanceof Error ? cause.message : "Sharing unavailable.");
        }
    }, [onChange]);
    useEffect(() => { void load(); window.addEventListener("yinyang-data-changed", load); const storage = () => void load(); window.addEventListener("storage", storage); const focus = () => void load(); window.addEventListener("focus", focus); return () => { requestVersion.current++; window.removeEventListener("yinyang-data-changed", load); window.removeEventListener("storage", storage); window.removeEventListener("focus", focus); }; }, [load]);
    async function save(enabled: boolean) {
        if (pendingSave.current)
            return;
        pendingSave.current = true;
        const version = ++requestVersion.current;
        setBusy(true);
        setLoaded(false);
        onChange({ enabled: false, token: null, state: "checking" });
        try {
            const response = await fetch("/api/community-preferences/personal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, acknowledged: enabled, noticeVersion: COMMUNITY_NOTICE_VERSION }) });
            const result = await response.json() as PersonalSharing & {
                error?: string;
            };
            if (version !== requestVersion.current)
                return;
            if (!response.ok)
                throw Error(result.error || "Sharing could not be saved.");
            const confirmed = { ...result, state: "ready" as const };
            setChoice(confirmed);
            onChange(confirmed);
            setLoaded(true);
            setError("");
            notifySharingChoicesChanged();
        }
        catch (cause) {
            if (version !== requestVersion.current)
                return;
            pendingSave.current = false;
            queuedReload.current = false;
            const message = cause instanceof Error ? cause.message : "Sharing could not be saved.";
            await load();
            setError(message);
        }
        finally {
            pendingSave.current = false;
            setBusy(false);
            if (queuedReload.current && version === requestVersion.current) {
                queuedReload.current = false;
                void load();
            }
        }
    }
    return <details className="personal-research-settings"><summary>Community Preferences contribution · {loaded ? (choice.testOnly ? "Test account" : choice.enabled ? "On" : "Off") : error ? "unavailable" : "checking"}</summary>{choice.testOnly && <p className="admin-test-notice">Private Test Mode · Personal progress stays local. Community contributions are disabled for this account.</p>}<p>{COMMUNITY_NOTICE}</p><label><input type="checkbox" checked={loaded && choice.enabled} disabled={busy || !loaded || choice.testOnly === true} onChange={event => void save(event.target.checked)}/> Contribute future Personal choices to Community Preferences</label><p>Account setting shared across linked browsers. Local progress and listening remain available when this is off. <a href="/my-data">Manage sharing and delete contributions →</a></p>{error && <p role="status">{error} <button type="button" onClick={() => void load()}>Retry sharing settings</button></p>}</details>;
}
