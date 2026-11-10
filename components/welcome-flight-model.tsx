"use client";

import { useEffect, useRef } from "react";

/**
 * Decorative 3D devices for the welcome flights.
 *
 * Each device is a small mesh of quads built once from two primitives (a lathe
 * and a tube, both made by one ring sweep). Every frame the mesh is rotated on
 * the CPU, projected with mild perspective, back-face culled, depth sorted and
 * filled into a transparent Canvas2D. Coordinates are the 100-unit flight art
 * box: x right, y up, z toward the viewer, origin at the device centre.
 */

export type FlightModelKind = "headphones" | "iems";

type Vec = [number, number, number];
type Material = { rgb: Vec; gloss: number; shine: number; sheen: number };
type Station = { at: Vec; dir: Vec; ru: number; rv: number };
type Tone = (station: number, side: number) => number;
type Draft = { points: number[]; quads: number[]; normals: number[]; tones: number[] };
type Pose = { centre: [number, number]; scale: number; spinPeriod: number; spinSense: number; initialYaw: number };
type Model = Pose & { points: Float32Array; quads: Uint16Array; normals: Float32Array; tones: Uint8Array; materials: Material[] };
type Scratch = { view: Float32Array; screen: Float32Array; depth: Float32Array; shade: Uint8ClampedArray; order: Uint16Array };
type Rotation = [number, number, number, number];

const turn = Math.PI * 2;
const up: Vec = [0, 1, 0];
const fore: Vec = [0, 0, 1];
const none: Vec = [0, 0, 0];

const add = (origin: Vec, ...steps: [number, Vec][]): Vec => {
  const out: Vec = [origin[0], origin[1], origin[2]];
  for (const [amount, dir] of steps) {
    out[0] += amount * dir[0]; out[1] += amount * dir[1]; out[2] += amount * dir[2];
  }
  return out;
};
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v: Vec): Vec => {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};

/**
 * Joins consecutive elliptical rings with quads. Each ring lies across its
 * station's direction; `ref` fixes where a ring starts (side 0 points along
 * ref x dir). Stations must run from one end of the solid to the other so the
 * stored normals face outward. A station with zero radii closes the surface.
 */
function sweep(draft: Draft, stations: Station[], ref: Vec, sides: number, tone: Tone) {
  const first = draft.points.length / 3;
  for (const { at, dir, ru, rv } of stations) {
    const axis = unit(dir);
    const across = unit(cross(ref, axis));
    const around = cross(axis, across);
    for (let side = 0; side < sides; side++) {
      const angle = side * turn / sides;
      draft.points.push(...add(at, [Math.cos(angle) * ru, across], [Math.sin(angle) * rv, around]));
    }
  }
  const point = (index: number): Vec => [draft.points[index * 3], draft.points[index * 3 + 1], draft.points[index * 3 + 2]];
  for (let station = 0; station + 1 < stations.length; station++) {
    for (let side = 0; side < sides; side++) {
      const next = (side + 1) % sides;
      const row = first + station * sides;
      const corners = [row + side, row + sides + side, row + sides + next, row + next];
      const [p0, p1, p2, p3] = corners.map(point);
      // The diagonals also give a usable normal for the triangles at a closed end.
      const normal = cross(add(p3, [-1, p1]), add(p2, [-1, p0]));
      const length = Math.hypot(normal[0], normal[1], normal[2]);
      if (length < 1e-6) continue;
      draft.quads.push(...corners);
      draft.normals.push(normal[0] / length, normal[1] / length, normal[2] / length);
      draft.tones.push(tone(station, side));
    }
  }
}

/**
 * A solid of revolution. Profile rows are [distance along the spine, radius,
 * tone of the band that starts there]. `wide` and `tall` squash the rings, and
 * a spine that differs from the axis leans the solid without tilting its rings.
 */
function lathe(draft: Draft, origin: Vec, axis: Vec, ref: Vec, profile: [number, number, number][], sides: number,
  wide = 1, tall = 1, spine: Vec = axis) {
  const stations = profile.map(([distance, radius]) => ({ at: add(origin, [distance, spine]), dir: axis, ru: radius * wide, rv: radius * tall }));
  sweep(draft, stations, ref, sides, station => profile[station][2]);
}

