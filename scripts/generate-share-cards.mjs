// Renders the 1200x630 link-preview cards in public/share from lib/share-pages.mjs.
// Re-run after editing page copy:  node scripts/generate-share-cards.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { sharePages, sharePageFor, previewTitle } from "../lib/share-pages.mjs";

const root = new URL("../", import.meta.url);
const outDir = new URL("public/share/", root);
mkdirSync(outDir, { recursive: true });
const W = 1200, H = 630;
const TEAL = "#58d8c9", RED = "#ff4d5e", BLUE = "#4d8dff", TEXT = "#edf3f7", MUTED = "#9fb4c4";
const FONT = "Arial, 'DejaVu Sans', sans-serif";

const esc = value => String(value).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

function wrap(text, size, width) {
  const limit = Math.floor(width / (size * 0.56));
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > limit) { lines.push(line); line = word; } else line = line ? line + " " + word : word;
  }
  if (line) lines.push(line);
  return lines;
}

// Smooth frequency-response-looking path across a box, from a list of [t, y] stops (0..1).
function curvePath(stops, x, y, w, h) {
  const pts = stops.map(([t, v]) => [x + t * w, y + (1 - v) * h]);
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
    d += ` C${mx.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}
const glow = (color, width = 6) => `fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"`;
const panel = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="#04090c" fill-opacity=".72" stroke="#58d8c9" stroke-opacity=".28" stroke-width="2"/>`;
const grid = (x, y, w, h) => [0.25, 0.5, 0.75].map(t => `<line x1="${x}" x2="${x + w}" y1="${y + h * t}" y2="${y + h * t}" stroke="#58d8c9" stroke-opacity=".14"/>`).join("")
  + [0.2, 0.4, 0.6, 0.8].map(t => `<line y1="${y}" y2="${y + h}" x1="${x + w * t}" x2="${x + w * t}" stroke="#58d8c9" stroke-opacity=".1"/>`).join("");
const badge = (x, y, label, color) => `<circle cx="${x}" cy="${y}" r="21" fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width="3"/><text x="${x}" y="${y + 9}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="25" fill="${color}">${label}</text>`;

const A = [[0, .42], [.12, .5], [.28, .56], [.42, .5], [.55, .72], [.68, .6], [.8, .45], [1, .3]];
const B = [[0, .5], [.12, .46], [.28, .5], [.42, .6], [.55, .55], [.68, .66], [.8, .55], [1, .38]];

// Motifs are drawn inside a 440x400 area; the caller translates it to the right half of the card.
const motifs = {
  blind: () => `${panel(0, 20, 440, 360)}${grid(30, 60, 380, 280)}<path d="${curvePath(A, 30, 70, 380, 260)}" ${glow(RED)}/><path d="${curvePath(B, 30, 70, 380, 260)}" ${glow(BLUE)}/>${badge(60, 50, "A", RED)}${badge(380, 50, "B", BLUE)}<text x="220" y="372" text-anchor="middle" font-family="${FONT}" font-size="20" fill="${MUTED}" letter-spacing="3">WHICH SOUNDS BETTER?</text>`,
  ranking: () => `${panel(0, 20, 440, 360)}${[[.92, TEAL], [.78, TEAL], [.66, BLUE], [.5, BLUE], [.36, RED]].map(([v, c], i) => `<rect x="40" y="${58 + i * 62}" width="${v * 350}" height="34" rx="9" fill="${c}" fill-opacity=".8" filter="url(#glow)"/><text x="52" y="${82 + i * 62}" font-family="${FONT}" font-weight="700" font-size="20" fill="#021012">${i + 1}</text>`).join("")}`,
  bracket: () => `${panel(0, 20, 440, 360)}<g fill="none" stroke="${TEAL}" stroke-width="5" stroke-linecap="round" filter="url(#glow)">${[0, 1, 2, 3].map(i => `<path d="M40 ${70 + i * 76} H150 V${108 + (i >> 1) * 152}"/>`).join("")}<path d="M150 108 V184 M150 260 V336" opacity="0"/><path d="M150 146 H250 V222 M150 298 H250 V222"/><path d="M250 222 H340"/></g><circle cx="365" cy="222" r="26" fill="${TEAL}" fill-opacity=".25" stroke="${TEAL}" stroke-width="4" filter="url(#glow)"/><path d="M365 208 l4 9 10 1-8 7 3 10-9-6-9 6 3-10-8-7 10-1z" fill="${TEAL}"/>`,
  tuning: () => `${panel(0, 20, 440, 360)}${grid(30, 60, 380, 230)}<path d="${curvePath([[0, .35], [.15, .5], [.32, .42], [.5, .66], [.66, .5], [.84, .6], [1, .4]], 30, 60, 380, 230)}" ${glow(TEAL)}/>${[[.15, .5], [.5, .66], [.84, .6]].map(([t, v]) => `<circle cx="${30 + t * 380}" cy="${60 + (1 - v) * 230}" r="13" fill="#04090c" stroke="${RED}" stroke-width="5" filter="url(#glow)"/>`).join("")}<rect x="40" y="322" width="360" height="8" rx="4" fill="#ffffff" fill-opacity=".14"/><rect x="40" y="322" width="210" height="8" rx="4" fill="${BLUE}"/><circle cx="250" cy="326" r="14" fill="${BLUE}" filter="url(#glow)"/>`,
  community: () => `${panel(0, 20, 440, 360)}${Array.from({ length: 5 }, (_, i) => { const x = 62 + i * 78, v = [.55, .8, .45, .7, .62][i], c = [RED, TEAL, BLUE, TEAL, RED][i]; return `<line x1="${x}" x2="${x}" y1="${330 - v * 250 - 34}" y2="${330 - v * 250 + 34}" stroke="${c}" stroke-width="4" filter="url(#glow)"/><circle cx="${x}" cy="${330 - v * 250}" r="14" fill="${c}" filter="url(#glow)"/>`; }).join("")}<path d="M40 330 H400" stroke="${MUTED}" stroke-opacity=".5" stroke-width="2"/>`,
  library: () => `${panel(0, 20, 440, 360)}<g filter="url(#glow)" fill="none" stroke="${TEAL}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M150 270 V120 L300 90 V240"/><circle cx="118" cy="270" r="32" fill="${TEAL}" fill-opacity=".25"/><circle cx="268" cy="240" r="32" fill="${TEAL}" fill-opacity=".25"/></g>${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<rect x="${60 + i * 36}" y="${334 - [10, 26, 16, 38, 22, 44, 18, 30, 12][i]}" width="18" height="${[10, 26, 16, 38, 22, 44, 18, 30, 12][i]}" rx="5" fill="${i % 2 ? BLUE : RED}" fill-opacity=".85"/>`).join("")}`,
  credits: () => `${panel(0, 20, 440, 360)}<text x="70" y="190" font-family="Georgia, serif" font-size="150" fill="${TEAL}" filter="url(#glow)">“</text>${[0, 1, 2, 3].map(i => `<rect x="70" y="${210 + i * 36}" width="${[300, 260, 290, 170][i]}" height="12" rx="6" fill="${MUTED}" fill-opacity=".55"/>`).join("")}`,
  discover: () => `${panel(0, 20, 440, 360)}<g filter="url(#glow)" fill="none" stroke="${TEAL}" stroke-width="6"><circle cx="220" cy="200" r="120"/><circle cx="220" cy="200" r="70" stroke="${BLUE}" stroke-opacity=".8"/></g><path d="M220 200 L290 130 L255 235 Z" fill="${RED}" fill-opacity=".9" filter="url(#glow)"/><path d="M220 200 L150 270 L185 165 Z" fill="${TEAL}" fill-opacity=".9" filter="url(#glow)"/><circle cx="220" cy="200" r="10" fill="#04090c" stroke="${TEXT}" stroke-width="3"/>`,
  privacy: () => `${panel(0, 20, 440, 360)}<path d="M220 70 L330 110 V210 C330 270 280 310 220 336 C160 310 110 270 110 210 V110 Z" fill="${TEAL}" fill-opacity=".16" stroke="${TEAL}" stroke-width="7" stroke-linejoin="round" filter="url(#glow)"/><rect x="180" y="190" width="80" height="62" rx="10" fill="#04090c" stroke="${TEXT}" stroke-width="5"/><path d="M194 190 V166 a26 26 0 0 1 52 0 V190" fill="none" stroke="${TEXT}" stroke-width="6"/>`,
  keys: () => `${panel(0, 20, 440, 360)}${[["SPACE", 40, 70, 240], ["1", 296, 70, 100], ["2", 40, 190, 100], ["S", 156, 190, 100], ["A/B", 272, 190, 124]].map(([label, x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="92" rx="16" fill="#0b1c20" stroke="${TEAL}" stroke-width="4" filter="url(#glow)"/><text x="${x + w / 2}" y="${y + 58}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${label.length > 3 ? 28 : 40}" fill="${TEXT}">${label}</text>`).join("")}`,
  version: () => `${panel(0, 20, 440, 360)}<g filter="url(#glow)" fill="none" stroke="${TEAL}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M150 130 L70 200 L150 270"/><path d="M290 130 L370 200 L290 270"/></g><path d="M250 110 L190 290" stroke="${RED}" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>`,
  journal: () => `${panel(0, 20, 440, 360)}${[0, 1, 2, 3, 4].map(i => `<line x1="50" x2="390" y1="${90 + i * 52}" y2="${90 + i * 52}" stroke="${MUTED}" stroke-opacity=".3" stroke-width="2"/>`).join("")}<path d="${curvePath([[0, .5], [.1, .8], [.2, .3], [.3, .9], [.4, .2], [.5, .7], [.6, .4], [.7, .85], [.8, .35], [.9, .6], [1, .5]], 50, 150, 340, 110)}" ${glow(BLUE, 5)}/><circle cx="64" cy="300" r="7" fill="${RED}"/><rect x="82" y="294" width="190" height="12" rx="6" fill="${MUTED}" fill-opacity=".55"/>`,
  embed: () => `${panel(0, 20, 440, 360)}${grid(30, 60, 380, 190)}<path d="${curvePath(A, 30, 70, 380, 170)}" ${glow(RED, 5)}/><path d="${curvePath(B, 30, 70, 380, 170)}" ${glow(BLUE, 5)}/>${[[150, 332, RED, "A"], [290, 332, BLUE, "B"]].map(([x, y, c, l]) => badge(x, y, l, c)).join("")}<text x="220" y="340" font-family="${FONT}" font-size="22" font-weight="700" fill="${MUTED}" text-anchor="middle" letter-spacing="3">VS</text>`,
  private: () => `<g filter="url(#glow)"><circle cx="220" cy="200" r="120" fill="#04090c" fill-opacity=".7" stroke="${TEAL}" stroke-width="6"/><path d="M220 80 A60 60 0 0 1 220 200 A60 60 0 0 0 220 320 A120 120 0 0 1 220 80Z" fill="${TEAL}" fill-opacity=".9"/><circle cx="220" cy="140" r="14" fill="#04090c"/><circle cx="220" cy="260" r="14" fill="${TEAL}"/></g>`,
};

async function background() {
  const art = await sharp(fileURLToPath(new URL("public/brand-landscape.webp", root))).resize(W, H, { fit: "cover", position: "center" }).modulate({ brightness: 0.78, saturation: 1.1 }).png().toBuffer();
  return art;
}

// Every private page shares one neutral card; it never names the page it stands in for.
const neutral = { slug: "private", private: true, ogTitle: "YinYang EQ", title: "YinYang EQ", kicker: "Blind listening for headphones", tagline: "Compare headphone targets with your own ears." };

function cardSvg(page) {
  if (page.private) page = neutral;
  const kind = page.private ? "private" : page.kind ?? "blind";
  const title = previewTitle(page);
  const kicker = page.kicker ?? "YINYANG EQ";
  const size = title.length > 34 ? 52 : title.length > 22 ? 62 : 72;
  const lines = wrap(title, size, 560).slice(0, 3);
  const tagline = page.tagline ?? "";
  const titleY = 215;
  const titleSvg = lines.map((line, i) => `<text x="72" y="${titleY + i * (size * 1.12)}" font-family="${FONT}" font-weight="800" font-size="${size}" fill="${TEXT}">${esc(line)}</text>`).join("");
  const afterTitle = titleY + (lines.length - 1) * size * 1.12 + 56;
  const taglineSvg = wrap(tagline, 30, 560).slice(0, 2).map((line, i) => `<text x="72" y="${afterTitle + i * 40}" font-family="${FONT}" font-size="30" fill="${MUTED}">${esc(line)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
 <linearGradient id="shade" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".96"/><stop offset=".62" stop-color="#000" stop-opacity=".88"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
 <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></linearGradient>
 <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#shade)"/><rect width="${W}" height="${H}" fill="url(#floor)"/>
<rect x="72" y="92" width="64" height="6" rx="3" fill="${TEAL}"/>
<text x="72" y="140" font-family="${FONT}" font-weight="700" font-size="23" letter-spacing="5" fill="${TEAL}">${esc(kicker.toUpperCase())}</text>
${titleSvg}${taglineSvg}
<g transform="translate(700 115)">${motifs[kind]()}</g>
<text x="72" y="567" font-family="${FONT}" font-weight="800" font-size="30" letter-spacing="3" fill="${TEXT}">YINYANG <tspan fill="${TEAL}">EQ</tspan></text>
<text x="1128" y="567" text-anchor="end" font-family="${FONT}" font-size="24" fill="${MUTED}">yinyangeq.com</text>
</svg>`;
}

const bg = await background();
const done = new Set();
const entries = [...sharePages];
// Query variants of /shootout have their own cards.
for (const search of ["?mode=blind", "?mode=open", "?tab=rankings"]) entries.push(sharePageFor("/shootout", search));
for (const page of entries) {
  if (page.image || done.has(page.slug)) continue;
  done.add(page.slug);
  const svg = Buffer.from(cardSvg(page));
  const jpg = await sharp(bg).composite([{ input: svg }]).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  writeFileSync(new URL(`${page.slug}.jpg`, outDir), jpg);
  console.log(`${page.slug}.jpg ${(jpg.length / 1024).toFixed(0)} KB`);
}
