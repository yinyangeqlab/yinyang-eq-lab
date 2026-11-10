// Renders the static share cards and provides the same artwork to the GIF generator.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { SHARE_IMAGE_SIZE, previewTitle, sharePreviewCards, sharePageFor } from "../lib/share-pages.mjs";

const root = new URL("../", import.meta.url);
const out = new URL("public/share/", root);
const { width: W, height: H } = SHARE_IMAGE_SIZE;
const TEAL = "#80e2d1", RED = "#ff8691", BLUE = "#86b5ff", TEXT = "#f0f7fa", MUTED = "#b9cdd6";
const FONT = "DejaVu Sans, sans-serif";
const graph = { x: 32, y: 35, width: 334, height: 97 };
const restPhase = .16;
const esc = value => String(value).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const source = name => fileURLToPath(new URL("public/" + name, root));

function wrap(text, size, width, glyphWidth = .54) {
  const limit = Math.floor(width / (size * glyphWidth));
  const lines = [];
  for (const word of text.split(" ")) {
    const last = lines.at(-1);
    if (last && last.length + word.length + 1 <= limit) lines[lines.length - 1] += " " + word;
    else lines.push(word);
  }
  return lines;
}

const gaussian = (t, center, width) => Math.exp(-((t - center) ** 2) / width ** 2);
const xAt = t => graph.x + t * graph.width;
function plot(response, color, width = 5, opacity = 1) {
  const path = Array.from({ length: 73 }, (_, i) => {
    const t = i / 72;
    return `${i ? "L" : "M"}${xAt(t).toFixed(1)} ${response(t).toFixed(1)}`;
  }).join(" ");
  return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
}

const baseline = `<path d="M32 81H366" stroke="${MUTED}" stroke-opacity=".28" stroke-width="2"/>`;
const badge = (x, y, label, color) => `<circle cx="${x}" cy="${y}" r="16" fill="#0d1b24" stroke="${color}" stroke-width="2.5"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="17" font-weight="700" fill="${color}">${label}</text>`;
const marker = (x, y, color) => `<circle cx="${x}" cy="${y}" r="14" fill="${color}" opacity=".19"/><circle cx="${x}" cy="${y}" r="6" fill="${color}"/>`;

function compare(progress) {
  const a = t => 93 - 31 * gaussian(t, .45, .27) + 15 * t;
  const b = t => 110 - 47 * gaussian(t, .67, .27) - 8 * t;
  return baseline + plot(a, RED, 4 + 2 * progress, .68 + .32 * progress)
    + plot(b, BLUE, 6 - 2 * progress, 1 - .32 * progress)
    + badge(48, 39, "A", RED) + badge(352, 39, "B", BLUE);
}

