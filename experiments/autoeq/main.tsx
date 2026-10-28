import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BlindEqPlayer, prepareComparison } from '../../lib/blind-eq-audio';
import { exportFit, preset, type Comparison, type Fixture } from './compare';
import { at, fitGrid } from './engine';
import './style.css';

type Reply = { id: number; result?: Comparison; error?: string };
function download(name: string, content: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Listening({ result, rate }: { result: Comparison; rate: number }) {
  const [file, setFile] = useState<File | null>(null), [variant, setVariant] = useState(2), [start, setStart] = useState(0);
  const [busy, setBusy] = useState(false), [playing, setPlaying] = useState(false), [message, setMessage] = useState('');
  const [volume, setVolume] = useState(15), [side, setSide] = useState<0 | 1>(0), [reveal, setReveal] = useState(false);
  const player = useRef<BlindEqPlayer | null>(null), serial = useRef(0);
  const [mapping, setMapping] = useState<[0, 1] | [1, 0]>([0, 1]);
  const stop = useCallback(() => { serial.current++; const current = player.current; player.current = null; if (current) { void current.close(); if (current.context.state !== 'closed') void current.context.close(); } setPlaying(false); setBusy(false); }, []);
  useEffect(() => () => { serial.current++; const current = player.current; player.current = null; if (current) { void current.close(); if (current.context.state !== 'closed') void current.context.close(); } }, []);
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, [stop]);
  async function play() {
    if (!file) return;
    if (file.size > 100_000_000) { setMessage('Choose a music file under 100 MB.'); return; }
    stop(); const token = ++serial.current;
    setBusy(true); setMessage('Preparing one level-matched 15-second passage…'); setReveal(false);
    const order: [0, 1] | [1, 0] = crypto.getRandomValues(new Uint8Array(1))[0] < 128 ? [0, 1] : [1, 0];
    setMapping(order);
    let context: AudioContext;
    try { context = new AudioContext({ sampleRate: rate }); }
    catch { setBusy(false); setMessage('This browser could not create an audio context at the selected rate.'); return; }
    const current = new BlindEqPlayer(context); player.current = current;
    try {
      await context.resume();
      if (context.sampleRate !== rate) throw Error('This device uses a different sample rate. Choose its rate above and fit again.');
      const buffer = await context.decodeAudioData(await file.arrayBuffer());
      if (token !== serial.current) return;
      const fits = [result.fits[0], result.fits[variant]];
      const presets = order.map(index => preset(fits[index])) as Parameters<typeof prepareComparison>[1];
      const seconds = Math.min(15, buffer.duration - start);
      const prepared = await prepareComparison(buffer, presets, start, seconds, true);
      if (token !== serial.current) return;
      current.setVolume(volume / 100); current.play(prepared, 0); setSide(0); setPlaying(true); setBusy(false);
      setMessage('Same passage and matched rendered RMS. A/B identities stay hidden until Reveal.');
    } catch (error) {
      if (token === serial.current) { stop(); setMessage(error instanceof Error ? error.message : String(error)); }
    } finally {
      if (token !== serial.current || !current.playing) { await current.close(); if (context.state !== 'closed') await context.close(); }
    }
  }
  function changeSide(next: 0 | 1) { player.current?.switch(next); setSide(next); }
  return <section><h2>Listen without knowing which engine is playing</h2>
    <p>Use music from your device and the headphone measured above. Both presets process the same passage, with matched RMS and common peak headroom. Audio stays in this tab.</p>
    <div className="controls"><label>Compare current shootout with<select value={variant} disabled={busy || playing} onChange={e => setVariant(Number(e.target.value))}>
      <option value={2}>PEQdB · no smoothing</option><option value={3}>PEQdB · adaptive smoothing</option>
    </select></label><label>Local music<input aria-label="Local music" type="file" accept="audio/*" disabled={busy || playing} onChange={e => { stop(); setFile(e.target.files?.[0] ?? null); setMessage(''); }} /></label>
    <label>Passage start (seconds)<input type="number" min="0" max="86400" value={start} disabled={busy || playing} onChange={e => setStart(Math.max(0, Number(e.target.value)))} /></label></div>
    <div className="controls"><button disabled={!file || busy || playing} onClick={() => void play()}>Prepare and play</button><button disabled={!playing && !busy} onClick={stop}>Stop</button>
      <button aria-pressed={playing && side === 0} disabled={!playing} onClick={() => changeSide(0)}>Listen A</button><button aria-pressed={playing && side === 1} disabled={!playing} onClick={() => changeSide(1)}>Listen B</button>
      <button disabled={!playing} onClick={() => setReveal(true)}>Reveal engines</button><label>Volume {volume}%<input aria-label="Volume" type="range" min="0" max="100" value={volume} onChange={e => { const v = Number(e.target.value); setVolume(v); player.current?.setVolume(v / 100); }} /></label></div>
    <p role="status">{message}</p>{reveal && <p>A: {mapping[0] === 0 ? 'Current shootout' : result.fits[variant].label}. B: {mapping[1] === 0 ? 'Current shootout' : result.fits[variant].label}.</p>}
  </section>;
}

