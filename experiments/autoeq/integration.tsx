import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import MusicPanel, { type MusicPanelHandle } from '../../components/music-panel';
import type { Fixture } from './compare';
import type { HeadphoneMeasurement } from '../../lib/measurement';
import '../../app/globals.css';
import '../../app/alpha.css';
import './style.css';
function Review() {
  const [fixture, setFixture] = useState<Fixture | null>(null), [generation, setGeneration] = useState(0), [snapshot, setSnapshot] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const panel = useRef<MusicPanelHandle | null>(null);
  useEffect(() => { fetch('/fixtures.json').then(r => r.json() as Promise<Fixture[]>).then(rows => setFixture(rows[0])); }, []);
  if (!fixture) return <p>Loading public fixture…</p>;
  const measurement: HeadphoneMeasurement = { id: 'layout-fixture', name: 'Local layout fixture', device: fixture.name, type: 'oe', rig: fixture.rig, origin: 'imported', points: fixture.points, createdAt: 0, fit: '', notes: '', source: fixture.sourceUrl };
  const targets = [{ id: 'a', points: fixture.target }, { id: 'b', points: fixture.target.map(([hz, db]) => [hz, db + (hz < 300 ? (generation % 2 ? 4 : 2) : 0)] as [number, number]) }];
  return <main className="alpha-app"><h1>Integrated player review</h1><p>Actual app component; no account or contribution handlers. Public measurement fixture; local music only.</p>
    <div className="controls"><input type="file" aria-label="Review music" accept="audio/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <button onClick={() => void panel.current?.listen(0)}>Start A</button><button onClick={() => panel.current?.stop()}>Stop review</button>
      <button onClick={() => setGeneration(g => g + 1)}>Change target</button><button onClick={() => setSnapshot(JSON.stringify(panel.current?.snapshot()))}>Inspect applied EQ</button></div>
    <pre aria-label="Applied EQ" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: '100%' }}>{snapshot}</pre>
    <section className="shell alpha-listening"><div className="music-panel-host">
    <MusicPanel key={file ? `${file.name}-${file.lastModified}` : "initial"} ref={panel} pair={['a', 'b']} targets={generation % 2 ? [...targets].reverse() : targets} measurement={measurement} testMode="open" loudnessTarget="off" consent={false} personalOnly suggestions={[]} beforePlayback={() => true} onSideChange={() => {}} onHeard={() => {}} retainedFile={file} onFileChosen={setFile} />
    </div></section></main>;
}
createRoot(document.getElementById('root')!).render(<Review />);
