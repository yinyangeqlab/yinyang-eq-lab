"use client";

import { useSyncExternalStore } from "react";
import "./personal-theme-picker.css";

/** Same saved setting as the Results theme menu, so a choice made here is the look of the finished tournament. */
const THEME_KEY = "target-lab-personal-podium-theme-v1";
const THEME_EVENT = "yinyang-podium-theme";
type Theme = "sport" | "game" | "grove";
const THEMES: { id: Theme; name: string; note: string }[] = [
  { id: "sport", name: "Field Day", note: "Medals and a trophy on a race track" },
  { id: "game", name: "Retro Arcade", note: "A high-score board for your favorites" },
  { id: "grove", name: "Low-Poly Grove", note: "Faceted fruit on a calm hillside" },
];

const readTheme = (): Theme => { try { const saved = localStorage.getItem(THEME_KEY); return saved === "game" || saved === "grove" ? saved : "sport"; } catch { return "sport"; } };
const subscribe = (listener: () => void) => { window.addEventListener("storage", listener); window.addEventListener(THEME_EVENT, listener); return () => { window.removeEventListener("storage", listener); window.removeEventListener(THEME_EVENT, listener); }; };
function chooseTheme(next: Theme) { try { localStorage.setItem(THEME_KEY, next); } catch { /* Cosmetic preference only. */ } window.dispatchEvent(new Event(THEME_EVENT)); }

function FieldDayArt() {
  return <svg viewBox="0 0 240 130" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs><linearGradient id="fd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1d5d7a"/><stop offset="1" stopColor="#16465e"/></linearGradient></defs>
    <rect width="240" height="130" fill="url(#fd-sky)"/>
    <circle cx="206" cy="27" r="13" fill="#f4d36d"/>
    <path d="M14 42l24-9 22 7 15-3 10 5z" fill="#5f8498"/><path d="M150 36l16-6 14 5 10-2 8 3z" fill="#5f8498" opacity=".85"/>
    <path d="M0 80C40 66 80 70 120 76S200 66 240 74V130H0Z" fill="#2c9b6d"/>
    <ellipse cx="120" cy="101" rx="108" ry="24" fill="none" stroke="#b9604b" strokeWidth="10"/>
    <ellipse cx="120" cy="101" rx="108" ry="24" fill="none" stroke="#f2ece0" strokeWidth="1.2" strokeDasharray="5 6" opacity=".75"/>
    <rect x="22" y="106" width="62" height="24" rx="2" fill="#3f90c9"/><rect x="80" y="106" width="4" height="24" fill="#2f78ad"/>
    <rect x="88" y="94" width="64" height="36" rx="2" fill="#46b9a4"/><rect x="148" y="94" width="4" height="36" fill="#349a88"/>
    <rect x="156" y="112" width="62" height="18" rx="2" fill="#e2806a"/><rect x="214" y="112" width="4" height="18" fill="#c26550"/>
    <path d="M106 54h28v12c0 10-6 17-14 17s-14-7-14-17z" fill="#f4c94c"/><path d="M106 58H97c0 9 4 13 11 14M134 58h9c0 9-4 13-11 14" fill="none" stroke="#f4c94c" strokeWidth="3"/>
    <rect x="116" y="83" width="8" height="5" fill="#e0a92f"/><rect x="109" y="88" width="22" height="6" rx="1.5" fill="#f4c94c"/>
    <text x="120" y="72" textAnchor="middle" fontSize="13" fontWeight="800" fill="#263242">1</text>
    <path d="M46 76l5-13h6l-5 13z" fill="#ef6c6c"/><path d="M55 76l5-13h6l-5 13z" fill="#5aa8e8"/>
    <circle cx="53" cy="86" r="10" fill="#bcd5e6"/><text x="53" y="90" textAnchor="middle" fontSize="11" fontWeight="800" fill="#263242">2</text>
    <path d="M178 91l5-12h5l-5 12z" fill="#ef6c6c"/><path d="M185 91l5-12h5l-5 12z" fill="#5aa8e8"/>
    <circle cx="188" cy="101" r="9" fill="#cf8c6c"/><text x="188" y="105" textAnchor="middle" fontSize="10" fontWeight="800" fill="#263242">3</text>
  </svg>;
}