function Chart({ result }: { result: Comparison }) {
  const lines = [fitGrid.map(hz => at(result.fixture.target, hz) - at(result.fixture.points, hz)), ...result.fits.map(f => f.response)];
  const reference = fitGrid.findIndex(hz => hz >= 1000);
  const normalized = lines.map(row => row.map(value => value - row[reference]));
  const extent = Math.max(12, ...normalized.flat().map(Math.abs)), W = 960, H = 320;
  const path = (row: number[]) => row.map((v, i) => `${i ? 'L' : 'M'}${40 + i / 383 * (W - 60)},${H / 2 - v / extent * (H / 2 - 24)}`).join(' ');
  return <><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Desired correction and fitted responses, normalized at approximately 1 kHz">
    {[-extent, 0, extent].map(v => <g key={v}><line x1="40" x2={W - 20} y1={H / 2 - v / extent * (H / 2 - 24)} y2={H / 2 - v / extent * (H / 2 - 24)} stroke="#384451" /><text x="0" y={H / 2 - v / extent * (H / 2 - 24) + 4}>{v.toFixed(0)}</text></g>)}
    {normalized.map((row, i) => <path key={i} d={path(row)} fill="none" stroke={['#aab4c0', '#ffb454', '#aa94ef', '#63d7d0', '#80d179'][i]} strokeWidth={i ? 2 : 1} strokeDasharray={i ? undefined : '4 4'} />)}
    {[20, 100, 1000, 10000, 20000].map(hz => <text key={hz} x={40 + Math.log(hz / 20) / Math.log(1000) * (W - 60)} y={H - 2} textAnchor="middle">{hz >= 1000 ? `${hz / 1000}k` : hz}</text>)}
  </svg><p className="legend">Gray: desired · Orange: current shootout · Purple: current export · Cyan: PEQdB unsmoothed · Green: PEQdB adaptive. Hz, dB; curves aligned near 1 kHz.</p></>;
}