/** A rounded-end tube along a path. `girth` gives the two half-widths at each path point. */
function tube(draft: Draft, path: Vec[], ref: Vec, sides: number, girth: (index: number) => [number, number], tone: Tone) {
  const last = path.length - 1;
  const stations: Station[] = [];
  const source: number[] = [];
  path.forEach((at, index) => {
    const dir = unit(add(path[Math.min(index + 1, last)], [-1, path[Math.max(index - 1, 0)]]));
    const [ru, rv] = girth(index);
    const cap = index === 0 ? -1 : index === last ? 1 : 0;
    const round = Math.min(ru, rv);
    const dome = (reach: number, swell: number) => {
      stations.push({ at: add(at, [cap * reach * round, dir]), dir, ru: ru * swell, rv: rv * swell });
      source.push(index);
    };
    if (cap < 0) { dome(.6, 0); dome(.32, .72); }
    stations.push({ at, dir, ru, rv });
    source.push(index);
    if (cap > 0) { dome(.32, .72); dome(.6, 0); }
  });
  sweep(draft, stations, ref, sides, (station, side) => tone(source[station], side));
}

const emptyDraft = (): Draft => ({ points: [], quads: [], normals: [], tones: [] });
const finish = (draft: Draft, materials: Material[], pose: Pose): Model => ({
  ...pose, materials,
  points: Float32Array.from(draft.points), quads: Uint16Array.from(draft.quads),
  normals: Float32Array.from(draft.normals), tones: Uint8Array.from(draft.tones)
});

/** Dark ruby over-ear headphones: a thick padded band over two oval cups. */
function buildHeadphones(): Model {
  const ruby = 0, deep = 1, pad = 2, cloth = 3, steel = 4, trim = 5;
  const materials: Material[] = [
    { rgb: [156, 30, 50], gloss: .34, shine: 22, sheen: .34 },
    { rgb: [108, 18, 36], gloss: .5, shine: 40, sheen: .3 },
    { rgb: [58, 40, 46], gloss: .06, shine: 8, sheen: .16 },
    { rgb: [34, 24, 29], gloss: 0, shine: 1, sheen: .08 },
    { rgb: [150, 146, 156], gloss: .5, shine: 30, sheen: .2 },
    { rgb: [184, 112, 112], gloss: .45, shine: 30, sheen: .2 }
  ];
  const draft = emptyDraft();

  // The band arcs over the top from inside the right cup to inside the left one.
  const spans = 24, bandSides = 10;
  const arc: Vec[] = [];
  for (let index = 0; index <= spans; index++) {
    const angle = (-14 + 208 * index / spans) * Math.PI / 180;
    arc.push([21.4 * Math.cos(angle), 1 + 22 * Math.sin(angle), 0]);
  }
  const fromCrown = (index: number) => Math.abs(index / spans - .5) * 2;
  tube(draft, arc, fore, bandSides,
    // Thickest and widest at the crown, slimmer where it becomes the sliders.
    index => [1.75 - .35 * fromCrown(index), 3.7 - 1.3 * fromCrown(index) ** 2],
    (index, side) => {
      if (fromCrown(index + .5) > .78) return steel;
      // Side 0 faces the head, so the strip around it is the cushion.
      return Math.cos((side + .5) * turn / bandSides) > .7 ? pad : ruby;
    });

  // From the head outward: driver cloth, ear cushion, shell, bevel and outer plate.
  const cup: [number, number, number][] = [
    [-4.6, 0, cloth], [-4.6, 6.6, pad], [-6.4, 7.5, pad], [-6.9, 9.1, pad], [-6.2, 10.5, pad],
    [-4.4, 11, pad], [-3, 10.6, deep], [-2.6, 10.1, ruby], [-1, 11, ruby], [2, 11, ruby],
    [3.9, 10.1, ruby], [5, 8.5, trim], [5.3, 7.3, deep], [5.6, 3.2, trim], [5.8, 0, trim]
  ];
  for (const side of [1, -1]) lathe(draft, [18.5 * side, -11, 0], [side, 0, 0], up, cup, 16, .9, 1.05);

  return finish(draft, materials, { centre: [50, 38], scale: 1, spinPeriod: 46, spinSense: 1, initialYaw: .6 });
}