function RetroArcadeArt() {
  const pellets = [82, 96, 110, 130, 144, 158];
  return <svg viewBox="0 0 240 130" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <rect width="240" height="130" fill="#0b0f2e"/>
    <g fill="none" stroke="#4a5cc0" strokeWidth="4" strokeLinecap="square"><path d="M10 14H68V32H56"/><path d="M230 14H172V32H184"/><path d="M18 14V62M222 14V62"/></g>
    <g fill="#d9a54a">{pellets.map(x => <rect key={x} x={x} y="11" width="6" height="6"/>)}</g>
    <text x="120" y="52" textAnchor="middle" fontFamily="ui-monospace,Menlo,Consolas,monospace" fontSize="19" fontWeight="800" fill="#f2c14e" letterSpacing="2">HIGH SCORES</text>
    <g fontFamily="ui-monospace,Menlo,Consolas,monospace" fontSize="12" fontWeight="700">
      <text x="30" y="78" fill="#f2c14e">01</text><rect x="56" y="70" width="104" height="5" fill="#f2c14e" opacity=".55"/><text x="210" y="78" textAnchor="end" fill="#f2c14e">26/26</text>
      <text x="30" y="96" fill="#9fd6f2">02</text><rect x="56" y="88" width="86" height="5" fill="#9fd6f2" opacity=".55"/><text x="210" y="96" textAnchor="end" fill="#9fd6f2">22/26</text>
      <text x="30" y="114" fill="#f0a07a">03</text><rect x="56" y="106" width="70" height="5" fill="#f0a07a" opacity=".55"/><text x="210" y="114" textAnchor="end" fill="#f0a07a">18/26</text>
    </g>
  </svg>;
}

function Fruit({ x, y, scale, base, facet }: { x: number; y: number; scale: number; base: string; facet: string }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <polygon points="0,-34 13,-27 15,-12 7,0 -7,0 -15,-12 -13,-27" fill={base}/>
    <polygon points="0,-34 15,-12 0,-18" fill={facet}/><polygon points="0,-18 15,-12 7,0 -7,0" fill={facet} opacity=".55"/>
    <path d="M-6 -35l7-7 9 4-7 7z" fill="#5fbf8a"/>
  </g>;
}

function GroveArt() {
  return <svg viewBox="0 0 240 130" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs><linearGradient id="gv-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#245f68"/><stop offset="1" stopColor="#10343f"/></linearGradient></defs>
    <rect width="240" height="130" fill="url(#gv-sky)"/>
    <circle cx="205" cy="24" r="11" fill="#ffd88c"/>
    <polygon points="6,88 60,34 96,88" fill="#5d97a1"/><polygon points="60,34 96,88 68,88" fill="#46808d"/>
    <polygon points="76,88 124,28 176,88" fill="#6ba8b0"/><polygon points="124,28 176,88 132,88" fill="#518f9a"/>
    <polygon points="150,88 198,46 238,88" fill="#5a929c"/><polygon points="198,46 238,88 204,88" fill="#46808d"/>
    <polygon points="0,88 44,76 96,84 148,74 196,82 240,72 240,130 0,130" fill="#4aa87d"/>
    <polygon points="44,76 96,84 62,104" fill="#5fc093"/><polygon points="148,74 196,82 168,104" fill="#5fc093"/><polygon points="96,84 148,74 120,110" fill="#3f9570"/>
    <polygon points="12,106 20,84 28,106" fill="#2f8561"/><polygon points="14,100 20,86 26,100" fill="#43a579"/>
    <polygon points="214,108 222,86 230,108" fill="#2f8561"/><polygon points="216,102 222,88 228,102" fill="#43a579"/>
    <rect x="22" y="108" width="62" height="22" fill="#4f8fb0"/><rect x="22" y="108" width="62" height="5" fill="#6aa9c9"/>
    <rect x="88" y="96" width="64" height="34" fill="#5fb383"/><rect x="88" y="96" width="64" height="5" fill="#7fcf9f"/>
    <rect x="156" y="114" width="62" height="16" fill="#d98a68"/><rect x="156" y="114" width="62" height="4" fill="#ecaa88"/>
    <Fruit x={120} y={94} scale={1} base="#f0b93a" facet="#d99a25"/>
    <Fruit x={53} y={106} scale={.78} base="#bcd5e6" facet="#8fb2cc"/>
    <Fruit x={187} y={112} scale={.7} base="#d98a68" facet="#b86a4c"/>
  </svg>;
}

const ART: Record<Theme, () => React.ReactElement> = { sport: FieldDayArt, game: RetroArcadeArt, grove: GroveArt };

export default function PersonalThemePicker() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "sport" as Theme);
  return <fieldset className="theme-picker">
    <legend>Choose how your results will look</legend>
    <div className="theme-picker-grid">
      {THEMES.map(({ id, name, note }) => {
        const Art = ART[id];
        return <label key={id} className="theme-tile" data-theme={id}>
          <input type="radio" name="personal-results-theme" value={id} checked={theme === id} onChange={() => chooseTheme(id)}/>
          <span className="theme-tile-art"><Art/></span>
          <span className="theme-tile-caption"><strong>{name}</strong><span>{note}</span></span>
          <span className="theme-tile-ring" aria-hidden="true"/>
          <span className="theme-tile-check" aria-hidden="true">✓</span>
        </label>;
      })}
    </div>
  </fieldset>;
}