const motifs = {
  modes(progress) {
    return ["TOURNAMENT", "BLIND", "OPEN"].map((label, i) => {
      const x = 28 + i * 117;
      const color = [RED, TEAL, BLUE][i];
      const strength = .22 + .38 * Math.max(0, 1 - Math.abs(progress * 2 - i));
      return `<rect x="${x}" y="41" width="106" height="80" rx="13" fill="${color}" fill-opacity=".09" stroke="${color}" stroke-opacity="${strength}" stroke-width="3"/>
        <circle cx="${x + 53}" cy="65" r="7" fill="${color}" opacity="${.43 + strength}"/>
        <text x="${x + 53}" y="100" text-anchor="middle" fill="${TEXT}" font-size="12" font-weight="700">${label}</text>`;
    }).join("");
  },
  finder(progress) {
    const response = t => 80 - 37 * gaussian(t, .30, .12) + 35 * gaussian(t, .68, .135);
    const x = xAt(.06 + .88 * progress), y = response(.06 + .88 * progress);
    return baseline + plot(response, TEAL) + marker(xAt(.30), response(.30), RED)
      + marker(xAt(.68), response(.68), BLUE)
      + `<path d="M${x} 24V132" stroke="${TEAL}" stroke-width="2" opacity=".70"/>` + marker(x, y, TEXT);
  },
  tuning(progress) {
    const response = t => 104 - 30 * gaussian(t, .12, .18)
      - (39 + 18 * progress) * gaussian(t, .57, .19) + 8 * gaussian(t, .82, .13);
    return baseline + plot(response, TEAL) + marker(xAt(.12), response(.12), BLUE)
      + marker(xAt(.57), response(.57), RED) + marker(xAt(.82), response(.82), BLUE);
  },
  blind: compare,
  embed: compare,
  open(progress) {
    const reference = t => 87 - 26 * gaussian(t, .4, .28) + 12 * t;
    const selected = t => 106 - 42 * gaussian(t, .65, .31) - 16 * t;
    return baseline + plot(reference, RED, 5, .86) + plot(selected, BLUE, 5)
      + marker(xAt(.20 + .60 * progress), selected(.20 + .60 * progress), BLUE);
  },
  bracket(progress) {
    const bracket = "M48 37h88v30h78v21h87M48 71h88v-4M48 103h88v19h78V88M48 137h88v-15";
    return `<path d="${bracket}" fill="none" stroke="${TEAL}" stroke-opacity=".64" stroke-width="5"/>
      <path d="M48 37h88v30h78v21h87" pathLength="1" fill="none" stroke="${TEXT}" stroke-width="5"
        stroke-dasharray=".15 .85" stroke-dashoffset="${-progress}"/>` + marker(326, 88, TEAL);
  },
  ranking(progress) {
    return [.86, .71, .58, .45].map((value, i) => `<rect x="46" y="${29 + i * 34}"
      width="${300 * (value + (i % 2 ? -1 : 1) * progress * .05)}" height="19" rx="9"
      fill="${[TEAL, BLUE, BLUE, RED][i]}" opacity="${1 - i * .12}"/>`).join("");
  },
  library(progress, phase) {
    return Array.from({ length: 19 }, (_, i) => {
      const envelope = 12 + 68 * gaussian(i, 9, 6.3);
      const h = envelope * (.55 + .45 * Math.sin(phase * Math.PI * 2 + i * 1.7) ** 2);
      return `<rect x="${37 + i * 17}" y="${82 - h / 2}" width="8" height="${h}" rx="4" fill="${i < 9 ? RED : BLUE}"/>`;
    }).join("");
  },
  community(progress) {
    return baseline + [.42, .73, .32, .63, .51].map((value, i) => {
      const x = 61 + i * 68, y = 118 - value * 100 + (i % 2 ? -1 : 1) * progress * 8;
      return `<path d="M${x} ${y - 19}v38" stroke="${BLUE}" stroke-width="3"/>` + marker(x, y, TEAL);
    }).join("");
  },
  journal(progress) {
    return baseline + plot(t => 83 + Math.sin(t * 22) * (15 + 12 * progress) * Math.sin(Math.PI * t), BLUE);
  },
  credits(progress) {
    return `<path d="M93 51c-21 0-35 12-35 34v17h40V68H77c2-6 8-10 16-11Zm69 0c-21 0-35 12-35 34v17h40V68h-21c2-6 8-10 16-11Z" fill="${TEAL}"/>
      <path d="M197 66h142m-142 31h${105 + progress * 26}" stroke="${BLUE}" stroke-width="6"/>`;
  },
  book(progress) {
    return `<path d="M199 58c-33-20-71-24-120-18v76c51-4 84 3 120 23 36-20 69-27 120-23V40c-49-6-87-2-120 18v81"
      fill="none" stroke="${TEAL}" stroke-width="4"/>
      <path d="M100 66q46-3 75 9m-75 18q46-3 75 9m48-27q29-12 75-9m-75 36q29-12 75-9"
      fill="none" stroke="${BLUE}" stroke-width="4" opacity="${.55 + .45 * progress}"/>`;
  },
  history(progress) {
    return `<path d="M64 84H335" stroke="${TEAL}" stroke-opacity=".44" stroke-width="4"/>`
      + [76, 157, 240, 322].map((x, i) => `<path d="M${x} 103v13" stroke="${MUTED}" stroke-opacity=".46" stroke-width="3"/>`
        + marker(x, 84, [RED, MUTED, BLUE, TEAL][i])).join("")
      + marker(76 + 246 * progress, 84, TEXT);
  },
  privacy(progress) {
    return `<path d="M199 24l58 22v36c0 25-20 47-58 63-38-16-58-38-58-63V46Z"
      fill="${TEAL}" fill-opacity="${.09 + progress * .12}" stroke="${TEAL}" stroke-width="4"/>
      <path d="m174 84 16 16 33-36" fill="none" stroke="${TEXT}" stroke-width="5"/>`;
  },
  keys(progress) {
    return [["SPACE", 53, 112], ["A", 182, 62], ["B", 261, 62]].map(([label, x, width], i) =>
      `<rect x="${x}" y="54" width="${width}" height="58" rx="10" fill="${TEAL}" fill-opacity="${i === 0 ? .14 : .08 + (i === 1 ? progress : 1 - progress) * .34}" stroke="${TEAL}" stroke-width="2"/>
        <text x="${x + width / 2}" y="91" fill="${TEXT}" font-size="20" font-weight="700" text-anchor="middle">${label}</text>`).join("");
  },
  version(progress) {
    return `<g fill="none" stroke-width="6"><path d="m128 49-47 35 47 35m142-70 47 35-47 35" stroke="${TEAL}"/>
      <path d="m216 43-34 83" stroke="${RED}" opacity="${.64 + .36 * progress}"/></g>`;
  },
};

