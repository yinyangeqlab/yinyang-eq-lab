"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, ChevronDown, Eye, EyeClosed, Headphones, Music2, Pause, Play } from "lucide-react";
import BeforeYouListen from "@/components/before-you-listen";
import type { LoudnessTarget } from "./levels";
import TrackWaveform from "@/components/track-waveform";
import { PlaybackTime } from "@/components/playback-transport";
import { curatedWaveform } from "@/lib/curated-waveforms";
import { musicDisplayTitle } from "@/lib/music-display";
import { listeningPool } from "@/lib/music-catalog";
import { parseMeasurement } from "@/lib/measurement";
import { measurementChannelMatch, readLibraryEqs, type LibraryEq } from "@/lib/music-library-eq";
import { savedEqToBlindPreset, type EqPreset } from "@/lib/blind-eq";
import ComparePicker, { type Device, type Loaded, type Picker } from "./picker";
import { ComparisonAudio, original, type Side, type Song } from "./audio";
import "./quick-compare.css";

const songs: Song[] = listeningPool.map(track => ({ title: track.title, artist: track.artist, duration: track.duration, url: track.fileUrl }));
const sides = [0, 1] as const;
const nameOf = (side: Side) => side === 0 ? "A" : "B";
const shuffled = (): [Side, Side] => crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? [1, 0] : [0, 1];

function savedDevices(eqs: LibraryEq[]) {
  const devices: Device[] = [];
  try {
    for (const raw of JSON.parse(localStorage.getItem("target-lab-measurements") || "[]")) {
      try {
        const m = parseMeasurement(raw);
        devices.push({ id: m.id, name: m.device || m.name, detail: m.name, match: measurementChannelMatch(m) });
      } catch { /* Older incomplete entries may still have a headphone name on the EQ. */ }
    }
  } catch { /* Device storage is optional for TXT uploads. */ }
  for (const eq of eqs) {
    if (eq.headphone && !devices.some(device => device.id === eq.measurementId || device.name === eq.headphone)) {
      devices.push({ id: eq.measurementId || eq.headphone, name: eq.headphone, detail: "From Saved EQs", match: eq.channelMatch });
    }
  }
  return devices;
}

