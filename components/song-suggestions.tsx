"use client";
import { useEffect, useState } from "react";
import { saveAdminTestRecord } from "@/lib/admin-test-store";
import "./song-suggestions.css";
type Suggestion = { id: string; title: string; artist: string; album: string; recordingId: string; note: string };
export default function SongSuggestions({testOnly, ready = true}:{testOnly:boolean;ready?:boolean}) {
  const [suggestions,setSuggestions] = useState<Suggestion[]>([]);
  const [songTitle,setSongTitle] = useState("");
  const [songArtist,setSongArtist] = useState("");
  const [songAlbum,setSongAlbum] = useState("");
  const [songRecordingId,setSongRecordingId] = useState("");
  const [songNote,setSongNote] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  async function refresh() {
    const response = await fetch("/api/suggestions",{cache:"no-store"});
    if (!response.ok) throw new Error("Could not load song suggestions. Please try again.");
    setSuggestions(await response.json());
  }
  useEffect(()=>{let active=true;fetch("/api/suggestions",{cache:"no-store"}).then(async response=>{if(!response.ok)throw new Error("Could not load song suggestions. Please try again.");const rows=await response.json() as Suggestion[];if(active)setSuggestions(rows);}).catch(error=>{if(active)setMessage(error instanceof Error?error.message:"Could not load song suggestions.");});return()=>{active=false;};},[]);
  async function suggest(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      if(testOnly){saveAdminTestRecord("suggestion",{title:songTitle,artist:songArtist,album:songAlbum,recordingId:songRecordingId,note:songNote});setMessage("Private test suggestion saved only in this browser; the community queue is unchanged.");return;}
      const r = await fetch("/api/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: songTitle, artist: songArtist, album: songAlbum, recordingId: songRecordingId, note: songNote }) });
      const result = await r.json() as { error?: string }; if (!r.ok) throw new Error(result.error ?? "Could not add suggestion.");
      setSongTitle(""); setSongArtist(""); setSongAlbum(""); setSongRecordingId(""); setSongNote(""); await refresh(); setMessage("Song suggestion added.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add suggestion."); }
    finally { setBusy(false); }
  }
  return <>
<section className="song-suggestions" aria-label="Song suggestions"><div className="heading-row"><div><h2 className="song-suggestions-title">Song suggestions</h2><p>Suggest music that reveals tonal differences. Suggestions are listed below for community discussion and manual owner review. They do not automatically enter the listening pool or target rankings. No audio is uploaded.</p></div></div><div className="upload-layout"><form className="upload-form" onSubmit={e => void suggest(e)}><label>Song title<input required maxLength={120} value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="Song title" /></label><label>Artist<input required maxLength={120} value={songArtist} onChange={e => setSongArtist(e.target.value)} placeholder="Artist" /></label><label>Album <span>optional</span><input maxLength={120} value={songAlbum} onChange={e => setSongAlbum(e.target.value)} placeholder="Album" /></label><label>Recording ID / ISRC <span>optional</span><input maxLength={80} value={songRecordingId} onChange={e => setSongRecordingId(e.target.value)} placeholder="ID or ISRC" /></label><label>What should listeners notice? <span>optional</span><textarea maxLength={240} value={songNote} onChange={e => setSongNote(e.target.value)} placeholder="Bass texture, vocals, cymbals…" /></label><button className="primary" disabled={busy || !ready}>Suggest song →</button></form><aside className="format-card"><span className="mini-label">LISTENING IDEAS</span><h2>Try a familiar track.</h2><p>Use music you know well and listen at a comfortable, consistent volume. The file stays on your device.</p></aside></div><div className="suggestions-list">{suggestions.length ? suggestions.map(item => <article className="suggestion" key={item.id}><strong>{item.title}</strong><span>{item.artist}</span>{item.note && <p>{item.note}</p>}</article>) : <p className="footnote">No suggestions yet. Add the first one.</p>}</div></section>
{message && <p className="song-suggestion-message" role="status">{message}</p>}
</>;
}
