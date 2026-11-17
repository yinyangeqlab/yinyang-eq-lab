"use client";

import { useEffect, useRef } from "react";
import { MeasurementEntryActions } from "@/components/headphone-picker";

type Props = {
  personal?: boolean;
  earTuning?: boolean;
  skip?: boolean;
  onSkipChange?: (value: boolean) => void;
  onReady: () => void;
  onCancel?: () => void;
  onMeasurementChoice?: (kind: "database" | "saved" | "upload") => void;
};

export default function BeforeYouListen({
  personal = false, earTuning = false, skip, onSkipChange, onReady, onCancel, onMeasurementChoice,
}: Props) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function trap(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>("a[href],button:not(:disabled),input:not(:disabled)") ?? [])
        .filter(item => item.getClientRects().length > 0);
      const first = items[0], last = items.at(-1);
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);

  return <div className="sound-check-backdrop">
    <section ref={dialog} tabIndex={-1} className="sound-check-dialog" role="dialog" aria-modal="true" aria-labelledby="sound-check-title"
      onKeyDown={event => { if (event.key === "Escape" && onCancel) { event.preventDefault(); onCancel(); } }}>
      <h2 id="sound-check-title">Before you listen</h2>
      <div className="sound-check-body">
        {earTuning && <p className="sound-check-ear-warning">
          <strong>Use a low listening level and short checks.</strong> If you have tinnitus, sound sensitivity, or an elevated risk of hearing damage, consider skipping these tests. Ask a hearing care professional if you are unsure. Stop if you notice discomfort, ringing, or worsening symptoms.
        </p>}
        <p>
          Turn off other equalizers or sound presets on your device, music player, and headphone app to avoid applying adjustments twice.
          {!earTuning && (personal
            ? " The website uses the left/right correction selected in Advanced setup: Auto, Uploaded or Off."
            : " The website handles supported left/right correction. Open Comparison can also use your saved correction file.")}
        </p>
        <p><strong>Set a comfortable volume.</strong> Avoid loud or prolonged listening and take quiet breaks. Loud sound can cause temporary hearing changes, permanent hearing loss, or tinnitus (ringing or buzzing).</p>
        <section className="sound-check-research" aria-labelledby="sound-check-who">
          <h3 id="sound-check-who">Listening levels and hearing health</h3>
          <p>Risk depends on volume and time. WHO gives weekly exposure limits of 80 dB for 40 hours, 90 dB for 4 hours, and 100 dB for 20 minutes. Use these as upper limits and keep everyday listening lower.</p>
          <p>{earTuning ? "The listening level slider controls browser output." : "The website’s LUFS setting and volume slider control playback levels."} Use your device’s headphone exposure monitoring, when available, to estimate the level at your ears.</p>
          <a href="https://www.who.int/news-room/questions-and-answers/item/deafness-and-hearing-loss-safe-listening" target="_blank" rel="noopener noreferrer">WHO safe listening and exposure times ↗</a>
          <a href="https://www.who.int/news-room/questions-and-answers/item/deafness-and-hearing-loss--tinnitus" target="_blank" rel="noopener noreferrer">WHO tinnitus and loud sound exposure ↗</a>
        </section>
        {onMeasurementChoice && <section className="sound-check-measurements" aria-label="Choose headphone measurement">
          <h3>First, find your headphone model</h3>
          <MeasurementEntryActions onBrowse={() => onMeasurementChoice("database")} onSaved={() => onMeasurementChoice("saved")} onUpload={() => onMeasurementChoice("upload")}/>
        </section>}
      </div>
      <div className="sound-check-actions">
        {onSkipChange && <>
          <label className="sound-check-skip"><input type="checkbox" checked={skip} onChange={event => onSkipChange(event.target.checked)}/>Don’t show again</label>
          <small className="sound-check-repeat-note">Leave unchecked to enable reminders before new tests. You can reopen this any time with Before You Listen.</small>
        </>}
        <div className="sound-check-decision">
          <button type="button" onClick={onReady}>I’m ready to listen</button>
          {onCancel && <button type="button" className="sound-check-cancel" onClick={onCancel}>Skip listening</button>}
        </div>
      </div>
    </section>
  </div>;
}
