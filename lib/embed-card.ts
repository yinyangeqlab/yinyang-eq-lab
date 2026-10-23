// Dependency-free 1200x630 PNG link-preview card for a shareable shootout.
// It runs in a Worker, so there is no image library: light is accumulated in
// float buffers (strokes, blurred halos, an analytic yin-yang) and encoded to a
// PNG with CompressionStream. The art is seeded from the shootout id and the
// number of targets and never plots the real curves, so a preview cannot give
// away what the blind comparison is meant to hide.

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const W = CARD_WIDTH, H = CARD_HEIGHT;
type Color = readonly [number, number, number];
const RED: Color = [1, .22, .3], BLUE: Color = [.25, .5, 1], TEAL: Color = [.35, .85, .79], AMBER: Color = [1, .72, .25];

function seeded(text: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h |= 0; h = h + 0x6d2b79f5 | 0; let t = Math.imul(h ^ h >>> 15, 1 | h); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/** Adds a soft round dot to a single-channel layer. */
function stamp(layer: Float32Array, x: number, y: number, radius: number, value: number) {
  const x0 = Math.max(0, Math.floor(x - radius - 1)), x1 = Math.min(W - 1, Math.ceil(x + radius + 1));
  const y0 = Math.max(0, Math.floor(y - radius - 1)), y1 = Math.min(H - 1, Math.ceil(y + radius + 1));
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const d = Math.hypot(px + .5 - x, py + .5 - y);
    if (d < radius + 1) layer[py * W + px] += value * Math.min(1, Math.max(0, radius + .5 - d));
  }
}
function polyline(layer: Float32Array, points: readonly (readonly [number, number])[], radius: number, value: number) {
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / Math.max(.7, radius * .35)));
    for (let s = 0; s <= steps; s++) stamp(layer, ax + (bx - ax) * s / steps, ay + (by - ay) * s / steps, radius, value / (1 + radius * .35));
  }
}
/** Separable box blur, applied three times to approximate a Gaussian. */
function blur(source: Float32Array, radius: number): Float32Array {
  let a = source;
  const b = new Float32Array(W * H);
  const size = radius * 2 + 1;
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) {
      let sum = 0; const row = y * W;
      for (let x = -radius; x <= radius; x++) sum += a[row + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) {
        b[row + x] = sum / size;
        sum += a[row + Math.min(W - 1, x + radius + 1)] - a[row + Math.max(0, x - radius)];
      }
    }
    const t = new Float32Array(W * H);
    for (let x = 0; x < W; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) sum += b[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) {
        t[y * W + x] = sum / size;
        sum += b[Math.min(H - 1, y + radius + 1) * W + x] - b[Math.max(0, y - radius) * W + x];
      }
    }
    a = t;
  }
  return a;
}
function addLight(buf: Float32Array, layer: Float32Array, color: Color, core: number, halo: number, haloRadius: number) {
  const soft = blur(layer, haloRadius), wide = blur(soft, haloRadius * 2);
  for (let i = 0; i < W * H; i++) {
    const v = layer[i] * core + soft[i] * halo + wide[i] * halo * 1.4;
    buf[i * 3] += color[0] * v; buf[i * 3 + 1] += color[1] * v; buf[i * 3 + 2] += color[2] * v;
  }
}

/** One EQ-curve-like ridge: layered sines plus a few Gaussian bumps, drawn left to right. */
function ridge(rand: () => number, x0: number, x1: number, baseY: number, amplitude: number): [number, number][] {
  const waves = [0, 1, 2].map(() => ({ f: .006 + rand() * .012, p: rand() * 6.28, a: amplitude * (.25 + rand() * .45) }));
  const bumps = [0, 1].map(() => ({ c: x0 + (x1 - x0) * (.2 + rand() * .6), w: 40 + rand() * 70, a: (rand() - .35) * amplitude * 1.6 }));
  const points: [number, number][] = [];
  for (let x = x0; x <= x1; x += 4) {
    let y = baseY;
    for (const wave of waves) y += Math.sin(x * wave.f + wave.p) * wave.a;
    for (const bump of bumps) y += bump.a * Math.exp(-(((x - bump.c) / bump.w) ** 2));
    const edge = Math.min(1, (x - x0) / 40, (x1 - x) / 40);
    points.push([x, baseY + (y - baseY) * Math.max(0, edge)]);
  }
  return points;
}

