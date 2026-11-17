"use client";
import { useId } from "react";
import { DEFAULT_FITTER, FIT_BANDS, fitterLabel, isPeqdbMethod, type FitterSettings } from "@/lib/fitter-settings";
import { FITTER_GUIDE_PATH } from "@/lib/share-pages.mjs";
import "./fitter-controls.css";

export default function FitterControls({ value, defaultValue, onChange, onDefault, disabled = false, notice = "", advanced = false }: { value: FitterSettings; defaultValue: FitterSettings; onChange: (value: FitterSettings) => void; onDefault: (value: FitterSettings) => void; disabled?: boolean; notice?: string; advanced?: boolean }) {
  const id = useId();
  const isDefault = value.method === defaultValue.method && value.bands === defaultValue.bands;
  return <details className="fitter-controls">
    <summary>{advanced ? "Advanced EQ settings" : <>Fitter: {fitterLabel(value)} <span>{isDefault ? "Default" : "Temporary"}</span></>}</summary>
    <div className="fitter-panel">
      <fieldset disabled={disabled}>
        <legend>{advanced ? "Preview EQ calculation" : "EQ calculation"}</legend>
        <div className="fitter-fields">
          <label htmlFor={`${id}-method`}><span id={`${id}-method-label`}>Method</span>
            <select id={`${id}-method`} aria-labelledby={`${id}-method-label`} aria-describedby={advanced ? `${id}-method-help` : isPeqdbMethod(value.method) ? `${id}-peqdb-help` : undefined} value={value.method} onChange={event => onChange({ ...value, method: event.target.value as FitterSettings["method"] })}>
              <option value="standard">Standard · Fixed bands</option>
              <option value="precise">Precise · Movable bands</option>
              <optgroup label="PEQdB AutoEQ">
                <option value="peqdb">PEQdB · Unsmoothed</option>
                <option value="peqdb-smoothed">PEQdB · Smoothed</option>
              </optgroup>
            </select>
          </label>
          <div>
            <label htmlFor={`${id}-bands`}>Bands
              <select id={`${id}-bands`} aria-describedby={advanced ? `${id}-band-help` : undefined} value={value.bands} onChange={event => onChange({ ...value, bands: Number(event.target.value) as FitterSettings["bands"] })}>
                {FIT_BANDS.map(bands => <option key={bands} value={bands}>{bands} bands</option>)}
              </select>
            </label>
            {advanced && <p id={`${id}-band-help`} className="fitter-band-help">Sets how many EQ filters the app can use. Start with 10. Try more if narrow peaks or dips still need correcting.</p>}
          </div>
        </div>
        {advanced && <ul id={`${id}-method-help`} className="fitter-method-help">
          <li><strong>Standard · Fixed bands</strong> uses the same evenly spaced frequencies for a given band count. It tries a few widths shared by all bands and fits each band’s boost or cut. Start here for broad changes.</li>
          <li><strong>Precise · Movable bands</strong> chooses a frequency, width, and boost or cut one band at a time. Each new band tackles what’s still off target. Try it for narrow peaks or dips between Standard’s bands.</li>
          <li><strong>PEQdB</strong> fits bell filters and bass and treble shelves together. Unsmoothed follows finer measurement details. Smoothed softens narrow peaks and dips before fitting.</li>
        </ul>}
        {!advanced && isPeqdbMethod(value.method) && <p id={`${id}-peqdb-help`}>Unsmoothed follows finer details. Smoothed softens narrow peaks and dips before fitting.</p>}
        <p><a href={FITTER_GUIDE_PATH}>Compare fitters and see the benchmark</a></p>
        <label className="fitter-default"><input type="checkbox" checked={isDefault} onChange={event => onDefault(event.target.checked ? value : DEFAULT_FITTER)}/> Use this as my default</label>
        <p>Selections are temporary unless marked as your default. Applies to new listening sessions in this browser.</p>
      </fieldset>
      {notice && <p role="status">{notice}</p>}
    </div>
  </details>;
}
