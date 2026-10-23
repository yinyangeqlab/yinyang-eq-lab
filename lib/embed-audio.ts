// Web Audio engine for the shareable shootout. Built-in test sounds are
// synthesised in the browser (no recordings are streamed), a listener may also
// play a local file, and nothing is uploaded. Every curve has its own
// one-third-octave peaking filter bank running in parallel on the same source,
// so switching A/B is instant, sample-aligned and click-free.

import { BAND_HZ, type EmbedSignal } from "@/lib/embed-shootout";

const BAND_Q = 4.318; // one-third-octave bandwidth
const SWITCH_SECONDS = 0.03;

export type SourceKind = EmbedSignal | "file";

type Chain = { input: GainNode; trim: GainNode; select: GainNode; filters: BiquadFilterNode[] };

function pinkNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate, fade = Math.round(rate * 0.08), length = Math.round(rate * seconds);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel++) {
    const data = new Float32Array(length + fade);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759; b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856; b4 = 0.55 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11; b6 = white * 0.115926;
    }
    // Cross-fade the tail into the head so the loop has no seam.
    for (let i = 0; i < fade; i++) { const t = i / fade; data[i] = data[i] * t + data[length + i] * (1 - t); }
    let sum = 0;
    for (let i = 0; i < length; i++) sum += data[i] * data[i];
    const gain = 0.07 / Math.sqrt(sum / length); // about -23 dBFS RMS
    const out = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) out[i] = data[i] * gain;
  }
  return buffer;
}

const midi = (note: number) => 440 * 2 ** ((note - 69) / 12);

async function renderPad(rate: number): Promise<AudioBuffer> {
  const seconds = 16, offline = new OfflineAudioContext(2, rate * seconds, rate);
  const master = offline.createGain(); master.gain.value = 0.22; master.connect(offline.destination);
  // Am9 – Fmaj7 – Cmaj7 – G6/9, each held four seconds with overlapping swells.
  const chords = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [48, 55, 59, 64, 67], [55, 59, 62, 64, 69]];
  chords.forEach((notes, index) => {
    const start = index * 4;
    notes.forEach((note, voice) => {
      for (const detune of [-7, 7]) {
        const osc = offline.createOscillator(); osc.type = voice % 2 ? "sawtooth" : "triangle"; osc.frequency.value = midi(note); osc.detune.value = detune;
        const low = offline.createBiquadFilter(); low.type = "lowpass"; low.frequency.value = 1500 + voice * 260; low.Q.value = 0.6;
        const env = offline.createGain(), pan = offline.createStereoPanner(); pan.pan.value = (voice - 2) * 0.28;
        env.gain.setValueAtTime(0, start); env.gain.linearRampToValueAtTime(0.5, start + 0.9);
        env.gain.setValueAtTime(0.5, start + 3.2); env.gain.linearRampToValueAtTime(0, Math.min(seconds - 0.05, start + 4.9));
        osc.connect(low).connect(env).connect(pan).connect(master);
        osc.start(start); osc.stop(Math.min(seconds, start + 5));
      }
    });
    const sub = offline.createOscillator(); sub.type = "sine"; sub.frequency.value = midi(notes[0] - 12);
    const subEnv = offline.createGain(); subEnv.gain.setValueAtTime(0, start); subEnv.gain.linearRampToValueAtTime(0.9, start + 0.5); subEnv.gain.setValueAtTime(0.9, start + 3.4); subEnv.gain.linearRampToValueAtTime(0, Math.min(seconds - 0.05, start + 4.4));
    sub.connect(subEnv).connect(master); sub.start(start); sub.stop(Math.min(seconds, start + 4.5));
  });
  return offline.startRendering();
}

