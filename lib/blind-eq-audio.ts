import { comparisonGains, eqCoefficients, type EqPreset } from "./blind-eq";

export type PreparedComparison = { buffers: [AudioBuffer, AudioBuffer]; seconds: number };

function stats(buffer: AudioBuffer) {
  let power = 0, peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    for (const value of buffer.getChannelData(channel)) { power += value * value; peak = Math.max(peak, Math.abs(value)); }
  }
  return { rms: Math.sqrt(power / (buffer.length * buffer.numberOfChannels)), peak };
}

export async function prepareComparison(source: AudioBuffer, presets: [EqPreset, EqPreset], start: number, seconds: number, match: boolean): Promise<PreparedComparison> {
  if (source.numberOfChannels > 2) throw Error("Use a mono or stereo recording for this comparison.");
  if (!Number.isFinite(start) || start < 0 || !Number.isFinite(seconds) || seconds < 5 || start + seconds > source.duration + .001) throw Error("Choose a passage of at least five seconds inside the recording.");
  // Include half a second of prior audio so IIR filters settle before the passage.
  const lead = Math.min(start, .5), rate = source.sampleRate;
  const frames = Math.floor(seconds * rate), warmup = Math.floor(lead * rate);
  const buffers: AudioBuffer[] = [];
  // Render sequentially to keep memory bounded on narrow/mobile devices.
  for (const preset of presets) {
    const offline = new OfflineAudioContext(2, frames + warmup, rate);
    const input = offline.createBufferSource(); input.buffer = source;
    const splitter = offline.createChannelSplitter(2), merger = offline.createChannelMerger(2);
    input.connect(splitter);
    for (let channel = 0; channel < 2; channel++) {
      const gain = offline.createGain(); gain.gain.value = 10 ** (preset.channels[channel].preampDb / 20);
      // Duplicate mono into both headphone channels; never lose the Right preset.
      splitter.connect(gain, source.numberOfChannels === 1 ? 0 : channel);
      let previous: AudioNode = gain;
      for (const filter of preset.channels[channel].filters) {
        const { feedforward, feedback } = eqCoefficients(filter, rate);
        const node = offline.createIIRFilter(feedforward, feedback); previous.connect(node); previous = node;
      }
      previous.connect(merger, 0, channel);
    }
    merger.connect(offline.destination); input.start(0, start - lead, seconds + lead);
    const rendered = await offline.startRendering(), trimmed = new AudioBuffer({ numberOfChannels: 2, length: frames, sampleRate: rate });
    for (let channel = 0; channel < 2; channel++) trimmed.copyToChannel(rendered.getChannelData(channel).subarray(warmup, warmup + frames), channel);
    buffers.push(trimmed);
  }
  const gains = comparisonGains([stats(buffers[0]), stats(buffers[1])], match);
  buffers.forEach((buffer, index) => {
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel);
      for (let i = 0; i < samples.length; i++) samples[i] *= gains[index];
    }
  });
  return { buffers: buffers as [AudioBuffer, AudioBuffer], seconds: frames / rate };
}

/** Both branches run at the same playhead. Switching changes only their gains. */
export class BlindEqPlayer {
  readonly context = new AudioContext();
  private sources: AudioBufferSourceNode[] = [];
  private branches: GainNode[] = [];
  private master = this.context.createGain();
  private began = 0;
  private offset = 0;
  private length = 1;
  private side: 0 | 1 = 0;
  private running = false;
  constructor() { this.master.gain.value = .25; this.master.connect(this.context.destination); }
  get playing() { return this.running && this.context.state === "running"; }
  get time() { return this.running ? (this.offset + this.context.currentTime - this.began) % this.length : this.offset; }
  get elapsed() { return this.context.currentTime; }
  setVolume(value: number) { this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), this.context.currentTime, .015); }
  async resume() { await this.context.resume(); }
  play(prepared: PreparedComparison, side: 0 | 1) {
    this.pause(); this.length = prepared.seconds; this.side = side;
    const when = this.context.currentTime + .02; this.began = when;
    this.sources = prepared.buffers.map((buffer, index) => {
      const source = this.context.createBufferSource(), gain = this.context.createGain();
      source.buffer = buffer; source.loop = true;
      gain.gain.value = index === side ? 1 : 0;
      source.connect(gain); gain.connect(this.master); source.start(when, this.offset % this.length);
      this.branches.push(gain); return source;
    });
    this.running = true;
  }
  switch(side: 0 | 1) {
    this.side = side;
    this.branches.forEach((gain, index) => {
      const now = this.context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(index === side ? 1 : 0, now, .01);
    });
  }
  pause() {
    if (this.running) this.offset = Math.max(0, this.time);
    for (const source of this.sources) { source.stop(); source.disconnect(); }
    for (const gain of this.branches) gain.disconnect();
    this.sources = []; this.branches = []; this.running = false;
  }
  restart() { this.pause(); this.offset = 0; }
  async close() { this.pause(); if (this.context.state !== "closed") await this.context.close(); }
}