/** A mirrored pair of cobalt in-ear monitors, each with shell, nozzle, tip and ear hook. */
function buildIems(): Model {
  const cobalt = 0, plate = 1, trim = 2, steel = 3, tip = 4, bore = 5, clear = 6;
  const materials: Material[] = [
    { rgb: [44, 84, 168], gloss: .36, shine: 24, sheen: .34 },
    { rgb: [27, 56, 140], gloss: .55, shine: 44, sheen: .3 },
    { rgb: [122, 150, 212], gloss: .45, shine: 30, sheen: .2 },
    { rgb: [150, 150, 162], gloss: .5, shine: 30, sheen: .2 },
    { rgb: [172, 186, 202], gloss: .16, shine: 10, sheen: .3 },
    { rgb: [22, 28, 44], gloss: 0, shine: 1, sheen: .08 },
    { rgb: [198, 212, 228], gloss: .4, shine: 20, sheen: .4 }
  ];
  const draft = emptyDraft();

  // From the ear side outward: rounded body, rim, bevel and faceplate.
  const shell: [number, number, number][] = [
    [-4.4, 0, cobalt], [-4.1, 3.2, cobalt], [-3, 5.7, cobalt], [-1.2, 7.2, cobalt], [.8, 7.6, cobalt],
    [2.2, 7.2, trim], [2.9, 6.4, plate], [3.2, 3.4, plate], [3.3, 0, plate]
  ];
  // Along the nozzle: stem inside the shell, then the mushroom tip and its bore.
  const nozzle: [number, number, number][] = [
    [-1.5, 0, steel], [-1.5, 1.8, steel], [3.3, 1.8, tip], [3, 4, tip], [4.6, 4.2, tip],
    [6.3, 3.4, tip], [7.5, 2.1, tip], [8, 1, bore], [8, 0, bore]
  ];

  for (const side of [1, -1]) {
    // Faceplates splay outward and forward. `out` and `tall` span the faceplate.
    const face = unit([.6 * side, .1, .79]);
    const wide = unit(cross(up, face));
    const tall = cross(face, wide);
    const out: Vec = [wide[0] * side, wide[1] * side, wide[2] * side];
    const core: Vec = [12 * side, -3, 0];

    // The ear side of the body sits a little lower, toward the nozzle.
    lathe(draft, core, face, up, shell, 14, 1, .8, add(face, [.22, tall]));

    const stem = add(core, [-2.2, face], [-2.4, tall], [-1.2, out]);
    const aim = unit(add(none, [-.78, face], [-.55, tall], [-.28, out]));
    lathe(draft, stem, aim, wide, nozzle, 12);

    // Connector straight up from the front of the shell, then a hook that
    // loops over and comes down clear of the shell's far edge.
    const hook: Vec[] = [add(core, [3.6, tall], [-4.4, out], [.5, face]), add(core, [7.4, tall], [-4.4, out], [.5, face])];
    const loops = 11, radius = 6.4;
    for (let index = 1; index <= loops; index++) {
      const progress = index / loops;
      const angle = Math.PI - (Math.PI + .2) * progress;
      hook.push(add(core, [7.4 + radius * Math.sin(angle), tall], [2 + radius * Math.cos(angle), out], [.5 - 2.4 * progress * progress, face]));
    }
    hook.push(add(hook[hook.length - 1], [-1.5, tall], [-.3, out], [-.4, face]));
    tube(draft, hook, face, 8, index => index < 2 ? [1.15, 1.15] : [.8, .8], index => index < 1 ? steel : clear);
  }

  return finish(draft, materials, { centre: [50, 30.7], scale: 1.2, spinPeriod: 38, spinSense: -1, initialYaw: -.45 });
}

const models: Partial<Record<FlightModelKind, Model>> = {};

function axisTurn([x, y, z]: Vec, angle: number): Rotation {
  const s = Math.sin(angle / 2);
  return [x * s, y * s, z * s, Math.cos(angle / 2)];
}

function compose([x, y, z, w]: Rotation, [a, b, c, d]: Rotation): Rotation {
  const product: Rotation = [
    w * a + x * d + y * c - z * b,
    w * b - x * c + y * d + z * a,
    w * c + x * b - y * a + z * d,
    w * d - x * a - y * b - z * c,
  ];
  const length = Math.hypot(...product);
  return [product[0] / length, product[1] / length, product[2] / length, product[3] / length];
}