async function renderBeat(rate: number): Promise<AudioBuffer> {
  const bpm = 100, beat = 60 / bpm, bars = 4, seconds = bars * 4 * beat, offline = new OfflineAudioContext(2, Math.ceil(rate * seconds), rate);
  const master = offline.createGain(); master.gain.value = 0.55; master.connect(offline.destination);
  const noise = offline.createBuffer(1, rate, rate), nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const hit = (when: number, build: (out: AudioNode, t: number) => void) => build(master, when);
  const kick = (t: number) => hit(t, out => {
    const osc = offline.createOscillator(), env = offline.createGain();
    osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env.gain.setValueAtTime(1, t); env.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(env).connect(out); osc.start(t); osc.stop(t + 0.5);
  });
  const snare = (t: number) => hit(t, out => {
    const src = offline.createBufferSource(); src.buffer = noise;
    const band = offline.createBiquadFilter(); band.type = "bandpass"; band.frequency.value = 1900; band.Q.value = 0.8;
    const env = offline.createGain(); env.gain.setValueAtTime(0.7, t); env.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    src.connect(band).connect(env).connect(out); src.start(t, 0, 0.25);
    const body = offline.createOscillator(), bodyEnv = offline.createGain(); body.frequency.value = 190;
    bodyEnv.gain.setValueAtTime(0.5, t); bodyEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    body.connect(bodyEnv).connect(out); body.start(t); body.stop(t + 0.16);
  });
  const hat = (t: number, level: number) => hit(t, out => {
    const src = offline.createBufferSource(); src.buffer = noise;
    const high = offline.createBiquadFilter(); high.type = "highpass"; high.frequency.value = 7500;
    const env = offline.createGain(); env.gain.setValueAtTime(level, t); env.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(high).connect(env).connect(out); src.start(t, 0.1, 0.08);
  });
  const bass = (t: number, note: number, length: number) => hit(t, out => {
    const osc = offline.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = midi(note);
    const low = offline.createBiquadFilter(); low.type = "lowpass"; low.frequency.value = 420; low.Q.value = 2;
    const env = offline.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(0.5, t + 0.01); env.gain.setValueAtTime(0.5, t + length * 0.7); env.gain.linearRampToValueAtTime(0, t + length);
    osc.connect(low).connect(env).connect(out); osc.start(t); osc.stop(t + length + 0.02);
  });
  const line = [33, 33, 36, 40, 33, 33, 43, 40, 31, 31, 34, 38, 33, 33, 40, 36];
  for (let bar = 0; bar < bars; bar++) {
    const origin = bar * 4 * beat;
    kick(origin); kick(origin + 2 * beat); if (bar % 2) kick(origin + 2.5 * beat);
    snare(origin + beat); snare(origin + 3 * beat);
    for (let eighth = 0; eighth < 8; eighth++) hat(origin + eighth * beat / 2, eighth % 2 ? 0.16 : 0.3);
    for (let step = 0; step < 4; step++) bass(origin + step * beat, line[(bar % 4) * 4 + step], beat * 0.9);
  }
  return offline.startRendering();
}

export class Audition {
  readonly ctx: AudioContext;
  readonly analyser: AnalyserNode;
  private master: GainNode;
  private chains: Chain[] = [];
  private buffers = new Map<SourceKind, AudioBuffer>();
  private source: AudioBufferSourceNode | null = null;
  private current: SourceKind | null = null;
  private selected: number | null = null;
  fileName = "";

  constructor() {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Context();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -4; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.12;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 4096; this.analyser.smoothingTimeConstant = 0.8; this.analyser.minDecibels = -96; this.analyser.maxDecibels = -18;
    this.master.connect(limiter).connect(this.analyser).connect(this.ctx.destination);
  }

  /** One filter bank per curve; trims are the loudness-matching gains in dB. */
  setCurves(bands: readonly (readonly number[])[], trims: readonly number[]) {
    for (const chain of this.chains) { chain.input.disconnect(); chain.select.disconnect(); }
    this.chains = bands.map((gains, index) => {
      const input = this.ctx.createGain(), trim = this.ctx.createGain(), select = this.ctx.createGain();
      trim.gain.value = 10 ** (trims[index] / 20);
      select.gain.value = 0;
      let last: AudioNode = input;
      const filters = BAND_HZ.map((hz, band) => {
        const filter = this.ctx.createBiquadFilter();
        filter.type = "peaking"; filter.frequency.value = hz; filter.Q.value = BAND_Q; filter.gain.value = gains[band];
        last.connect(filter); last = filter;
        return filter;
      });
      last.connect(trim).connect(select).connect(this.master);
      return { input, trim, select, filters };
    });
    if (this.source) this.chains.forEach(chain => this.source!.connect(chain.input));
    this.select(this.selected);
  }

