"use client";

import { useId, useMemo, useState } from "react";
import type { ChannelMatch } from "@/lib/channel-balance";
import { channelMatchIirPreset, downloadLocalFile } from "@/lib/channel-match-export";
import {
  buildPlatformEq, EXPORT_CONTENTS, EXPORT_DESTINATIONS, platformEqIssue,
  recordedEqFormat, supportsContents, usesMain, usesMatch,
  type EqExportFile, type ExportContents, type ExportDestination, type QudelixModel,
} from "@/lib/platform-eq-export";
import type { FinalizedVariant } from "@/lib/preference-finalize";
import type { EqDeviceLimits } from "@/lib/use-generated-eq-results";
import "./eq-candidate-results.css";

type Props = {
  basename: string;
  fit?: FinalizedVariant;
  match?: ChannelMatch;
  matchName?: string;
  limits: EqDeviceLimits;
  onRecordedDownload?: (file: EqExportFile, fit: FinalizedVariant) => void;
  savesLocally?: boolean;
};

export const channelMatchSource = (match: ChannelMatch) =>
  match.channelMatchMode === "custom" ? "Uploaded left/right preset" : "YinYang AutoMatch";

const formatHelp: Partial<Record<ExportDestination, string>> = {
  equalizerapo: "Load this TXT in the Equalizer APO Configuration Editor as an Include.",
  peace: "Load this TXT as a separate Include in Equalizer APO alongside Peace. Direct import in Peace is pending verification.",
  "easy-effects-json": "In Easy Effects, open Output → Presets → Import and select the JSON.",
  easyeffects: "In the Easy Effects Equalizer, use Import APO for this shared stereo EQ.",
  soundsource: "In SoundSource, open Headphone EQ → Add Other Profile. This format supports Main EQ only. Mac import verification is pending.",
  apomac: "In APOMac, choose File → Import. Mac import verification is pending.",
  qudelix: "Import the USR file into Main EQ and the SPK file into Channel Match. Apply each file once. Values are rounded to device resolution. Device headroom adds to the exported preamp.",
};

export default function EqExportControls({ basename, fit, match, matchName, limits, onRecordedDownload, savesLocally }: Props) {
  const [contents, setContents] = useState<ExportContents>(fit ? "main" : "match");
  const [destination, setDestination] = useState<ExportDestination>(fit ? "txt" : "equalizerapo");
  const [model, setModel] = useState<QudelixModel>("5k");
  const [result, setResult] = useState<{ key: string; message: string; files?: EqExportFile[] }>();
  const helpId = useId();
  const needMatch = usesMatch(contents);
  const matchResult = useMemo(() => {
    if (!needMatch || !match || !limits.channelBands) return {};
    try {
      return { preset: channelMatchIirPreset(match, limits.channelBands) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not prepare Channel Match." };
    }
  }, [needMatch, match, limits.channelBands]);
  const selection = { contents, destination, model, fit, match: matchResult.preset, mainLimit: limits.mainBands };
  const issue = matchResult.error || (needMatch && match && !limits.channelBands
    ? "Set a Channel Match filter limit above zero to export IIR settings."
    : platformEqIssue(selection));
  const recorded = fit && onRecordedDownload && recordedEqFormat(destination, contents);
  const help = formatHelp[destination];
  const responseKey = JSON.stringify([basename, selection]);
  const shown = result?.key === responseKey ? result : undefined;
  const counts = matchResult.preset?.channels.map(channel => channel.filters.length);

  function changeContents(next: ExportContents) {
    setContents(next);
    if (!supportsContents(destination, next)) setDestination("equalizerapo");
  }

  function download() {
    if (issue) return;
    try {
      const { files, attenuationDb, mainPreampDb } = buildPlatformEq(selection, basename);
      const protection = attenuationDb ? " Added " + attenuationDb.toFixed(1) + " dB of headroom to both ears." : "";
      if (files.length > 1) {
        setResult({
          key: responseKey, files,
          message: "Download both files, then import each into the named Qudelix bank." + protection,
        });
      } else if (recorded && fit && onRecordedDownload) {
        onRecordedDownload(files[0], { ...fit, preamp: mainPreampDb ?? fit.preamp });
        setResult(protection ? { key: responseKey, message: protection.trim() } : undefined);
      } else {
        const file = files[0];
        downloadLocalFile(file.filename, file.text, file.mime);
        setResult({ key: responseKey, message: "Downloaded on this device." + protection });
      }
    } catch (error) {
      setResult({ key: responseKey, message: error instanceof Error ? error.message : "Could not export this EQ." });
    }
  }

  return <div className="eq-export-controls" role="group" aria-label={fit ? "Export EQ" : "Export Channel Match"}>
    <div className="eq-results-actions">
      {fit && <label>Export contents<select value={contents} onChange={event => changeContents(event.target.value as ExportContents)}>
        {(Object.entries(EXPORT_CONTENTS) as [ExportContents, string][]).map(([value, name]) =>
          <option key={value} value={value} disabled={value !== "main" && !match}>{name}</option>
        )}
      </select></label>}
      <label>Download format<select value={destination} aria-describedby={helpId} onChange={event => setDestination(event.target.value as ExportDestination)}>
        {(Object.entries(EXPORT_DESTINATIONS) as [ExportDestination, string][]).map(([value, name]) =>
          <option key={value} value={value} disabled={!supportsContents(value, contents)}>{name}</option>
        )}
      </select></label>
      {destination === "qudelix" && <label>Qudelix model<select value={model} onChange={event => setModel(event.target.value as QudelixModel)}>
        <option value="5k">Qudelix 5K</option>
        <option value="5k-plus">Qudelix 5K Plus</option>
      </select></label>}
      <button type="button" disabled={!!issue} aria-describedby={helpId} onClick={download}>
        {destination === "qudelix" && contents === "both" ? "Prepare Qudelix files" : contents === "match" ? "Download Channel Match" : "Download selected EQ"}
      </button>
    </div>
    <div className="eq-export-details" id={helpId}>
      {usesMain(contents) && fit && <span>Main EQ · {fit.filters.length} filters</span>}
      {needMatch && match && <span>{[matchName, channelMatchSource(match), counts && "Left " + counts[0] + " · Right " + counts[1] + " filters"].filter(Boolean).join(" · ")}</span>}
      {fit && !match && <span>Add paired measurements or an uploaded Channel Match to unlock the other export choices.</span>}
      {issue && <p role="status">{issue}</p>}
      {help && <p>{help}</p>}
      {destination === "qudelix" && model === "5k-plus" && contents === "both" && fit && fit.filters.length > 10 &&
        <p>Main EQ filters above the first 10 are included in both SPK channels for the layered mode.</p>}
      {needMatch && match?.channelMatchMode !== "custom" && match && <p>The editable IIR filters approximate AutoMatch.</p>}
      {(!recorded || savesLocally) && <p>This export stays on this device.</p>}
    </div>
    {shown && <p className="eq-results-caveat eq-export-status" role="status">{shown.message}</p>}
    {shown?.files && <div className="eq-results-actions eq-export-files">
      {shown.files.map(file => <button type="button" key={file.filename}
        onClick={() => downloadLocalFile(file.filename, file.text, file.mime)}>{file.label}</button>)}
    </div>}
  </div>;
}
