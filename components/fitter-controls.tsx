"use client";
import { useId } from "react";
import { DEFAULT_FITTER, FIT_BANDS, FIT_METHODS, fitterLabel, type FitterSettings } from "@/lib/fitter-settings";
import "./fitter-controls.css";


export default function FitterControls({ value, defaultValue, onChange, onDefault, disabled = false, notice = "", advanced = false }: { value: FitterSettings; defaultValue: FitterSettings; onChange: (value: FitterSettings) => void; onDefault: (value: FitterSettings) => void; disabled?: boolean; notice?: string; advanced?: boolean }) {
  const id = useId();
  const isDefault = value.method === defaultValue.method && value.bands === defaultValue.bands;
  return <details className="fitter-controls"><summary>{advanced ? "Advanced EQ settings" : <>Fitter: {fitterLabel(value)} <span>{isDefault ? "Default" : "Temporary"}</span></>}</summary><div className="fitter-panel"><fieldset disabled={disabled}><legend>{advanced ? "Preview EQ calculation" : "EQ calculation"}</legend><div className="fitter-fields"><label htmlFor={`${id}-method`}>Method<select id={`${id}-method`} value={value.method} onChange={event => onChange({ ...value, method: event.target.value as FitterSettings["method"] })}>{FIT_METHODS.map(method => <option key={method} value={method}>{method === "peqdb" ? "PEQdB · bounded optimizer" : method === "precise" ? "Precise · movable bands" : "Standard · fixed bands"}</option>)}</select></label><label htmlFor={`${id}-bands`}>Bands<select id={`${id}-bands`} value={value.bands} onChange={event => onChange({ ...value, bands: Number(event.target.value) as FitterSettings["bands"] })}>{FIT_BANDS.map(bands => <option key={bands} value={bands}>{bands} bands</option>)}</select></label></div><label className="fitter-default"><input type="checkbox" checked={isDefault} onChange={event => onDefault(event.target.checked ? value : DEFAULT_FITTER)}/> Use this as my default</label><p>Selections are temporary unless marked as your default. Applies to new listening sessions in this browser.</p></fieldset>{notice && <p role="status">{notice}</p>}</div></details>;
}