function App() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]), [selected, setSelected] = useState(0), [rate, setRate] = useState(48000);
  const [result, setResult] = useState<Comparison | null>(null), [batch, setBatch] = useState<Comparison[]>([]);
  const [busy, setBusy] = useState(false), [status, setStatus] = useState('Choose a headphone, then calculate. The WASM engine loads on the first calculation.');
  const worker = useRef<Worker | null>(null), pending = useRef(new Map<number, { resolve: (r: Comparison) => void; reject: (e: Error) => void; timeout: number }>()), id = useRef(0), idleTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const abort = new AbortController();
    fetch('/fixtures.json', { signal: abort.signal }).then(r => { if (!r.ok) throw Error('Run prepare.py to prepare the local fixtures.'); return r.json() as Promise<Fixture[]>; }).then(setFixtures).catch(e => { if (e.name !== 'AbortError') setStatus(e.message); });
    const requests = pending.current;
    return () => { abort.abort(); window.clearTimeout(idleTimer.current); worker.current?.terminate(); for (const p of requests.values()) { window.clearTimeout(p.timeout); p.reject(Error('Comparison closed.')); } requests.clear(); };
  }, []);
  function calculate(fixture: Fixture) {
    window.clearTimeout(idleTimer.current);
    if (!worker.current) {
      const current = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      current.onmessage = (event: MessageEvent<Reply>) => {
        const p = pending.current.get(event.data.id); if (!p) return;
        window.clearTimeout(p.timeout);
        pending.current.delete(event.data.id);
        if (event.data.error || !event.data.result) p.reject(Error(event.data.error || 'No result.')); else p.resolve(event.data.result);
        idleTimer.current = window.setTimeout(() => { if (!pending.current.size) { worker.current?.terminate(); worker.current = null; } }, 30000);
      };
      current.onerror = () => { for (const p of pending.current.values()) { window.clearTimeout(p.timeout); p.reject(Error('The worker could not load. Check that the local engine was built.')); } pending.current.clear(); current.terminate(); worker.current = null; };
      worker.current = current;
    }
    const next = ++id.current;
    return new Promise<Comparison>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        worker.current?.terminate(); worker.current = null;
        for (const p of pending.current.values()) { window.clearTimeout(p.timeout); p.reject(Error('The calculation timed out. Try again.')); }
        pending.current.clear();
      }, 20000);
      pending.current.set(next, { resolve, reject, timeout }); worker.current!.postMessage({ id: next, fixture, rate });
    });
  }
  async function run(all: boolean) {
    setBusy(true); setResult(null); setBatch([]);
    try {
      const rows: Comparison[] = [];
      for (const fixture of all ? fixtures : [fixtures[selected]]) {
        setStatus(`Calculating ${fixture.name} in a worker…`);
        const row = await calculate(fixture); rows.push(row); setBatch([...rows]);
      }
      setResult(rows[0]); setStatus(`Finished ${rows.length} measurement${rows.length > 1 ? 's' : ''} at ${(rate / 1000).toFixed(1)} kHz. Computation is now idle.`);
    } catch (e) { setStatus(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }
  return <main><header><p className="eyebrow">YINYANG EQ · LOCAL EXPERIMENT</p><h1>Does a closer fit sound different?</h1><p>Compare our current fitter with PEQdB’s WASM engine on public headphone measurements. A smaller fitting error does not establish an audible improvement.</p></header>
    <section><div className="controls"><label>Headphone measurement<select aria-label="Headphone measurement" value={selected} disabled={busy || !fixtures.length} onChange={e => { setSelected(Number(e.target.value)); setResult(null); }}>
      {fixtures.map((f, i) => <option value={i} key={f.sha}>{f.name} · {f.type === 'ie' ? 'in-ear' : 'over-ear'}</option>)}</select></label>
      <label>Playback sample rate<select aria-label="Playback sample rate" disabled={busy} value={rate} onChange={e => { setRate(Number(e.target.value)); setResult(null); setBatch([]); }}><option value={44100}>44.1 kHz</option><option value={48000}>48 kHz</option><option value={96000}>96 kHz</option></select></label>
      <button disabled={busy || !fixtures.length} onClick={() => void run(false)}>Compare selected</button><button disabled={busy || !fixtures.length} onClick={() => void run(true)}>Benchmark all six</button></div>
      <p role="status">{status}</p><p className="muted">Local files only. No account, participant records, rankings or Sync. No production deployment.</p></section>
    {batch.length > 0 && <section><h2>Measurement results</h2><p>Response-shape RMS in dB, with constant level offset removed. Equal log-frequency weighting. All presets use ten bands. Adaptive smoothing changes the objective; its raw-measurement error can be higher by design.</p>
      <div className="table-wrap"><table aria-label="Measurement benchmark"><thead><tr><th>Headphone</th><th>Engine</th><th>20 Hz–8 kHz</th><th>20 Hz–16 kHz</th><th>Fit time</th></tr></thead><tbody>{batch.flatMap(row => row.fits.map(f => <tr key={row.fixture.sha + f.label}><td>{row.fixture.name}</td><td>{f.label}</td><td>{f.rms8k.toFixed(3)}</td><td>{f.rms16k.toFixed(3)}</td><td>{f.fitMs.toFixed(1)} ms</td></tr>))}</tbody></table></div>
      <button onClick={() => download('autoeq-local-comparison.json', JSON.stringify({ rate, methodology: 'Shape RMS, equal log frequency, offset removed; 10 bands; PEQdB 3000 steps; raw-measurement objective.', results: batch }, null, 2), 'application/json')}>Download benchmark</button>
      {batch.length > 1 && <div className="controls">{batch.map(row => <button key={row.fixture.sha} aria-pressed={result === row} onClick={() => setResult(row)}>{row.fixture.name}</button>)}</div>}</section>}
    {result && <><section><h2>{result.fixture.name}</h2><p>{result.fixture.source} · {result.fixture.rig} · {result.fixture.targetName}. <a href={result.fixture.sourceUrl} target="_blank" rel="noreferrer">Measurement source</a></p><Chart result={result} />
      <p>Current shootout vs unsmoothed PEQdB response difference: {result.difference8k.toFixed(3)} dB RMS through 8 kHz; {result.difference16k.toFixed(3)} dB through 16 kHz. WASM linear memory: {(result.wasmMemory / 1048576).toFixed(1)} MiB. Whole worker job: {result.totalMs.toFixed(0)} ms, including scoring and headroom checks.</p>
      <div className="controls">{result.fits.map((fit, i) => <button key={fit.label} onClick={() => download(`autoeq-${i + 1}.txt`, exportFit(fit))}>Export {i === 0 ? 'current shootout' : i === 1 ? 'current export' : i === 2 ? 'PEQdB unsmoothed' : 'PEQdB adaptive'}</button>)}</div></section>
      <Listening key={`${result.fixture.sha}-${rate}`} result={result} rate={rate} /></>}
    <footer>Engine: autoeq-c fdc0db7 · Copyright © 2026 PEQdB Inc. · LGPL-3.0-or-later. <a href="/engine/LICENSE">LGPLv3</a> · <a href="/engine/COPYING">GPLv3</a> · <a href="/engine/source.tar.gz">Exact engine and application source, patches and build recipe</a>. Measurements and targets: AutoEq / oratory1990, pinned by Git blob hash. This experiment runs outside the production application.</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