// Stroke letters in unit boxes.
const GLYPHS: Record<string, [number, number][][]> = {
  A: [[[0, 1], [.5, 0], [1, 1]], [[.2, .66], [.8, .66]]],
  B: [[[0, 0], [0, 1]], [[0, 0], [.62, 0], [.86, .12], [.86, .34], [.62, .48], [0, .48]], [[0, .48], [.68, .48], [.94, .62], [.94, .86], [.68, 1], [0, 1]]],
};
function letter(layer: Float32Array, key: "A" | "B", cx: number, cy: number, height: number) {
  const width = height * .72, left = cx - width / 2, top = cy - height / 2;
  for (const stroke of GLYPHS[key]) polyline(layer, stroke.map(([u, v]) => [left + u * width, top + v * height] as [number, number]), 5.5, .8);
}

const smooth = (edge: number) => Math.min(1, Math.max(0, .5 - edge));
const circle = (px: number, py: number, cx: number, cy: number, r: number) => Math.hypot(px - cx, py - cy) - r;

function crc32(bytes: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < bytes.length; i++) { c ^= bytes[i]; for (let k = 0; k < 8; k++) c = c & 1 ? c >>> 1 ^ 0xedb88320 : c >>> 1; }
  return ~c >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length), view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Encodes 8-bit RGB rows as a PNG using the Sub filter, which suits smooth gradients. */
export async function encodePng(rgb: Uint8Array, width: number, height: number): Promise<Uint8Array> {
  const stride = width * 3, raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1);
    raw[row] = 1;
    for (let i = 0; i < stride; i++) raw[row + 1 + i] = (rgb[y * stride + i] - (i >= 3 ? rgb[y * stride + i - 3] : 0)) & 255;
  }
  const header = new Uint8Array(13), view = new DataView(header.buffer);
  view.setUint32(0, width); view.setUint32(4, height); header[8] = 8; header[9] = 2;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", await deflate(raw)), chunk("IEND", new Uint8Array(0))];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) { png.set(part, offset); offset += part.length; }
  return png;
}

