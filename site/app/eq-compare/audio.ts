import { BlindEqPlayer, EQ_COMPARISON_PLAY_EVENT } from "@/lib/blind-eq-audio";
import { validateEqSampleRate, type EqPreset } from "@/lib/blind-eq";
import type { ChannelMatch } from "@/lib/channel-balance";
import type { TrackAnalysis } from "@/lib/loudness";

import { comparisonLevels, measureComparison, type LoudnessTarget } from "./levels";

export type Side = 0 | 1;
export type Song = { title: string; artist: string; duration: number; url?: string; file?: File };
export const original: EqPreset = { name: "Original sound", channels: [{ preampDb: 0, filters: [] }, { preampDb: 0, filters: [] }] };

async function decode(song: Song, context: AudioContext, signal: AbortSignal) {
  const limit = 100_000_000;
  let bytes: ArrayBuffer;
  if (song.file) {
    if (song.file.size > limit) throw Error("Choose an audio file under 100 MB.");
    bytes = await song.file.arrayBuffer();
  } else {
    const response = await fetch(song.url!, { signal });
    if (!response.ok) throw Error("This song is unavailable here. Choose another song or open an audio file.");
    if (Number(response.headers.get("content-length")) > limit) throw Error("Choose a recording under 100 MB.");
    bytes = await response.arrayBuffer();
  }
  signal.throwIfAborted();
  if (bytes.byteLength > limit) throw Error("Choose a recording under 100 MB.");
  const buffer = await context.decodeAudioData(bytes);
  signal.throwIfAborted();
  if (buffer.numberOfChannels > 2 || buffer.duration > 1200 || buffer.length * buffer.numberOfChannels * 4 > 200_000_000)
    throw Error("Choose a shorter mono or stereo recording.");
  return buffer;
}

// Both decks show the same source peaks. Preserve extremes and mirror mono to R
// just as the headphone playback graph does.
function overview(buffer: AudioBuffer): Pick<TrackAnalysis, "waveform"> {
  const bins = Math.min(2048, buffer.length);
  function channel(index: number) {
    const samples = buffer.getChannelData(Math.min(index, buffer.numberOfChannels - 1));
    const min = new Float32Array(bins), max = new Float32Array(bins);
    for (let bin = 0; bin < bins; bin++) {
      const end = Math.floor((bin + 1) * samples.length / bins);
      for (let i = Math.floor(bin * samples.length / bins); i < end; i++) {
        min[bin] = Math.min(min[bin], samples[i]);
        max[bin] = Math.max(max[bin], samples[i]);
      }
    }
    return [min, max];
  }
  const [minL, maxL] = channel(0), [minR, maxR] = buffer.numberOfChannels === 1 ? [minL, maxL] : channel(1);
  return { waveform: { minL, maxL, minR, maxR } };
}

export class ComparisonAudio {
  readonly player = new BlindEqPlayer();
  private source?: Promise<AudioBuffer>;
  private levels?: ReturnType<typeof measureComparison>;
  headroomDb = 0;
  private songRequest = new AbortController();
  private mixRequest = new AbortController();
  private generation = 0;
  private requested: Side | null = null;
  private active: Side | null = null;

  constructor(private song: Song, private onDecode: (seconds: number, peaks: ReturnType<typeof overview>) => void) {}
  load() {
    if (!this.source) {
      const signal = this.songRequest.signal;
      this.source = decode(this.song, this.player.context, signal).then(buffer => {
        signal.throwIfAborted();
        this.onDecode(buffer.duration, overview(buffer));
        return buffer;
      }).catch(error => { this.source = undefined; throw error; });
    }
    return this.source;
  }
  stop() {
    this.generation++;
    this.requested = null;
    this.active = null;
    this.player.pause();
  }
  invalidate() {
    this.stop();
    this.mixRequest.abort();
    this.mixRequest = new AbortController();
    this.levels = undefined;
  }
  async play(side: Side, presets: [EqPreset, EqPreset], match: ChannelMatch | undefined, target: LoudnessTarget) {
    if ((this.player.playing && this.active === side) || this.requested === side) { this.stop(); return; }
    if (this.player.playing) { this.player.switch(side); this.active = side; return; }
    const token = ++this.generation;
    this.requested = side;
    try {
      window.dispatchEvent(new Event(EQ_COMPARISON_PLAY_EVENT));
      const [, buffer] = await Promise.all([this.player.resume(), this.load()]);
      if (token !== this.generation) return;
      validateEqSampleRate(presets, this.player.context.sampleRate);
      if (!this.levels) {
        const signal = this.mixRequest.signal;
        this.levels = measureComparison(buffer, presets, match, signal)
          .catch(error => { if (!signal.aborted) this.levels = undefined; throw error; });
      }
      const measured = await this.levels;
      if (token !== this.generation || document.hidden) return;
      const { gains, headroomDb } = comparisonLevels(measured, target);
      this.headroomDb = headroomDb;
      this.player.playTrack(buffer, presets, gains, side, undefined, match);
      this.active = side;
    } finally { if (token === this.generation) this.requested = null; }
  }
  get side() { return this.player.playing ? this.active : null; }
  get pending() { return this.requested; }
  close() { this.stop(); this.songRequest.abort(); this.mixRequest.abort(); void this.player.close(); }
}
