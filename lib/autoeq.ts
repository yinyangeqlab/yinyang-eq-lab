import type { Point } from "@/lib/curves";

export type PeqFilter = { type?: "PK" | "LSC" | "HSC"; hz: number; gain: number; q: number };
const grid = Array.from({ length: 121 }, (_, i) => 20 * (16000 / 20) ** (i / 120));

function at(points: Point[], hz: number) {
  if (hz <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) if (points[i][0] >= hz) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    return y0 + (y1 - y0) * Math.log(hz / x0) / Math.log(x1 / x0);
  }
  return points[points.length - 1][1];
}

export function peqCoefficients(filter: PeqFilter, rate = 48000) {
  if (![filter.hz, filter.gain, filter.q, rate].every(Number.isFinite) || filter.hz <= 0 || filter.hz >= rate / 2 || filter.q <= 0) throw Error("Invalid playback filter.");
  const omega = 2 * Math.PI * filter.hz / rate, A = 10 ** (filter.gain / 40);
  const alpha = Math.sin(omega) / (2 * filter.q), c = Math.cos(omega), root = Math.sqrt(A);
  if (filter.type === "LSC") return {
    b: [A * ((A + 1) - (A - 1) * c + 2 * root * alpha), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - 2 * root * alpha)],
    a: [(A + 1) + (A - 1) * c + 2 * root * alpha, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - 2 * root * alpha],
  };
  if (filter.type === "HSC") return {
    b: [A * ((A + 1) + (A - 1) * c + 2 * root * alpha), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - 2 * root * alpha)],
    a: [(A + 1) - (A - 1) * c + 2 * root * alpha, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - 2 * root * alpha],
  };
  return { b: [1 + alpha * A, -2 * c, 1 - alpha * A], a: [1 + alpha / A, -2 * c, 1 - alpha / A] };
}

// RBJ peak/shelf biquad magnitude response, evaluated at each fitting frequency.
export function response(hz: number, filter: PeqFilter, rate = 48000) {
  const { b: [b0, b1, b2], a: [a0, a1, a2] } = peqCoefficients(filter, rate);
  const w = 2 * Math.PI * hz / rate, C = Math.cos(w), S = Math.sin(w), C2 = Math.cos(2 * w), S2 = Math.sin(2 * w);
  const nr = b0 + b1 * C + b2 * C2, ni = -(b1 * S + b2 * S2);
  const dr = a0 + a1 * C + a2 * C2, di = -(a1 * S + a2 * S2);
  return 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
}

export function autoEqReferenceOffset(raw: Point[], target: Point[]) {
  const mids = grid.filter(hz => hz >= 250 && hz <= 2500).map(hz => at(target, hz) - at(raw, hz));
  return mids.reduce((a, b) => a + b, 0) / mids.length;
}

export function fitAutoEq(raw: Point[], target: Point[]) {
  const delta = grid.map(hz => at(target, hz) - at(raw, hz));
  const offset = autoEqReferenceOffset(raw, target);
  const residual = delta.map(x => x - offset), filters: PeqFilter[] = [];
  const weight = (hz: number) => hz < 50 ? 1.2 : hz > 8000 ? .55 : 1;
  const loss = (rows: number[]) => rows.reduce((sum, value, i) => sum + (value * weight(grid[i])) ** 2, 0);
  for (let band = 0; band < 10; band++) {
    let worst = 0;
    for (let i = 1; i < grid.length; i++) if (Math.abs(residual[i] * weight(grid[i])) > Math.abs(residual[worst] * weight(grid[worst]))) worst = i;
    if (Math.abs(residual[worst]) < .25) break;
    const hz = grid[worst], limit = hz > 8000 ? 8 : 12, gain = Math.max(-limit, Math.min(limit, residual[worst]));
    let best: { filter: PeqFilter; remaining: number[] } | null = null, current = loss(residual);
    for (const q of [.35, .5, .7, 1, 1.4, 2, 3, 4.5, 6]) for (const scale of [.5, .75, 1]) {
      const filter = { hz, gain: gain * scale, q };
      const remaining = residual.map((value, i) => value - response(grid[i], filter));
      const next = loss(remaining);
      if (next < current) { current = next; best = { filter, remaining }; }
    }
    if (!best) break;
    filters.push(best.filter);
    residual.splice(0, residual.length, ...best.remaining);
  }
  const maxBoost = Math.max(0, ...grid.map(hz => filters.reduce((sum, filter) => sum + response(hz, filter), 0)));
  return { filters, preamp: -maxBoost - 1, rms: Math.sqrt(residual.reduce((sum, value) => sum + value * value, 0) / residual.length) };
}