export default function EqCompare() {
  const [saved, setSaved] = useState<LibraryEq[]>([]), [devices, setDevices] = useState<Device[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  const [slots, setSlots] = useState<[Loaded | null, Loaded | null]>([null, null]);
  const [order, setOrder] = useState<[Side, Side]>([0, 1]), [blind, setBlind] = useState(false);
  const [song, setSong] = useState<Song>(songs[0]), [lastLocal, setLastLocal] = useState<Song>();
  const [duration, setDuration] = useState(song.duration), [position, setPosition] = useState(0);
  const [wave, setWave] = useState<ReturnType<typeof curatedWaveform>>(null);
  const [picker, setPicker] = useState<Picker | null>(null), [error, setError] = useState("");
  const [target, setTarget] = useState<LoudnessTarget>(-14), [useCorrection, setUseCorrection] = useState(true);
  const [headroom, setHeadroom] = useState(0);
  const [reminder, setReminder] = useState<{ side: Side | null } | null>(null);
  const [skipReminder, setSkipReminder] = useState(false), [skipDraft, setSkipDraft] = useState(false);
  const remindedForSong = useRef(false);
  const [volume, setVolume] = useState(.65);
  const [selectedSide, setSelectedSide] = useState<Side>(0);
  const [playing, setPlaying] = useState<Side | null>(null), [pending, setPending] = useState<Side | null>(null);
  const audio = useRef<ComparisonAudio | null>(null), cursor = useRef(0), playRequest = useRef(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const eqs = readLibraryEqs(), headphones = savedDevices(eqs);
      setSaved(eqs); setDevices(headphones);
      const ids = new URLSearchParams(location.hash.slice(1)).getAll("saved-eq");
      if (!ids.length) return;
      history.replaceState(history.state, "", location.pathname + location.search);
      try {
        if (ids.length > 2 || new Set(ids).size !== ids.length) throw Error("Choose two different saved EQs.");
        const loaded = ids.map(id => {
          const eq = eqs.find(row => row.id === id);
          if (!eq) throw Error("That saved EQ is unavailable in this browser. Load a preset on either side.");
          return { preset: savedEqToBlindPreset(eq), eq };
        });
        setSlots([loaded[0], loaded[1] || null]);
        if (loaded.length === 2) { setOrder(shuffled()); setBlind(true); }
        const first = loaded[0].eq;
        const sameModel = loaded.every(({eq}) => (first.measurementId && eq.measurementId === first.measurementId) || (first.headphone && eq.headphone === first.headphone));
        if (sameModel) setDevice(headphones.find(d => d.id === first.measurementId || d.name === first.headphone) ?? null);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t load saved EQs."); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const requests = playRequest;
    const timer = window.setInterval(() => {
      const engine = audio.current;
      if (!engine) return;
      cursor.current = engine.player.time;
      setPosition(cursor.current); setPlaying(engine.side); setPending(engine.pending);
    }, 90);
    const hidden = () => { if (document.hidden) { playRequest.current++; audio.current?.stop(); } };
    document.addEventListener("visibilitychange", hidden);
    const leaving = () => { requests.current++; audio.current?.stop(); };
    window.addEventListener("pagehide", leaving);
    return () => {
      clearInterval(timer); document.removeEventListener("visibilitychange", hidden); window.removeEventListener("pagehide", leaving);
      requests.current++; audio.current?.close(); audio.current = null;
    };
  }, []);
  function invalidate() {
    playRequest.current++; audio.current?.invalidate(); setHeadroom(0);
    setPlaying(null); setPending(null); setError("");
  }
  function newSession() {
    invalidate();
    remindedForSong.current = false; setSkipReminder(false);
  }
  function engineFor(source: Song) {
    if (!audio.current) {
      const engine = new ComparisonAudio(source, (seconds, peaks) => {
        if (audio.current === engine) { setDuration(seconds); setWave(peaks); }
      });
      audio.current = engine;
      engine.player.seek(cursor.current);
      engine.player.setVolume(volume);
    }
    return audio.current;
  }
  function chooseSong(next: Song) {
    setPicker(null);
    if (next === song) return;
    invalidate(); remindedForSong.current = false; audio.current?.close(); audio.current = null;
    cursor.current = 0; setPosition(0); setDuration(next.duration); setWave(null); setSong(next);
    if (next.file) {
      setLastLocal(next);
      try {
        const engine = engineFor(next);
        void engine.load().catch(() => { if (audio.current === engine) setError("Couldn’t read this audio file. Try a shorter WAV or MP3."); });
      } catch { setError("Audio is unavailable in this browser."); }
    }
  }
  function choosePreset(side: Side, value: Loaded) {
    newSession(); setPicker(null);
    const slot = order[side];
    setSlots(current => slot === 0 ? [value, current[1]] : [current[0], value]);
  }
  async function listen(side: Side, requestedTarget = target) {
    setSelectedSide(side);
    if (!device) { setPicker({ kind: "headphones" }); return; }
    if (!slots[order[side]]) { setPicker({ kind: "eq", side }); return; }
    const token = ++playRequest.current;
    setError("");
    try {
      const engine = engineFor(song);
      const presets: [EqPreset, EqPreset] = [slots[order[0]]?.preset ?? original, slots[order[1]]?.preset ?? original];
      const task = engine.play(side, presets, useCorrection ? device.match : undefined, requestedTarget);
      setPending(engine.pending); setPlaying(engine.side);
      await task;
      if (token === playRequest.current) { setPlaying(engine.side); setPending(engine.pending); setHeadroom(engine.headroomDb); }
    } catch (cause) {
      if (token === playRequest.current) { setPlaying(null); setPending(null); setError(cause instanceof Error ? cause.message : "Couldn’t play the song."); }
    }
  }
  function requestListen(side: Side) {
    if (device && slots[order[side]] && !skipReminder && !remindedForSong.current && audio.current?.side == null && audio.current?.pending == null) {
      setSkipDraft(false); setReminder({ side }); return;
    }
    void listen(side);
  }
  function changeTarget(next: LoudnessTarget) {
    const engine = audio.current, resume = engine?.side ?? engine?.pending;
    playRequest.current++; engine?.stop();
    setPlaying(null); setPending(null); setHeadroom(0); setTarget(next);
    if (resume != null) void listen(resume, next);
  }
  function seek(seconds: number) {
    const time = Math.max(0, Math.min(duration, seconds));
    const engine = audio.current, side = engine?.side;
    playRequest.current++; engine?.stop(); engine?.player.seek(time);
    cursor.current = time; setPosition(time); setPending(null);
    if (side != null) void listen(side);
  }
  function toggleBlind() {
    if (blind) { setBlind(false); return; }
    newSession(); setOrder(shuffled()); setBlind(true);
  }
  const waveform = wave ?? (song.url ? curatedWaveform(song.url) : null);
  const transportSide = slots[order[selectedSide]] ? selectedSide : slots[order[0]] ? 0 : slots[order[1]] ? 1 : selectedSide;
  const inProgress = playing !== null || pending !== null;
  const mismatch = device && slots.some(item => item?.eq?.headphone && item.eq.measurementId !== device.id && item.eq.headphone.toLowerCase() !== device.name.toLowerCase());

  return <div className="blind-eq-page quick-compare"><main inert={Boolean(reminder)}>
    <h1>Compare EQs</h1>
    <p className="quick-intro">Load an EQ on each side. Tap A or B to switch while the song plays.</p>
    <div className="quick-setup">
      <button id="quick-headphones" className="quick-device" onClick={() => setPicker({ kind: "headphones" })}><Headphones size={19}/><span>{device?.name || "Choose headphones"}</span><ChevronDown size={15}/></button>
      <button className="quick-blind" aria-pressed={blind} disabled={!slots[0] || !slots[1]} onClick={toggleBlind}>
        {blind ? <Eye size={18} aria-hidden="true"/> : <EyeClosed size={18} aria-hidden="true"/>}
        {blind ? "Reveal EQs" : "Listen blind"}
      </button>
    </div>
    <div className="quick-levels">
      <label htmlFor="eq-match-levels">Match loudness</label>
      <span className="quick-level-choice">
        <select id="eq-match-levels" value={target} aria-describedby="quick-level-hint" onChange={event => changeTarget(event.target.value === "off" ? "off" : Number(event.target.value) as LoudnessTarget)}>
          <option value="-14">On · −14 LUFS</option><option value="-16">On · −16 LUFS</option><option value="-18">On · −18 LUFS</option><option value="off">Off</option>
        </select>
        <ChevronDown size={14} aria-hidden="true"/>
      </span>
      <p id="quick-level-hint">More negative is quieter for both EQs.</p>
      {target !== "off" && headroom < -.05 && <p role="status">Both play at about {(target + headroom).toFixed(1)} LUFS before the volume control to leave peak headroom.</p>}
    </div>
    <div className="quick-decks">
      {sides.map(side => {
        const letter = nameOf(side), slot = slots[order[side]], isPlaying = playing === side;
        return <section key={side} className="quick-deck" data-side={letter} data-playing={isPlaying} aria-label={`Side ${letter}`}>
          <h2><button type="button" className="quick-side" aria-label={`Listen to ${letter}`} aria-pressed={Boolean(slot) && transportSide === side} onClick={() => { if (playing !== side && pending !== side) requestListen(side); }}>
            <span className="quick-letter">{letter}</span>{slot && transportSide === side && <span className="quick-side-state">{isPlaying ? "Playing" : "Selected"}</span>}
          </button></h2>
          {blind ? <div className="quick-preset quick-hidden"><AudioLines size={16}/> Hidden EQ</div> :
            <button type="button" className="quick-preset" aria-label={`Load EQ on ${letter}${slot ? ", " + slot.preset.name : ""}`} onClick={() => setPicker({ kind: "eq", side })}>
              <span>{slot?.preset.name ?? "Load EQ"}</span><ChevronDown size={16}/>
            </button>}
        </section>;
      })}
    </div>
    <section className="quick-bar" aria-label="Shared song player">
      <div className="quick-transport">
        <button type="button" className="quick-song" aria-label={`Choose song, ${song.title}`} onClick={() => setPicker({ kind: "song" })}>
          <Music2 size={18}/><span><strong>{musicDisplayTitle(song.title)}</strong><small>{song.artist}</small></span><ChevronDown size={14}/>
        </button>
        <button type="button" className="quick-transport-play" disabled={slots.every(slot => !slot)} aria-label={inProgress ? "Pause playback" : `Play with EQ ${nameOf(transportSide)}`} onClick={() => { if (inProgress) { playRequest.current++; audio.current?.stop(); setPlaying(null); setPending(null); } else requestListen(transportSide); }}>
          {inProgress ? <Pause size={17}/> : <Play size={17}/>}<span>{inProgress ? "Pause" : "Play"}</span>
        </button>
      </div>
      <TrackWaveform compact maxPixelRatio={4} hideZoom hideHeading analysis={waveform} sourceUrl={song.url} position={position} duration={duration} playing={playing !== null} getPlaybackPosition={() => audio.current?.player.time ?? cursor.current} onSeek={seek} dynamicRange={0} onDynamicRangeChange={() => {}} placeholder="Loading waveform…"/>
      <PlaybackTime position={position} duration={duration}/>
    </section>
    <div className="quick-foot">
      <div className="quick-playback-row">
        <label className="quick-volume">Volume <input type="range" min="0" max="1" step=".01" value={volume} onChange={event => { const next = Number(event.target.value); setVolume(next); audio.current?.player.setVolume(next); }}/></label>
        <span role="status">{pending !== null ? `Preparing ${nameOf(pending)}…` : playing !== null ? `Playing ${nameOf(playing)}` : ""}</span>
      </div>
      {device?.match && <label className="quick-correction"><input type="checkbox" checked={useCorrection} onChange={event => { invalidate(); setUseCorrection(event.target.checked); }}/> Apply headphone channel correction to both EQs</label>}
      <div className="quick-session-actions">
        <button type="button" className="quick-reminder-link" onClick={() => { playRequest.current++; audio.current?.stop(); setSkipDraft(skipReminder); setReminder({ side: null }); }}>Before you listen</button>
        <button type="button" className="quick-reminder-link" onClick={() => {
          newSession(); setTarget(-14); setSelectedSide(0); if (blind) setOrder(shuffled());
          cursor.current = 0; audio.current?.player.seek(0); setPosition(0);
          setSkipDraft(false); setReminder({ side: null });
        }}>Start new session</button>
      </div>
    </div>
    {mismatch && <p role="status" className="quick-note">A loaded EQ was saved for a different headphone. You’re hearing its original filters on {device.name}.</p>}
    {error && <p role="alert" className="quick-error">{error}</p>}
    {picker && <ComparePicker picker={picker} devices={devices} saved={saved} songs={lastLocal ? [lastLocal, ...songs] : songs} onClose={() => setPicker(null)} onSong={chooseSong}
      onEq={value => { if (picker.kind === "eq") choosePreset(picker.side, value); }}
      onDevice={next => { newSession(); setDevice(next); setUseCorrection(true); setPicker(null); }}/>}
  </main>
    {reminder && <BeforeYouListen comparisonSession skip={skipDraft} onSkipChange={setSkipDraft}
      onCancel={() => setReminder(null)} onReady={() => {
        const side = reminder.side;
        setSkipReminder(skipDraft); remindedForSong.current = true; setReminder(null);
        if (side != null) void listen(side);
      }}/>}
  </div>;
}