export async function renderShootoutCard(id: string, targetCount: number): Promise<Uint8Array> {
  const rand = seeded(id + ":" + targetCount);
  const buf = new Float32Array(W * H * 3);

  // Backdrop: deep teal centre, red and blue washes at the outer edges.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, dx = (x - W / 2) / (W / 2), dy = (y - H * .48) / (H / 2);
    const r2 = Math.min(1.6, dx * dx * .8 + dy * dy), centre = Math.exp(-r2 * 2.2);
    const side = Math.max(0, Math.abs(dx) - .25) / .75, red = x < W / 2 ? side : 0, blue = x >= W / 2 ? side : 0;
    buf[i] = .002 + centre * .006 + red * red * .05 + blue * .004;
    buf[i + 1] = .005 + centre * .03 + blue * .016 + red * .003;
    buf[i + 2] = .008 + centre * .04 + blue * blue * .10 + red * .01;
  }

  // Faint frequency grid.
  const grid = new Float32Array(W * H);
  for (const x of [120, 300, 480, 660, 840, 1020]) for (let y = 0; y < H; y++) grid[y * W + x] += .05;
  for (const y of [105, 210, 315, 420, 525]) for (let x = 0; x < W; x++) grid[y * W + x] += .05;
  for (let i = 0; i < W * H; i++) { buf[i * 3] += grid[i] * .1; buf[i * 3 + 1] += grid[i] * .55; buf[i * 3 + 2] += grid[i] * .5; }

  // One light layer per colour keeps the number of blur passes small.
  const layers = { red: new Float32Array(W * H), blue: new Float32Array(W * H), teal: new Float32Array(W * H), amber: new Float32Array(W * H) };

  // Curve-like ridges, red on the A side and blue on the B side, unique to this id.
  for (const [layer, x0, x1] of [[layers.red, 20, 470], [layers.blue, 730, 1180]] as const) {
    for (let line = 0; line < 4; line++) {
      const points = ridge(rand, x0, x1, 250 + line * 46 + rand() * 30, 38 + line * 7);
      polyline(layer, points, line === 0 ? 3 : 2, line === 0 ? .42 : .24);
    }
  }
  letter(layers.red, "A", 330, 300, 150);
  letter(layers.blue, "B", 870, 300, 150);

  // Orbs: one per target.
  const orbLayers = [layers.red, layers.blue, layers.teal, layers.amber].slice(0, Math.min(4, targetCount));
  orbLayers.forEach((layer, index) => stamp(layer, W / 2 + (index - (orbLayers.length - 1) / 2) * 62, 548, 12, .8));

  // Yin-yang disc: soft glow from a blurred mask, then the disc itself composited over the light.
  const cx = W / 2, cy = 300, R = 150, discMask = new Float32Array(W * H);
  for (let y = cy - R - 2; y < cy + R + 2; y++) for (let x = cx - R - 2; x < cx + R + 2; x++) discMask[y * W + x] = smooth(Math.hypot(x + .5 - cx, y + .5 - cy) - R);
  addLight(buf, discMask, TEAL, 0, .6, 14);
  addLight(buf, layers.red, RED, 1, 1.5, 7);
  addLight(buf, layers.blue, BLUE, 1, 1.5, 7);
  addLight(buf, layers.teal, TEAL, 1, 1.5, 7);
  addLight(buf, layers.amber, AMBER, 1, 1.5, 7);
  const ring = new Float32Array(W * H);
  for (let y = cy - R - 6; y < cy + R + 6; y++) for (let x = cx - R - 6; x < cx + R + 6; x++) {
    const px = x + .5 - cx, py = y + .5 - cy, d = Math.hypot(px, py), i = (y * W + x) * 3;
    if (d > R + 4) continue;
    const half = Math.max(-px, d - R);                         // right half of the disc is filled
    const upper = circle(px, py, 0, -R / 2, R / 2), lower = circle(px, py, 0, R / 2, R / 2);
    let sdf = Math.min(half, upper);                           // add the upper lobe
    sdf = Math.max(sdf, -lower);                               // carve the lower lobe
    sdf = Math.max(sdf, -circle(px, py, 0, -R / 2, R / 8));    // eye in the filled lobe
    sdf = Math.min(sdf, circle(px, py, 0, R / 2, R / 8));      // eye in the empty lobe
    sdf = Math.max(sdf, d - R);
    const fill = smooth(sdf), inside = smooth(d - R), base = [.004, .014, .018];
    ring[y * W + x] = smooth(Math.abs(d - R + 1.5) - 2) * .8;
    for (let k = 0; k < 3; k++) buf[i + k] = buf[i + k] * (1 - inside) + (base[k] * (1 - fill) + TEAL[k] * fill * .62) * inside;
  }
  addLight(buf, ring, TEAL, .9, .5, 5);

  // Tone-map, vignette and 8-bit output with a whisper of dither.
  const out = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2), vignette = 1 - .35 * Math.min(1, dx * dx * .5 + dy * dy * .6);
    const dither = (((x * 1103515245 + y * 12345) >>> 8) & 255) / 255 - .5;
    for (let k = 0; k < 3; k++) out[i + k] = Math.max(0, Math.min(255, Math.round((1 - Math.exp(-buf[i + k] * vignette * 1.7)) ** (1 / 1.55) * 255 + dither * .9)));
  }
  return encodePng(out, W, H);
}
