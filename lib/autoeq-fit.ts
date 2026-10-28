import { fitAutoEq, autoEqReferenceOffset, response, type PeqFilter } from './autoeq';
import { finalizeVariant, peakBoost } from './preference-finalize';
import { at, fitGrid, validatePoints } from './peqdb-engine';
import type { Point } from './curves';

export const PEQDB_VERSION = 'fdc0db772164387c2df8739742594197c6851fc3';
export type AutoEqRequest = { raw: Point[]; targets: Point[][]; kind: 'shootout' | 'export'; bands: 10 | 15 | 20; sampleRate: number; legacyPriority?: 'smooth' | 'close' };
export type AutoEqFit = { filters: PeqFilter[]; preamp: number; peakBoost: number; rms: number; engine: 'peqdb' | 'legacy'; engineVersion: string; sampleRate: number; smoothing: 'none' | 'legacy'; fallbackReason?: string };

export function validateRequest(request: AutoEqRequest) {
  validatePoints(request.raw);
  if (!['shootout', 'export'].includes(request.kind) || ![10, 15, 20].includes(request.bands) || request.kind === 'shootout' && request.bands !== 10 ||
      !Number.isFinite(request.sampleRate) || request.sampleRate < 3000 || request.sampleRate > 768000 || request.targets.length < 1 || request.targets.length > 3 || request.legacyPriority !== undefined && !['smooth', 'close'].includes(request.legacyPriority)) throw Error('Unsupported EQ request.');
  request.targets.forEach(validatePoints);
}

export function correction(raw: Point[], target: Point[], kind: AutoEqRequest['kind']): Point[] {
  const delta = fitGrid.map(hz => at(target, hz) - at(raw, hz));
  const offset = kind === 'shootout' ? autoEqReferenceOffset(raw, target) : at(target, 1000) - at(raw, 1000);
  return fitGrid.map((hz, i) => [hz, delta[i] - offset]);
}

export function describeFit(request: AutoEqRequest, target: Point[], filters: PeqFilter[], engine: AutoEqFit['engine'], fallbackReason?: string): AutoEqFit {
  if (filters.length < 1 || filters.length > request.bands || filters.some(f => !['PK', 'LSC', 'HSC'].includes(f.type ?? 'PK') || ![f.hz, f.gain, f.q].every(Number.isFinite) || f.hz < 20 || f.hz >= request.sampleRate / 2 || Math.abs(f.gain) > 24 || f.q < .1 || f.q > 20)) throw Error('The EQ engine returned invalid filters.');
  const desired = correction(request.raw, target, request.kind);
  let peak = peakBoost(filters);
  for (let i = 0; i <= 4096; i++) {
    const hz = 20 * (Math.min(20000, request.sampleRate * .49) / 20) ** (i / 4096);
    peak = Math.max(peak, filters.reduce((sum, filter) => sum + response(hz, filter, request.sampleRate), 0));
  }
  const rms = Math.sqrt(desired.reduce((sum, [hz, db]) => sum + (db - filters.reduce((s, f) => s + response(hz, f, request.sampleRate), 0)) ** 2, 0) / desired.length);
  if (![peak, rms].every(Number.isFinite)) throw Error('The EQ engine returned an invalid response.');
  return { filters, peakBoost: peak, preamp: -Math.ceil((Math.max(0, peak) + (request.kind === 'shootout' ? 1 : .5)) * 10) / 10,
    rms, engine, engineVersion: engine === 'peqdb' ? `${PEQDB_VERSION}:unsmoothed-fixed-reference-v1` : `yinyang-${request.kind === 'shootout' ? 'shootout' : `precise-${request.legacyPriority ?? 'close'}`}@update124;metrics=autoeq-fit-v1`, sampleRate: request.sampleRate,
    smoothing: engine === 'peqdb' ? 'none' : 'legacy', ...(fallbackReason ? { fallbackReason } : {}) };
}

export function legacyBatch(request: AutoEqRequest, reason: string): AutoEqFit[] {
  validateRequest(request);
  return request.targets.map(target => {
    const result = request.kind === 'shootout' ? fitAutoEq(request.raw, target) : finalizeVariant(request.raw, target, request.bands, 'precise', request.legacyPriority ?? 'close');
    const filters = (result.filters.length ? result.filters : [{ hz: 1000, gain: 0, q: 1 }]).map(f => ({ ...f, hz: Math.min(f.hz, request.sampleRate * .49) }));
    return describeFit(request, target, filters, 'legacy', reason);
  });
}