function globeMotion(model: Pose) {
  const nextAxis = (): Vec => {
    const bearing = Math.random() * turn;
    const lean = .24 + Math.random() * .95;
    return [Math.sin(lean) * Math.cos(bearing), model.spinSense * Math.cos(lean), Math.sin(lean) * Math.sin(bearing)];
  };
  const nextInterval = () => 12 + Math.random() * 10;
  let from: Vec = [0, model.spinSense, 0];
  let toward = nextAxis();
  let span = nextInterval(), elapsed = 0;
  let pose = compose(axisTurn([1, 0, 0], .2), axisTurn(up, model.initialYaw));
  return {
    get pose() { return pose; },
    advance(delta: number) {
      elapsed += delta;
      if (elapsed >= span) {
        elapsed -= span;
        from = toward;
        toward = nextAxis();
        span = nextInterval();
      }
      const phase = elapsed / span;
      const blend = phase * phase * (3 - 2 * phase);
      const axis = unit(add(from, [blend, add(toward, [-1, from])]));
      // Turn about a drifting axis in the sky. Accumulate the turn so the model
      // never snaps back to a previous pose when it picks a new direction.
      pose = compose(axisTurn(axis, turn * delta / model.spinPeriod), pose);
    },
  };
}

// View-space lighting: a soft key from the upper left front, matching the
// bubble's highlight, with sky fill from above.
const light = unit([-.48, .7, .53]);
const half = unit([light[0], light[1], light[2] + 1]);
const eye = 240;

function paintModel(context: CanvasRenderingContext2D, model: Model, scratch: Scratch, size: number, [x, y, z, w]: Rotation) {
  const { points, quads, normals, tones, materials } = model;
  const { view, screen, depth, shade, order } = scratch;

  const m00 = 1 - 2 * (y * y + z * z), m01 = 2 * (x * y - z * w), m02 = 2 * (x * z + y * w);
  const m10 = 2 * (x * y + z * w), m11 = 1 - 2 * (x * x + z * z), m12 = 2 * (y * z - x * w);
  const m20 = 2 * (x * z - y * w), m21 = 2 * (y * z + x * w), m22 = 1 - 2 * (x * x + y * y);

  const pixel = size / 100;
  for (let index = 0, spot = 0; index < points.length; index += 3, spot += 2) {
    const x = points[index], y = points[index + 1], z = points[index + 2];
    const vx = m00 * x + m01 * y + m02 * z, vy = m10 * x + m11 * y + m12 * z, vz = m20 * x + m21 * y + m22 * z;
    view[index] = vx; view[index + 1] = vy; view[index + 2] = vz;
    const zoom = model.scale * eye / (eye - vz);
    screen[spot] = (model.centre[0] + vx * zoom) * pixel;
    screen[spot + 1] = (model.centre[1] - vy * zoom) * pixel;
  }

  let count = 0;
  for (let face = 0; face < tones.length; face++) {
    const quad = face * 4, slot = face * 3;
    const a = quads[quad] * 3, b = quads[quad + 1] * 3, c = quads[quad + 2] * 3, d = quads[quad + 3] * 3;
    const mx = (view[a] + view[b] + view[c] + view[d]) / 4;
    const my = (view[a + 1] + view[b + 1] + view[c + 1] + view[d + 1]) / 4;
    const mz = (view[a + 2] + view[b + 2] + view[c + 2] + view[d + 2]) / 4;
    const nx = m00 * normals[slot] + m01 * normals[slot + 1] + m02 * normals[slot + 2];
    const ny = m10 * normals[slot] + m11 * normals[slot + 1] + m12 * normals[slot + 2];
    const nz = m20 * normals[slot] + m21 * normals[slot + 1] + m22 * normals[slot + 2];
    // Faces turned away from the eye are hidden by the rest of their solid.
    const toward = -nx * mx - ny * my + nz * (eye - mz);
    if (toward <= 0) continue;
    const facing = toward / Math.hypot(mx, my, eye - mz);

    const material = materials[tones[face]];
    const lambert = nx * light[0] + ny * light[1] + nz * light[2];
    // Wrapped diffuse plus a little light carried through the shaded side
    // keeps the material soft rather than plastic.
    const level = .3 + .2 * (.5 + .5 * ny) + .66 * Math.max(0, (lambert + .4) / 1.4) + .1 * Math.max(0, -lambert);
    const glint = 255 * material.gloss * Math.pow(Math.max(0, nx * half[0] + ny * half[1] + nz * half[2]), material.shine);
    // Grazing edges lighten toward a paler tint of the same colour.
    const edge = material.sheen * (1 - facing) * (1 - facing);
    for (let channel = 0; channel < 3; channel++) {
      const base = material.rgb[channel];
      shade[slot + channel] = base * level + glint + (base * .5 + 110) * edge;
    }
    depth[face] = mz;
    order[count++] = face;
  }

  // Painter's algorithm: farthest faces first.
  const visible = order.subarray(0, count);
  visible.sort((left, right) => depth[left] - depth[right]);

  context.clearRect(0, 0, size, size);
  context.lineJoin = "round";
  // A hairline in the face colour closes the antialiasing gaps between quads.
  context.lineWidth = Math.max(.5, size / 260);
  for (let index = 0; index < count; index++) {
    const face = visible[index], quad = face * 4, slot = face * 3;
    const a = quads[quad] * 2, b = quads[quad + 1] * 2, c = quads[quad + 2] * 2, d = quads[quad + 3] * 2;
    context.beginPath();
    context.moveTo(screen[a], screen[a + 1]);
    context.lineTo(screen[b], screen[b + 1]);
    context.lineTo(screen[c], screen[c + 1]);
    context.lineTo(screen[d], screen[d + 1]);
    context.closePath();
    const colour = `rgb(${shade[slot]},${shade[slot + 1]},${shade[slot + 2]})`;
    context.fillStyle = colour;
    context.strokeStyle = colour;
    context.fill();
    context.stroke();
  }
}

