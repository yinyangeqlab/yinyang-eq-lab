import { type PeqFilter } from "./autoeq";
import { replaceEqStage, safeGain, type EqStage } from "./eq-playback";

export const EAR_ADJUSTMENT_LIMIT = 8;
export const EAR_LOW_HZ = 40;
export const EAR_HIGH_HZ = 16000;
export const EAR_SWEEP_SECONDS = 12;
export type EarSignal = "sine" | "harmonics" | "pink" | "music";
export type EarSweep = { from: number; to: number };

export function sweepFrequency({ from, to }: EarSweep, progress: number) {
  return from * (to / from) ** Math.min(1, Math.max(0, progress));
}

function pinkNoise(context: AudioContext) {
  const seconds = 4;
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const samples = buffer.getChannelData(0);
  const bands = new Float64Array(16);
  let sum = 0, peak = 0;
  for (let i = 1; i < samples.length; i++) {
    // Update one slower random stream per sample, plus a fresh white component.
    const band = 31 - Math.clz32(i & -i);
    if (band < bands.length) {
      const next = 2 * Math.random() - 1;
      sum += next - bands[band];
      bands[band] = next;
    }
    const fade = Math.min(1, i / (context.sampleRate * .01), (samples.length - i - 1) / (context.sampleRate * .01));
    const sample = (sum + 2 * Math.random() - 1) * fade;
    samples[i] = sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  for (let i = 0; i < samples.length; i++) samples[i] *= .30 / Math.max(1, peak);
  return buffer;
}

export class EarTuningAudio {
  readonly context = new AudioContext();
  private readonly gate = this.context.createGain();
  private readonly headroom = this.context.createGain();
  private readonly adjustmentInput = this.context.createGain();
  private readonly adjustments: BiquadFilterNode[] = [];
  private readonly focusFilter = this.context.createBiquadFilter();
  private readonly focused = this.context.createGain();
  private readonly full = this.context.createGain();
  private readonly output = this.context.createAnalyser();
  private readonly samples = new Float32Array(1024);
  private stage: EqStage | undefined;
  private appliedBase: PeqFilter[] | undefined;
  private noise: AudioBuffer | undefined;
  private signalNode: OscillatorNode | AudioBufferSourceNode | null = null;
  private tone: OscillatorNode | null = null;
  private toneLevel: GainNode | null = null;
  private scan: (EarSweep & { at: number }) | undefined;
  private request = 0;

  constructor(private readonly media: HTMLAudioElement, private readonly stopped: () => void) {
    const context = this.context;
    this.gate.gain.value = 0;
    context.createMediaElementSource(media).connect(this.gate);
    this.gate.connect(this.headroom);
    this.focusFilter.type = "bandpass";
    this.focusFilter.Q.value = 1.4;
    this.focused.gain.value = 0;
    let end: AudioNode = this.adjustmentInput;
    for (let i = 0; i < EAR_ADJUSTMENT_LIMIT; i++) {
      const filter = context.createBiquadFilter();
      filter.type = "peaking";
      end.connect(filter);
      end = filter;
      this.adjustments.push(filter);
    }
    this.output.fftSize = this.samples.length;
    end.connect(this.full).connect(this.output);
    end.connect(this.focusFilter).connect(this.focused).connect(this.output);
    this.output.connect(context.destination);
    this.media.addEventListener("ended", this.finish);
    context.addEventListener("statechange", this.onState);
  }

  private onState = () => {
    if (this.context.state !== "running" && this.context.state !== "closed") this.finish();
  };

  private finish = () => {
    this.stop();
    this.stopped();
  };

  configure({ base, preamp, adjustments, bypass, focus, hz }: {
    base: PeqFilter[]; preamp: number; adjustments: PeqFilter[]; bypass: boolean; focus: boolean; hz: number;
  }) {
    const now = this.context.currentTime;
    const limit = (frequency: number) => Math.min(frequency, this.context.sampleRate * .45);
    if (base !== this.appliedBase) {
      this.stage = replaceEqStage(this.context, this.headroom, this.adjustmentInput, base.map(filter => ({ ...filter, hz: Math.min(filter.hz, this.context.sampleRate * .49) })), this.stage);
      this.appliedBase = base;
    }
    // Each peaking band's boost is bounded by its gain at the center. Reserve
    // their sum on both sides before moving any filter or switching A/B.
    const boostBudget = adjustments.reduce((sum, filter) => sum + Math.max(0, filter.gain), 0);
    safeGain(this.headroom, 10 ** ((Math.min(0, preamp) - boostBudget) / 20), now);
    this.adjustments.forEach((node, index) => {
      const filter = adjustments[index];
      if (filter) {
        node.frequency.setTargetAtTime(limit(filter.hz), now, .012);
        node.Q.setTargetAtTime(filter.q, now, .012);
      }
      node.gain.setTargetAtTime(bypass ? 0 : filter?.gain ?? 0, now, .012);
    });
    this.focusFilter.frequency.setTargetAtTime(limit(hz), now, .015);
    this.focused.gain.setTargetAtTime(focus ? 1 : 0, now, .015);
    this.full.gain.setTargetAtTime(focus ? 0 : 1, now, .015);
    if (!this.scan) this.tone?.frequency.setTargetAtTime(limit(hz), now, .015);
  }

  volume(value: number) {
    safeGain(this.gate, .65 * value, this.context.currentTime);
  }

  get outputPeak() {
    this.output.getFloatTimeDomainData(this.samples);
    let peak = 0;
    for (const sample of this.samples) peak = Math.max(peak, Math.abs(sample));
    return peak;
  }

  get sweepPosition() {
    return this.scan ? sweepFrequency(this.scan, (this.context.currentTime - this.scan.at) / EAR_SWEEP_SECONDS) : null;
  }

  async play(signal: EarSignal, hz: number, volume: () => number, sweep?: EarSweep) {
    this.stop();
    const token = this.request;
    const resume = this.context.resume();
    try {
      if (signal === "music") {
        await Promise.all([resume, this.media.play()]);
        if (token !== this.request) return false;
        this.volume(volume());
        return true;
      }
      await resume;
      if (token !== this.request) return false;
      const at = this.context.currentTime + .02;
      if (signal === "pink") {
        const source = this.context.createBufferSource();
        source.buffer = this.noise ??= pinkNoise(this.context);
        source.loop = true;
        source.connect(this.gate);
        source.start(at);
        this.signalNode = source;
      } else {
        const source = this.context.createOscillator();
        const toneLevel = this.context.createGain();
        this.toneLevel = toneLevel;
        toneLevel.gain.value = .16;
        source.connect(toneLevel).connect(this.gate);
        if (signal === "harmonics") {
          // A compact harmonic spectrum gives a second way to listen to the same center.
          source.setPeriodicWave(this.context.createPeriodicWave(new Float32Array(6), Float32Array.of(0, 1, .35, .23, .12, .08)));
        }
        const top = this.context.sampleRate * .45;
        source.frequency.setValueAtTime(Math.min(sweep?.from ?? hz, top), at);
        if (sweep) {
          const range = { from: Math.min(sweep.from, top), to: Math.min(sweep.to, top) };
          this.scan = { ...range, at };
          source.frequency.exponentialRampToValueAtTime(range.to, at + EAR_SWEEP_SECONDS);
          source.onended = this.finish;
        }
        source.start(at);
        if (sweep) {
          toneLevel.gain.setValueAtTime(.16, at + EAR_SWEEP_SECONDS - .05);
          toneLevel.gain.linearRampToValueAtTime(0, at + EAR_SWEEP_SECONDS);
          source.stop(at + EAR_SWEEP_SECONDS);
        }
        this.tone = source;
        this.signalNode = source;
      }
      this.volume(volume());
      return true;
    } catch (error) {
      if (token !== this.request) return false;
      this.stop();
      throw error;
    }
  }

  stop() {
    this.request++;
    this.volume(0);
    this.media.pause();
    if (this.signalNode) {
      this.signalNode.onended = null;
      this.signalNode.stop();
      this.signalNode.disconnect();
    }
    this.toneLevel?.disconnect();
    this.toneLevel = null;
    this.signalNode = null;
    this.tone = null;
    this.scan = undefined;
  }

  close() {
    this.stop();
    this.media.removeEventListener("ended", this.finish);
    this.context.removeEventListener("statechange", this.onState);
    this.stage?.dispose();
    if (this.context.state !== "closed") void this.context.close();
  }
}
