"use client";
import { apiFetch } from "@/lib/service-warning";
import { useState } from "react";
import type { MusicPanelHandle } from "./music-panel";

const REASONS = ["Sounds harsh", "Too bright", "Too dark", "Too muddy", "Too loud", "Too quiet"] as const;
type Draft = { tags: string[]; note: string };
const empty = (): Draft => ({ tags: [], note: "" });

export default function FeedbackPanel({ open, pair, trialId, testMode, headphoneType, approved, music, getComparisonId, submissionsEnabled = true }: { open: boolean; pair: [string,string]; trialId: string | null; testMode: "blind" | "bring" | "open"; headphoneType: "ie" | "oe" | null; approved: boolean; music: React.RefObject<MusicPanelHandle | null>; getComparisonId: () => string; submissionsEnabled?: boolean }) {
  const [side, setSide] = useState<0|1>(0);
  const [drafts, setDrafts] = useState<[Draft,Draft]>([empty(),empty()]);
  const [submitted, setSubmitted] = useState<[boolean,boolean]>([false,false]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const draft = drafts[side];
  function update(next: Draft) { setDrafts(current => current.map((value,index) => index === side ? next : value) as [Draft,Draft]); }
  async function submit() {
    if (!submissionsEnabled) { setMessage("Agreement to comparison-data collection is required before using the listening tools."); return; }
    if (!draft.tags.length && !draft.note.trim()) { setMessage("Choose a description or enter feedback first."); return; }
    if (!headphoneType) { setMessage("Choose In-Ear or Over-Ear first."); return; }
    if (!approved) { setMessage("Descriptions of private targets are temporary drafts and are not saved or submitted. Choose approved targets to submit a description to the owner."); return; }
    if (testMode !== "open" && !trialId) { setMessage("Wait for the ranked pairing to load."); return; }
    setBusy(true); setMessage("");
    try {
      let participantId = localStorage.getItem("target-lab-voter");
      if (!participantId) { participantId = crypto.randomUUID(); localStorage.setItem("target-lab-voter", participantId); }
      const context = music.current?.snapshot();
      const response = await apiFetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        participantId, comparisonId: testMode === "open" ? getComparisonId() : trialId, testMode, headphoneType,
        targetAId: pair[0], targetBId: pair[1], reasonSide: side === 0 ? "a" : "b", reasonTags: draft.tags, otherReason: draft.note,
        shareSong: context?.consent === true, songTitle: context?.songTitle, songArtist: context?.songArtist, songAlbum: context?.songAlbum,
      }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Feedback could not be saved.");
      setSubmitted(current => current.map((value,index) => index === side ? true : value) as [boolean,boolean]);
      setMessage(`Sample ${side === 0 ? "A" : "B"} description submitted for owner review.`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Feedback could not be saved."); }
    finally { setBusy(false); }
  }
  return <section id="describe-panel" className="describe-panel" aria-label="Optional target descriptions" hidden={!open}><div className="describe-body"><div className="describe-side" role="group" aria-label="Choose sample to describe"><button type="button" className={side === 0 ? "active a" : ""} onClick={() => { setSide(0); setMessage(""); }}>Sample A{submitted[0] ? " · submitted" : ""}</button><button type="button" className={side === 1 ? "active b" : ""} onClick={() => { setSide(1); setMessage(""); }}>Sample B{submitted[1] ? " · submitted" : ""}</button></div><div className="feedback-tags">{REASONS.map(reason => <button key={reason} type="button" className={draft.tags.includes(reason) ? "selected" : ""} aria-pressed={draft.tags.includes(reason)} disabled={submitted[side]} onClick={() => update({ ...draft, tags: draft.tags.includes(reason) ? draft.tags.filter(value => value !== reason) : [...draft.tags,reason] })}>{reason}</button>)}</div><label>Other feedback (private to the owner)<input value={draft.note} onChange={event => update({ ...draft, note: event.target.value.slice(0,160) })} maxLength={160} disabled={submitted[side]} placeholder="What did you notice?" /></label><p className="describe-privacy">Submitted descriptions are visible only to the owner. They are managed in My data, separately from the browser’s My results. Descriptions of private targets remain temporary drafts and are not saved.</p><button type="button" className="describe-submit" disabled={busy || submitted[side]} onClick={() => void submit()}>{submitted[side] ? "Submitted" : busy ? "Submitting…" : "Submit"}</button></div>{message && <p className="describe-message" role="status">{message}</p>}</section>;
}