// About 20 frames a second is ample for a turn this slow.
const frameGap = 46;
const largestCanvas = 420;

/**
 * Paints one device into a square canvas that covers the flight art box.
 * The model clock only advances while `running` is true, so the device holds
 * its pose whenever the parent pauses the rest of the flight art.
 */
export function FlightModel({ kind, running }: { kind: FlightModelKind; running: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef(running);
  const wake = useRef<() => void>(() => {});
  useEffect(() => {
    const surface = canvas.current;
    const context = surface?.getContext("2d");
    if (!surface || !context) return;
    const model = models[kind] ??= kind === "headphones" ? buildHeadphones() : buildIems();
    const faces = model.tones.length;
    const scratch: Scratch = {
      view: new Float32Array(model.points.length), screen: new Float32Array(model.points.length / 3 * 2),
      depth: new Float32Array(faces), shade: new Uint8ClampedArray(faces * 3), order: new Uint16Array(faces)
    };
    const motion = globeMotion(model);
    let frame = 0, last = 0;
    const draw = () => paintModel(context, model, scratch, surface.width, motion.pose);
    const step = (now: number) => {
      frame = 0;
      if (!live.current) return;
      const gap = now - last;
      if (gap >= frameGap) {
        // A stalled tab resumes from where it was rather than jumping ahead.
        motion.advance(Math.min(gap, 4 * frameGap) / 1000);
        last = now;
        draw();
      }
      frame = requestAnimationFrame(step);
    };
    const sync = () => {
      if (live.current && !frame) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      } else if (!live.current && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    const fit = () => {
      // Layout size ignores the parent's depth scaling, so allow a little extra.
      const density = Math.min(window.devicePixelRatio || 1, 3);
      const size = Math.max(48, Math.min(largestCanvas, Math.round(surface.clientWidth * density * 1.1)));
      if (surface.width !== size || surface.height !== size) { surface.width = size; surface.height = size; }
      draw();
    };
    const observer = new ResizeObserver(fit);
    observer.observe(surface);
    fit();
    wake.current = sync;
    sync();
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      wake.current = () => {};
    };
  }, [kind]);
  useEffect(() => { live.current = running; wake.current(); }, [running]);
  return <canvas ref={canvas} className="welcome-flight-model" aria-hidden="true" />;
}
