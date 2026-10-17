import encodedWaveforms from "@/data/music-waveforms.json";
import type { TrackAnalysis } from "@/lib/loudness";

type Waveform = Pick<TrackAnalysis, "waveform">;
const cache = new Map<string, Waveform>();

export function curatedWaveform(fileUrl: string): Waveform | null {
  const cached = cache.get(fileUrl);
  if (cached) return cached;
  const encoded = (encodedWaveforms as Record<string, string>)[fileUrl];
  if (!encoded) return null;
  const bytes = atob(encoded);
  const bins = bytes.length / 4;
  if (!Number.isInteger(bins) || bins < 1) return null;
  const minL = new Float32Array(bins), maxL = new Float32Array(bins);
  const minR = new Float32Array(bins), maxR = new Float32Array(bins);
  const signed = (value: number) => (value > 127 ? value - 256 : value) / 127;
  for (let i = 0; i < bins; i++) {
    minL[i] = signed(bytes.charCodeAt(i * 4));
    maxL[i] = signed(bytes.charCodeAt(i * 4 + 1));
    minR[i] = signed(bytes.charCodeAt(i * 4 + 2));
    maxR[i] = signed(bytes.charCodeAt(i * 4 + 3));
  }
  const result = { waveform: { minL, maxL, minR, maxR } };
  cache.set(fileUrl, result);
  return result;
}
