"use client";

import { useState } from "react";
import AutoEqCurveStatus from "@/components/autoeq-curve-status";
import { downloadLocalFile } from "@/lib/channel-match-export";
import type { Point } from "@/lib/curves";
import { useAutoEqSourceCurves } from "@/lib/use-autoeq-source-curves";
import "./target-curve-downloads.css";

type Target = { id: string; name: string; points: Point[] };

export function TargetCurveDownloads({ target }: { target: Target }) {
  const [open, setOpen] = useState(false);
  return <details className="target-curve-downloads" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary aria-label={`Download target: ${target.name}`}>Download target</summary>
    {open && <DownloadFormats target={target}/>}
  </details>;
}

function DownloadFormats({ target }: { target: Target }) {
  const source = useAutoEqSourceCurves([target.id]);
  const { points } = source.resolve(target);

  function download(format: "csv" | "txt") {
    if (!source.ready || points.length < 2) return;
    const separator = format === "csv" ? "," : "\t";
    // Flat references have two endpoints in the player. Add equivalent rows so the importer accepts the file.
    const rows = target.id === "flat"
      ? [20, 40, 80, 160, 320, 640, 1000, 2000, 4000, 8000, 16000, 20000].map(hz => [hz, 0])
      : [...points].sort(([a], [b]) => a - b);
    const contents = [`frequency_hz${separator}level_db`, ...rows.map(point => point.join(separator))].join("\n") + "\n";
    const name = target.name.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "target";
    downloadLocalFile(`${name}.${format}`, contents, format === "csv" ? "text/csv" : "text/plain");
  }

  return <div className="target-curve-download-formats" role="group" aria-label={`Download formats for ${target.name}`}>
    <AutoEqCurveStatus {...source}/>
    {source.ready && points.length < 2 && <span role="status">Curve data is unavailable.</span>}
    <button type="button" disabled={!source.ready || points.length < 2} onClick={() => download("csv")}>CSV</button>
    <button type="button" disabled={!source.ready || points.length < 2} onClick={() => download("txt")}>TXT</button>
  </div>;
}