function svg(size, body) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">${body}</svg>`);
}

function textArt(page, size) {
  const title = page.private ? "Private page" : previewTitle(page);
  const kicker = page.private ? "PRIVATE LINK" : page.kicker;
  const tagline = page.private ? "Open YinYang EQ to continue." : page.tagline;
  const titleSize = title.length > 22 ? 58 : 67;
  const lines = wrap(title, titleSize, 550, .62);
  const titleY = 234;
  const copyY = titleY + (lines.length - 1) * titleSize * 1.11 + 58;
  return svg(size, `
    <defs>
      <linearGradient id="shade"><stop stop-color="#050b10" stop-opacity=".95"/>
        <stop offset=".36" stop-color="#050b10" stop-opacity=".77"/><stop offset=".58" stop-color="#050b10" stop-opacity=".10"/>
        <stop offset="1" stop-color="#050b10" stop-opacity="0"/></linearGradient>
      <linearGradient id="floor" x2="0" y2="1"><stop offset=".54" stop-color="#050b10" stop-opacity="0"/>
        <stop offset="1" stop-color="#050b10" stop-opacity=".57"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#shade)"/><rect width="${W}" height="${H}" fill="url(#floor)"/>
    <text x="159" y="84" font-weight="700" font-size="25" letter-spacing="2" fill="${TEXT}">YINYANG <tspan fill="${TEAL}">EQ</tspan></text>
    <text x="76" y="155" font-size="21" font-weight="700" letter-spacing="3" fill="${TEAL}">${esc(kicker)}</text>
    ${lines.map((line, i) => `<text x="72" y="${titleY + i * titleSize * 1.11}" font-weight="800" font-size="${titleSize}" fill="${TEXT}">${esc(line)}</text>`).join("")}
    ${wrap(tagline, 32, 515).map((line, i) => `<text x="76" y="${copyY + i * 42}" font-size="32" fill="${MUTED}">${esc(line)}</text>`).join("")}
    <path d="M91 543H174" stroke="${TEAL}" stroke-width="2" opacity=".52"/>
    <circle cx="77" cy="543" r="6" fill="${RED}"/><circle cx="188" cy="543" r="6" fill="${BLUE}"/>
  `);
}

let scene;
export async function prepareShareCard(page, size = SHARE_IMAGE_SIZE) {
  // Frame the orb in the right half so it stays bright and clear of the headline.
  scene ??= sharp(source("brand-landscape-crimson.webp")).resize({ width: 1530 })
    .extract({ left: 0, top: 15, width: W, height: H }).png().toBuffer();
  const logo = await sharp(source("brand-header.svg"))
    .resize(Math.round(92 * size.width / W)).png().toBuffer();
  const background = await sharp(await scene).resize(size.width, size.height).composite([
    { input: textArt(page, size) },
    { input: logo, left: Math.round(62 * size.width / W), top: Math.round(42 * size.height / H) },
  ]).png().toBuffer();
  return (phase = restPhase) => {
    const motif = motifs[page.kind];
    if (!motif) return sharp(background);
    const progress = .5 - .5 * Math.cos(phase * Math.PI * 2);
    return sharp(background).composite([{ input: svg(size, `
      <g transform="translate(692 382) scale(1.10)" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="1" width="396" height="163" rx="23" fill="#07141e" fill-opacity=".90" stroke="#8dcedc" stroke-opacity=".61" stroke-width="2"/>
        ${motif(progress, phase)}
      </g>`) }]);
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await mkdir(out, { recursive: true });
  // The legacy Discover image URL now points to the Rankings artwork.
  const pages = [...sharePreviewCards, { ...sharePageFor("/discover"), slug: "discover" }].filter(page => !page.image);
  const slug = process.argv.find(arg => arg.startsWith("--slug="))?.slice(7);
  if (slug && !pages.some(page => page.slug === slug)) throw new Error("Unknown generated share-card slug.");
  const done = new Set();
  for (const page of pages) {
    if (done.has(page.slug) || (slug && page.slug !== slug)) continue;
    done.add(page.slug);
    const render = await prepareShareCard(page);
    const jpg = await render().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    await writeFile(new URL(`${page.slug}.jpg`, out), jpg);
    console.log(`${page.slug}.jpg ${Math.round(jpg.length / 1024)} KB`);
  }
}
