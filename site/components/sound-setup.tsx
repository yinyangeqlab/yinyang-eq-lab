"use client";
import Link from "next/link";
import LibraryEqUpload from "./library-eq-upload";
import { useId, type ReactNode } from "react";
import type { LibraryEq } from "@/lib/music-library-eq";
import "./sound-setup.css";
export type SoundMode = "target" | "saved";
export default function SoundSetup({ mode, onMode, headphones, target, presets, presetId, onPreset, children }: { mode: SoundMode; onMode: (mode: SoundMode) => void; headphones: ReactNode; target: ReactNode; presets: LibraryEq[]; presetId: string; onPreset: (id: string) => void; children?: ReactNode }) {
  const id = useId();
  const selected = presets.find(eq => eq.id === presetId);
  const groups = new Map<string, { name: string; eqs: LibraryEq[] }>();
  for (const eq of presets) {
    const key = eq.measurementId || eq.headphone || "unlinked";
    const group = groups.get(key) || { name: eq.headphone || "Headphones not recorded", eqs: [] };
    group.eqs.push(eq);
    groups.set(key, group);
  }
  return <section className="sound-setup" aria-label="Headphones & EQ">
    <div className="sound-setup-grid"><div className="sound-headphones"><h3>Headphones</h3>{mode === "target" ? headphones : <div className="sound-linked-headphone"><strong>{selected ? selected.headphone || "Headphones not recorded" : "Choose a saved EQ"}</strong><p>{selected ? selected.measurementId ? "Linked to this saved EQ." : "This EQ has no saved headphone measurement link." : "Its saved headphones will appear here."}</p></div>}</div>
      <div className="sound-source"><div className="sound-mode" role="group" aria-label="EQ source"><button type="button" aria-pressed={mode === "target"} onClick={() => onMode("target")}>Target</button><button type="button" aria-pressed={mode === "saved"} onClick={() => onMode("saved")}>Saved EQ</button></div>
        {mode === "target" ? <div className="sound-target">{target}</div> : (
          <div className="sound-saved">
            <label className="sound-visually-hidden" htmlFor={id + "-eq"}>Saved EQ</label>
            <select id={id + "-eq"} value={presetId} onChange={event => onPreset(event.target.value)}>
              <option value="">Choose a saved EQ</option>
              {Array.from(groups, ([key, group]) => (
                <optgroup key={key} label={group.name}>
                  {group.eqs.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                </optgroup>
              ))}
            </select>
            {!presets.length && <p>No saved EQs yet. Upload your EQ settings below.</p>}
            <LibraryEqUpload onImported={eq => onPreset(eq.id)}/>
            <Link className="sound-manage-eqs" href="/shootout?tab=eqs" prefetch={false}>Manage saved EQs</Link>
          </div>
        )}
      </div></div>{children}
  </section>;
}