  setVolume(value: number) { this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, value)) ** 1.6, this.ctx.currentTime, 0.03); }

  /** Makes exactly one curve audible (or none), with a short cross-fade. */
  select(index: number | null) {
    this.selected = index;
    const now = this.ctx.currentTime;
    this.chains.forEach((chain, i) => {
      chain.select.gain.cancelScheduledValues(now);
      chain.select.gain.setValueAtTime(chain.select.gain.value, now);
      chain.select.gain.linearRampToValueAtTime(i === index ? 1 : 0, now + SWITCH_SECONDS);
    });
  }

  private async bufferFor(kind: SourceKind): Promise<AudioBuffer> {
    const cached = this.buffers.get(kind);
    if (cached) return cached;
    if (kind === "file") throw new Error("No file loaded.");
    const buffer = kind === "noise" ? pinkNoise(this.ctx, 12) : kind === "pad" ? await renderPad(this.ctx.sampleRate) : await renderBeat(this.ctx.sampleRate);
    this.buffers.set(kind, buffer);
    return buffer;
  }

  /** Builds a sound ahead of time so switching to it is instant. */
  async preload(kind: SourceKind) { if (kind !== "file") await this.bufferFor(kind); }

  /** Switches the sound source. The position restarts, so call between rounds. */
  async useSource(kind: SourceKind) {
    const buffer = await this.bufferFor(kind);
    if (this.source) { try { this.source.stop(); } catch { /* already stopped */ } this.source.disconnect(); }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer; source.loop = true;
    this.chains.forEach(chain => source.connect(chain.input));
    source.start();
    this.source = source; this.current = kind;
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  /** Decodes a local file for playback; it stays in this browser. Throws a readable error. */
  async loadFile(file: File) {
    if (file.size > 80 * 1024 * 1024) throw new Error("That file is larger than 80 MB.");
    let decoded: AudioBuffer;
    try { decoded = await this.ctx.decodeAudioData(await file.arrayBuffer()); }
    catch { throw new Error("This browser could not read that audio file. Try an MP3, WAV, FLAC or M4A."); }
    // Keep up to two minutes; a long file would only use memory.
    const keep = Math.min(decoded.length, Math.round(decoded.sampleRate * 120));
    const trimmed = this.ctx.createBuffer(Math.min(2, decoded.numberOfChannels), keep, decoded.sampleRate);
    for (let c = 0; c < trimmed.numberOfChannels; c++) trimmed.copyToChannel(decoded.getChannelData(c).subarray(0, keep), c);
    // Level-match to the built-in sounds so the volume control stays predictable.
    let sum = 0, count = 0;
    for (let c = 0; c < trimmed.numberOfChannels; c++) { const d = trimmed.getChannelData(c); for (let i = 0; i < d.length; i += 4) { sum += d[i] * d[i]; count++; } }
    const rms = Math.sqrt(sum / Math.max(1, count)) || 1, gain = Math.min(8, 0.07 / rms);
    for (let c = 0; c < trimmed.numberOfChannels; c++) { const d = trimmed.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= gain; }
    this.buffers.set("file", trimmed);
    this.fileName = file.name;
  }
  hasFile() { return this.buffers.has("file"); }
  get currentSource() { return this.current; }

  async resume() { if (this.ctx.state !== "running") await this.ctx.resume(); }
  async pause() { if (this.ctx.state === "running") await this.ctx.suspend(); }

  /** Log-spaced spectrum of the audible output in dB, for drawing. */
  spectrum(points: number, minHz = 25, maxHz = 18000): Float32Array {
    const bins = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(bins);
    const out = new Float32Array(points), nyquist = this.ctx.sampleRate / 2;
    for (let i = 0; i < points; i++) {
      const hz = minHz * (maxHz / minHz) ** (i / (points - 1)), next = minHz * (maxHz / minHz) ** ((i + 1) / (points - 1));
      const lo = Math.max(0, Math.floor(hz / nyquist * bins.length)), hi = Math.min(bins.length - 1, Math.max(lo, Math.ceil(next / nyquist * bins.length)));
      let peak = -140;
      for (let b = lo; b <= hi; b++) if (bins[b] > peak) peak = bins[b];
      out[i] = peak;
    }
    return out;
  }

  dispose() {
    try { this.source?.stop(); } catch { /* already stopped */ }
    void this.ctx.close();
  }
}
