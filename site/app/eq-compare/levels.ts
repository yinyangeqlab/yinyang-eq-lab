import type { EqPreset } from "@/lib/blind-eq";
import { connectPreset } from "@/lib/blind-eq-audio";
import { channelBalance, type ChannelMatch } from "@/lib/channel-balance";
import { connectLoudnessWeighting, integratedLoudness } from "@/lib/loudness";

export type LoudnessTarget = -14 | -16 | -18 | "off";
type Measured = { loudness: number; peak: number };
export function comparisonLevels(measured: [Measured, Measured], target: LoudnessTarget) {
  const gains: [number, number] = [1, 1];
  if (target !== "off") {
    // Reserve common headroom at the loudest target. Each quieter setting
    // then brings both outputs down by the exact requested difference.
    measured.forEach((side, i) => { gains[i] = 10 ** ((-14 - side.loudness) / 20); });
  }
  const highestPeak = Math.max(...measured.map((side, i) => side.peak * gains[i]));
  const headroom = Math.min(1, 10 ** (-3 / 20) / Math.max(1e-9, highestPeak));
  const scale = headroom * (target === "off" ? 1 : 10 ** ((target + 14) / 20));
  return { gains: [gains[0] * scale, gains[1] * scale] as [number, number], headroomDb: 20 * Math.log10(headroom) };
}

export async function measureComparison(source: AudioBuffer, presets: [EqPreset, EqPreset], match: ChannelMatch | undefined, signal: AbortSignal) {
  const rate = source.sampleRate, hop = Math.round(rate * .1);
  const balance = match ? channelBalance(match, rate) : null;
  async function measure(preset: EqPreset): Promise<Measured> {
    const energies: number[] = [], windows: number[] = [];
    let peak = 0, shortPower = 0;
    // Measure the full filtered track, keeping at most 20 seconds of four-channel
    // scratch audio. Prior samples warm the filters before each chunk boundary.
    for (let at = 0; at < source.length; at += 200 * hop) {
      signal.throwIfAborted();
      const frames = Math.min(200 * hop, source.length - at);
      const lead = Math.min(at, rate);
      const offline = new OfflineAudioContext(4, lead + frames, rate);
      const input = offline.createBufferSource(); input.buffer = source;
      const output = connectPreset(offline, input, source.numberOfChannels, preset, balance);
      const raw = offline.createChannelSplitter(2), weighted = offline.createChannelSplitter(2);
      const channels = offline.createChannelMerger(4);
      output.connect(raw); connectLoudnessWeighting(offline, output).connect(weighted);
      for (const ch of [0, 1]) { raw.connect(channels, ch, ch); weighted.connect(channels, ch, ch + 2); }
      channels.connect(offline.destination); input.start(0, (at - lead) / rate);
      const result = await offline.startRendering();
      signal.throwIfAborted();
      const [l,r,kl,kr] = [0,1,2,3].map(ch => result.getChannelData(ch));
      for (let start = lead; start < result.length; start += hop) {
        let sum = 0;
        const end = Math.min(start + hop, result.length);
        for (let i = start; i < end; i++) {
          peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
          sum += kl[i] * kl[i] + kr[i] * kr[i];
        }
        shortPower += sum;
        if (end - start === hop) {
          energies.push(sum / hop);
          const n = energies.length;
          if (n >= 4) windows.push((energies[n-1] + energies[n-2] + energies[n-3] + energies[n-4]) / 4);
        }
      }
    }
    if (!Number.isFinite(peak)) throw Error("This EQ produced invalid audio.");
    return { loudness: integratedLoudness(windows.length ? windows : [shortPower / source.length]), peak };
  }
  const a = await measure(presets[0]);
  return [a, presets[0] === presets[1] ? a : await measure(presets[1])] as [Measured, Measured];
}
