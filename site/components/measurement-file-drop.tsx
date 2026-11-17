"use client";
import { useRef, useState } from "react";

export default function MeasurementFileDrop({ name, label, disabled, secondary = false, onPicked }: { name: string; label: string; disabled: boolean; secondary?: boolean; onPicked: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState("");
  const [dragging, setDragging] = useState(false);
  return <label className={`file-label measurement-drop${secondary ? " measurement-drop-secondary" : ""}${disabled ? " is-disabled" : ""}${dragging ? " is-dragging" : ""}`}
    onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)}
    onDrop={event => {
      event.preventDefault(); setDragging(false);
      if (disabled || !input.current || event.dataTransfer.files.length !== 1) return;
      input.current.files = event.dataTransfer.files;
      setFilename(event.dataTransfer.files[0].name); onPicked();
    }}>
    {label}<input ref={input} name={name} type="file" disabled={disabled} accept=".csv,.txt,text/csv,text/plain" onChange={event => { setFilename(event.target.files?.[0]?.name || ""); onPicked(); }}/>
    <span className="drop-zone"><strong>{filename || "Drop CSV / TXT here or choose file"}</strong><small>Frequency (Hz), level (dB) · up to 4 MB</small></span>
  </label>;
}
