import { comparisonGains, eqCoefficients, type EqPreset } from "./blind-eq";
import { channelBalance, type ChannelMatch } from "./channel-balance";

export type PreparedComparison = { buffers: [AudioBuffer, AudioBuffer]; seconds: number; gains?: [number, number] };

function stats(buffer: AudioBuffer) {
  let power = 0, peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    for (const value of buffer.getChannelData(channel)) { power += value * value; peak = Math.max(peak, Math.abs(value)); }
  }
  return { rms: Math.sqrt(power / (buffer.length * buffer.numberOfChannels)), peak };
}

function connectPreset(context: BaseAudioContext, input: AudioNode, channels: number, preset: EqPreset, balance: ReturnType<typeof channelBalance>) {
  const splitter = context.createChannelSplitter(2), merger = context.createChannelMerger(2);
  input.connect(splitter);
  for (let channel = 0; channel < 2; channel++) {
    const gain = context.createGain(); gain.gain.value = 10 ** (preset.channels[channel].preampDb / 20);
    // Duplicate mono into both headphone channels; never lose the Right preset.
    splitter.connect(gain, channels === 1 ? 0 : channel);
    let previous: AudioNode = gain;
    for (const filter of preset.channels[channel].filters) {
      const { feedforward, feedback } = eqCoefficients(filter, context.sampleRate);
      const node = context.createIIRFilter(feedforward, feedback); previous.connect(node); previous = node;
    }
    if (balance) {
      const convolver = context.createConvolver(); convolver.normalize = false;
      const impulse = context.createBuffer(1, balance.impulses[channel].length, context.sampleRate);
      impulse.copyToChannel(Float32Array.from(balance.impulses[channel], value => value * 10 ** (-Math.max(0, balance.maxBoostDb) / 20)), 0);
      convolver.buffer = impulse; previous.connect(convolver); previous = convolver;
    }
    previous.connect(merger, 0, channel);
  }
  return merger;
}

export async function prepareComparison(source: AudioBuffer, presets: [EqPreset, EqPreset], start: number, seconds: number, match: boolean, signal?: AbortSignal, sharedMatch?: ChannelMatch, freeListening = false): Promise<PreparedComparison> {
  const checkActive = () => { if (signal?.aborted) throw Error("Comparison preparation was cancelled."); };
  checkActive();
  if (source.numberOfChannels > 2) throw Error("Use a mono or stereo recording for this comparison.");
  if (!Number.isFinite(start) || start < 0 || !Number.isFinite(seconds) || seconds < (freeListening ? 1 / source.sampleRate : 5) || start + seconds > source.duration + .001) throw Error("Choose a section inside the recording.");
  // Include half a second of prior audio so IIR filters settle before the passage.
  const lead = Math.min(start, .5), rate = source.sampleRate;
  const frames = Math.floor(seconds * rate), warmup = Math.floor(lead * rate);
  const balance = sharedMatch ? channelBalance(sharedMatch, rate) : null;
  const buffers: AudioBuffer[] = [];
  // Render sequentially to keep memory bounded on narrow/mobile devices.
  for (const preset of presets) {
    checkActive();
    const offline = new OfflineAudioContext(2, frames + warmup, rate);
    const input = offline.createBufferSource(); input.buffer = source;
    connectPreset(offline, input, source.numberOfChannels, preset, balance).connect(offline.destination);
    input.start(0, start - lead, seconds + lead);
    const rendered = await offline.startRendering(); checkActive();
    const trimmed = new AudioBuffer({ numberOfChannels: 2, length: frames, sampleRate: rate });
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
  return { buffers: buffers as [AudioBuffer, AudioBuffer], seconds: frames / rate, gains };
}

/** Both branches run at the same playhead. Switching changes only their gains. */
export class BlindEqPlayer {
  readonly context: AudioContext;
  private sources: AudioBufferSourceNode[] = [];
  private branches: GainNode[] = [];
  private master: GainNode;
  private ownsContext: boolean;
  private began = 0;
  private offset = 0;
  private length = 1;
  private side: 0 | 1 = 0;
  private running = false;
  private trackPlayback = false;
  private loopRange?: { start: number; end: number };
  constructor(context?: AudioContext) { this.context = context ?? new AudioContext(); this.ownsContext = !context; this.master = this.context.createGain(); this.master.gain.value = .25; this.master.connect(this.context.destination); }
  get playing() { return this.running && this.context.state === "running"; }
  get time() {
    if (!this.running) return this.offset;
    const time = this.offset + Math.max(0, this.context.currentTime - this.began);
    if (!this.trackPlayback) return time % this.length;
    const loop = this.loopRange;
    return loop && time >= loop.end
      ? loop.start + (time - loop.start) % (loop.end - loop.start)
      : Math.min(time, this.length);
  }
  get elapsed() { return this.context.currentTime; }
  setVolume(value: number) { this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), this.context.currentTime, .015); }
  async resume() { await this.context.resume(); }
  play(prepared: PreparedComparison, side: 0 | 1) {
    this.pause(); this.trackPlayback = false; this.length = prepared.seconds; this.side = side;
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
  playTrack(source: AudioBuffer, presets: [EqPreset, EqPreset], gains: [number, number], side: 0 | 1, loop?: { start: number; end: number }, sharedMatch?: ChannelMatch) {
    this.pause();
    this.trackPlayback = true;
    this.length = source.duration;
    this.loopRange = loop;
    const input = this.context.createBufferSource();
    input.buffer = source;
    if (loop) {
      input.loop = true;
      input.loopStart = loop.start;
      input.loopEnd = loop.end;
      if (this.offset < loop.start || this.offset >= loop.end) this.offset = loop.start;
    } else if (this.offset >= this.length) this.offset = 0;
    const balance = sharedMatch ? channelBalance(sharedMatch, this.context.sampleRate) : null;
    this.branches = presets.map((preset, index) => {
      const level = this.context.createGain();
      level.gain.value = gains[index];
      connectPreset(this.context, input, source.numberOfChannels, preset, balance).connect(level);
      const gate = this.context.createGain();
      gate.gain.value = index === side ? 1 : 0;
      level.connect(gate);
      gate.connect(this.master);
      return gate;
    });
    this.sources = [input];
    this.began = this.context.currentTime + .02;
    this.running = true;
    input.onended = () => {
      if (this.sources[0] !== input) return;
      this.pause();
      this.offset = this.length;
    };
    input.start(this.began, this.offset);
  }
  seek(seconds: number) {
    this.pause();
    this.offset = Math.max(0, seconds);
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
    for (const source of this.sources) { source.onended = null; source.stop(); source.disconnect(); }
    for (const gain of this.branches) gain.disconnect();
    this.sources = []; this.branches = []; this.running = false;
  }
  restart() { this.pause(); this.offset = 0; }
  async close() { this.pause(); this.master.disconnect(); if (this.ownsContext && this.context.state !== "closed") await this.context.close(); }
}
