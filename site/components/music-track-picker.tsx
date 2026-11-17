"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { musicDisplayTitle } from "@/lib/music-display";
import "./music-track-picker.css";

type Track = { title: string; artist: string; versionLabel?: string };
const label = (track: Track) => `${musicDisplayTitle(track.title)} · ${track.artist}${track.versionLabel ? ` · ${track.versionLabel}` : ""}`;
const searchable = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
export default function MusicTrackPicker({ tracks, selectedIndex, onSelect }: { tracks: readonly Track[]; selectedIndex: number; onSelect: (index: number) => void }) {
  const id = useId(), activeOption = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [query, setQuery] = useState(""), [active, setActive] = useState(0);
  const words = searchable(query).trim().split(/\s+/).filter(Boolean);
  const matches = tracks.map((track, index) => ({ index, text: label(track) })).filter(track => words.every(word => searchable(track.text).includes(word)));
  useEffect(() => {
    const row = open ? activeOption.current : null;
    const list = row?.parentElement;
    if (!row || !list) return;
    const option = row.getBoundingClientRect(), bounds = list.getBoundingClientRect();
    if (option.top < bounds.top) list.scrollTop += option.top - bounds.top;
    else if (option.bottom > bounds.bottom) list.scrollTop += option.bottom - bounds.bottom;
  }, [active, open, query]);
  function close() { setOpen(false); setQuery(""); }
  function choose(index: number) { onSelect(index); close(); }
  return <div className="music-track-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}>
    <Search size={16} aria-hidden="true"/>
    <input role="combobox" aria-label="Search library songs" aria-expanded={open} aria-controls={open ? id : undefined} aria-autocomplete="list" aria-activedescendant={open && matches[active] ? `${id}-${matches[active].index}` : undefined} autoComplete="off" placeholder="Search songs or artists" value={open ? query : tracks[selectedIndex] ? label(tracks[selectedIndex]) : ""} onFocus={() => { setOpen(true); setActive(0); }} onClick={() => { if (!open) { setOpen(true); setActive(0); } }} onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }} onKeyDown={event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive(current => Math.max(0, Math.min(matches.length - 1, open ? current + (event.key === "ArrowDown" ? 1 : -1) : 0))); }
      else if (event.key === "Enter" && open) { event.preventDefault(); if (matches[active]) choose(matches[active].index); }
      else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    }}/>
    {open && <div className="music-track-results"><div id={id} role="listbox" aria-label="Library songs">{matches.map((track, index) => <button key={track.index} ref={index === active ? activeOption : undefined} id={`${id}-${track.index}`} type="button" role="option" aria-selected={track.index === selectedIndex} tabIndex={-1} className={index === active ? "is-active" : undefined} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(track.index)}>{track.text}</button>)}</div>{!matches.length && <p role="status">No songs match. Try another title or artist.</p>}</div>}
  </div>;
}
