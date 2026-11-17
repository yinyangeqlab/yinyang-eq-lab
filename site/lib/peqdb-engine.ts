import type { Point } from './curves';
import type { PeqFilter } from './autoeq';

export const fitGrid = Array.from({ length: 384 }, (_, i) => 20 * 1000 ** (i / 383));
export type SmoothMode = 'none' | 'ie' | 'oe';
export type WasmFit = { filters: PeqFilter[]; offset: number; fitMs: number; memoryBytes: number; objective: number[] };
export type WasmModule = {
  HEAP32: Int32Array; HEAPF32: Float32Array;
  _malloc: (bytes: number) => number; _free: (pointer: number) => void;
  _get_ie_smooth: () => number; _get_oe_smooth: () => number;
  _preprocess: (...args: number[]) => number;
  _autoeq: (...args: number[]) => number;
};

export function validatePoints(points: Point[]) {
  if (points.length < 2 || points.length > 20000 || points.some(([hz, db], i) =>
    !Number.isFinite(hz) || !Number.isFinite(db) || hz <= 0 || Math.abs(db) > 200 || i > 0 && hz <= points[i - 1][0])) {
    throw Error('Use a sorted curve with at least two unique frequencies and finite dB values.');
  }
}

export function at(points: Point[], hz: number) {
  if (hz <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) if (points[i][0] >= hz) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    return y0 + (y1 - y0) * Math.log(hz / x0) / Math.log(x1 / x0);
  }
  return points[points.length - 1][1];
}

export type WasmFactory = (options: { wasmBinary?: Uint8Array; print: () => void; printErr: () => void }) => Promise<WasmModule>;
export async function createEngine(factory: WasmFactory, wasmBinary?: Uint8Array) {
  const wasm: WasmModule = await factory({ ...(wasmBinary ? { wasmBinary } : {}), print: () => {}, printErr: () => {} });
  return {
    fit(raw: Point[], target: Point[], smooth: SmoothMode = 'none', bands = 10, steps = 3000, sampleRate = 48000, demean = true): WasmFit {
      validatePoints(raw); validatePoints(target);
      if (!Number.isInteger(bands) || bands < 2 || bands > 32 || !Number.isInteger(steps) || steps < 1 || steps > 10000 ||
          (!Number.isFinite(sampleRate) || sampleRate < 44100 || sampleRate > 192000) || !['none', 'ie', 'oe'].includes(smooth)) throw Error('Unsupported fit configuration.');
      const allocations: number[] = [];
      const alloc = (bytes: number) => { const p = wasm._malloc(bytes); if (!p) throw Error('WASM allocation failed.'); allocations.push(p); return p; };
      try {
        const pf = alloc(384 * 4), pdst = alloc(384 * 4), psrc = alloc(384 * 4), pr = alloc(384 * 4);
        const types = alloc(bands * 4), f0 = alloc(bands * 4), gain = alloc(bands * 4), q = alloc(bands * 4), amp = alloc(4);
        const flim = alloc(bands * 8), glim = alloc(bands * 8), qlim = alloc(bands * 8);
        wasm.HEAPF32.set(fitGrid, pf / 4);
        wasm.HEAPF32.set(fitGrid.map(hz => at(target, hz)), pdst / 4);
        wasm.HEAPF32.set(fitGrid.map(hz => at(raw, hz)), psrc / 4);
        for (let i = 0; i < bands; i++) {
          wasm.HEAP32[types / 4 + i] = i === 0 ? 1 : i === 1 ? 2 : 0;
          wasm.HEAPF32.set([20, 16000], flim / 4 + i * 2);
          wasm.HEAPF32.set([-16, 16], glim / 4 + i * 2);
          wasm.HEAPF32.set([.4, i < 2 ? 3 : 4], qlim / 4 + i * 2);
        }
        const t0 = performance.now();
        const mean = wasm._preprocess(pf, pdst, psrc, pr, smooth === 'ie' ? wasm._get_ie_smooth() : smooth === 'oe' ? wasm._get_oe_smooth() : 0, demean ? 1 : 0);
        wasm._autoeq(steps, types, f0, gain, q, demean ? amp : 0, flim, glim, qlim, bands, pf, pr, sampleRate);
        const fitMs = performance.now() - t0;
        const filters = Array.from({ length: bands }, (_, i) => ({ type: (i === 0 ? 'LSC' : i === 1 ? 'HSC' : 'PK') as PeqFilter['type'],
          hz: wasm.HEAPF32[f0 / 4 + i], gain: wasm.HEAPF32[gain / 4 + i], q: wasm.HEAPF32[q / 4 + i] }));
        if (filters.some(f => ![f.hz, f.gain, f.q].every(Number.isFinite))) throw Error('The WASM optimizer returned a non-finite filter.');
        return { filters, offset: demean ? mean + wasm.HEAPF32[amp / 4] : 0, fitMs,
          memoryBytes: wasm.HEAPF32.buffer.byteLength, objective: Array.from(wasm.HEAPF32.subarray(pr / 4, pr / 4 + 384)) };
      } finally { for (const p of allocations.reverse()) wasm._free(p); }
    },
  };
}
