import { type PeqFilter } from "./autoeq";
import { replaceEqStage, safeGain, type EqStage } from "./eq-playback";

export const EAR_ADJUSTMENT_LIMIT = 8;
export const EAR_LOW_HZ = 40;
export const EAR_HIGH_HZ = 16000;
export const EAR_SWEEP_SECONDS = 12;
export type EarSignal = "sine" | "harmonics" | "pink" | "music";
type GeneratedSignal = Exclude<EarSignal, "music">;
export type EarSweep = { from: number; to: number };
type GeneratedVoice = {
  source: OscillatorNode | AudioBufferSourceNode;
  level: GainNode;
  tone?: OscillatorNode;
};
const SOURCE_FADE_SECONDS = .035;

export function sweepFrequency({ from, to }: EarSweep, progress: number) {
  return from * (to / from) ** Math.min(1, Math.max(0, progress));
}

export function pinkNoise(context: AudioContext, seconds = 4) {
  const buffer = context.createBuffer(1, Math.round(context.sampleRate * seconds), context.sampleRate);
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
  private readonly mediaLevel = this.context.createGain();
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
  private harmonics: PeriodicWave | undefined;
  private readonly voices = new Set<GeneratedVoice>();
  private voice: GeneratedVoice | undefined;
  private scan: (EarSweep & { at: number }) | undefined;
  private mediaActive = false;
  private request = 0;
  private frequency = EAR_LOW_HZ;

  constructor(private readonly media: HTMLAudioElement, private readonly stopped: () => void) {
    const context = this.context;
    this.gate.gain.value = 0;
    this.mediaLevel.gain.value = 0;
    context.createMediaElementSource(media).connect(this.mediaLevel).connect(this.gate);
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
    this.media.addEventListener("ended", this.onMediaEnded);
    context.addEventListener("statechange", this.onState);
  }

  private onState = () => {
    if (this.context.state !== "running" && this.context.state !== "closed") this.finish();
  };

  private finish = () => {
    this.stop();
    this.stopped();
  };

  private onMediaEnded = () => {
    if (this.mediaActive) this.finish();
  };

  configure({ base, preamp, adjustments, bypass, focus }: {
    base: PeqFilter[]; preamp: number; adjustments: PeqFilter[]; bypass: boolean; focus: boolean;
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
    this.focused.gain.setTargetAtTime(focus ? 1 : 0, now, .015);
    this.full.gain.setTargetAtTime(focus ? 0 : 1, now, .015);
  }

  setFrequency(hz: number) {
    const now = this.context.currentTime;
    const frequency = Math.min(hz, this.context.sampleRate * .45);
    this.frequency = frequency;
    this.focusFilter.frequency.setTargetAtTime(frequency, now, .008);
    const tone = this.voice?.tone;
    if (tone && !this.scan) {
      tone.frequency.cancelScheduledValues(now);
      tone.frequency.setTargetAtTime(frequency, now, .008);
    }
  }

  volume(value: number) {
    safeGain(this.gate, .65 * value, this.context.currentTime, false);
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

  switchGenerated(signal: GeneratedSignal, hz: number, sweep?: EarSweep) {
    if (!this.voice || this.context.state !== "running") return false;
    this.startGenerated(signal, hz, sweep);
    return true;
  }

  private startGenerated(signal: GeneratedSignal, hz: number, sweep?: EarSweep) {
    const context = this.context;
    let tone: OscillatorNode | undefined;
    let source: GeneratedVoice["source"];
    if (signal === "pink") {
      const noise = context.createBufferSource();
      noise.buffer = this.noise ??= pinkNoise(context);
      noise.loop = true;
      source = noise;
    } else {
      tone = context.createOscillator();
      if (signal === "harmonics") {
        this.harmonics ??= context.createPeriodicWave(new Float32Array(6), Float32Array.of(0, 1, .35, .23, .12, .08));
        tone.setPeriodicWave(this.harmonics);
      }
      source = tone;
    }

    const now = context.currentTime;
    const fadeEnd = now + SOURCE_FADE_SECONDS;
    const top = context.sampleRate * .45;
    const range = tone && sweep ? { from: Math.min(sweep.from, top), to: Math.min(sweep.to, top), at: now } : undefined;
    tone?.frequency.setValueAtTime(Math.min(range?.from ?? hz, top), now);
    const level = context.createGain();
    const amplitude = tone ? .16 : 1;
    level.gain.setValueAtTime(0, now);
    level.gain.linearRampToValueAtTime(amplitude, fadeEnd);
    if (range && tone) {
      const end = now + EAR_SWEEP_SECONDS;
      tone.frequency.exponentialRampToValueAtTime(range.to, end);
      level.gain.setValueAtTime(amplitude, end - .05);
      level.gain.linearRampToValueAtTime(0, end);
    }

    const voice = { source, level, tone };
    source.connect(level).connect(this.gate);
    source.onended = () => {
      this.disposeVoice(voice);
      if (this.voice === voice) this.finish();
    };
    source.start(now);
    if (range) source.stop(now + EAR_SWEEP_SECONDS);
    this.voice = voice;
    this.scan = range;
    this.voices.add(voice);
    // Fade any voices still audible, including a previous crossfade interrupted
    // by another selection. The listening level stays on the common gate.
    for (const previous of this.voices) {
      if (previous === voice) continue;
      const gain = previous.level.gain;
      if (typeof gain.cancelAndHoldAtTime === "function") {
        gain.cancelAndHoldAtTime(now);
      } else {
        const value = gain.value;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(value, now);
      }
      gain.linearRampToValueAtTime(0, fadeEnd);
      previous.source.stop(fadeEnd);
    }
  }

  private disposeVoice(voice: GeneratedVoice) {
    this.voices.delete(voice);
    voice.source.disconnect();
    voice.level.disconnect();
  }

  async play(signal: EarSignal, volume: () => number, sweep?: EarSweep) {
    if (signal !== "music" && this.switchGenerated(signal, this.frequency, sweep)) return true;
    this.stop();
    const token = this.request;
    try {
      const resume = this.context.resume();
      if (signal === "music") {
        await Promise.all([resume, this.media.play()]);
        if (token !== this.request) return false;
        if (this.media.ended) {
          this.stop();
          return false;
        }
        this.mediaActive = true;
        this.mediaLevel.gain.setValueAtTime(1, this.context.currentTime);
        this.volume(volume());
        return true;
      }
      await resume;
      if (token !== this.request) return false;
      // AudioContext can resume after the user has already moved the playhead.
      this.startGenerated(signal, this.frequency, sweep);
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
    const now = this.context.currentTime;
    safeGain(this.gate, 0, now);
    this.mediaLevel.gain.setValueAtTime(0, now);
    this.mediaActive = false;
    this.media.pause();
    this.voice = undefined;
    for (const voice of this.voices) {
      voice.source.onended = null;
      voice.source.stop();
      this.disposeVoice(voice);
    }
    this.scan = undefined;
  }

  close() {
    this.stop();
    this.media.removeEventListener("ended", this.onMediaEnded);
    this.context.removeEventListener("statechange", this.onState);
    this.stage?.dispose();
    if (this.context.state !== "closed") void this.context.close();
  }
}
