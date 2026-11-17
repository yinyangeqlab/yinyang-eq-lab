import { peqCoefficients, type PeqFilter } from './autoeq';
import { channelBalance, type ChannelMatch } from './channel-balance';
export type EqStage = { input: GainNode; nodes: IIRFilterNode[]; boostDb: number; dispose: () => void };

/** Explicit IIR coefficients retain variable-Q shelves; native shelf nodes ignore Q. */
export function replaceEqStage(context: AudioContext, upstream: AudioNode, output: AudioNode, filters: PeqFilter[], previous?: EqStage, match?: ChannelMatch): EqStage {
  const coefficients = filters.map(filter => peqCoefficients(filter, context.sampleRate));
  const input = context.createGain();
  const nodes = coefficients.map(({ b, a }) => context.createIIRFilter(b, a));
  let end: AudioNode = input;
  for (const node of nodes) { end.connect(node); end = node; }
  const balance = channelBalance(match, context.sampleRate);
  const matchNodes: AudioNode[] = [];
  if (balance) {
    const splitter = context.createChannelSplitter(2), merger = context.createChannelMerger(2);
    end.connect(splitter); matchNodes.push(splitter, merger);
    balance.impulses.forEach((impulse, channel) => {
      const convolver = context.createConvolver(); convolver.normalize = false;
      const buffer = context.createBuffer(1, impulse.length, context.sampleRate);
      buffer.copyToChannel(Float32Array.from(impulse, value => value * 10 ** (-Math.max(0, balance.maxBoostDb) / 20)), 0); convolver.buffer = buffer;
      splitter.connect(convolver, channel); convolver.connect(merger, 0, channel); matchNodes.push(convolver);
    });
    end = merger;
  }
  end.connect(output);
  let disposed = false;
  const stage = { input, nodes, boostDb: Math.max(0, balance?.maxBoostDb ?? 0), dispose: () => { if (disposed) return; disposed = true; try { upstream.disconnect(input); } catch {} input.disconnect(); nodes.forEach(node => node.disconnect()); matchNodes.forEach(node => node.disconnect()); } };
  input.gain.value = previous ? 0 : 1;
  upstream.connect(input);
  if (previous) {
    const now = context.currentTime;
    input.gain.linearRampToValueAtTime(1, now + .03);
    previous.input.gain.cancelScheduledValues(now);
    previous.input.gain.setValueAtTime(previous.input.gain.value, now);
    previous.input.gain.linearRampToValueAtTime(0, now + .03);
    setTimeout(previous.dispose, 40);
  }
  return stage;
}

export function safeGain(node: GainNode, value: number, time: number, immediateDecrease = true) {
  node.gain.cancelScheduledValues(time);
  if (!immediateDecrease && value < node.gain.value) {
    node.gain.setValueAtTime(node.gain.value, time);
    node.gain.linearRampToValueAtTime(value, time + .005);
  } else {
    node.gain.setValueAtTime(Math.min(node.gain.value, value), time);
    node.gain.setTargetAtTime(value, time, .03);
  }
}

/** Safari/iOS may interrupt the context while the media clock keeps advancing. */
export function watchAudioInterruptions(context: AudioContext, audio: () => HTMLMediaElement | null, onInterrupted: () => void, onRunning?: () => void) {
  const changed = () => {
    if (context.state === 'running') { if (audio()) onRunning?.(); return; }
    if (context.state === 'closed') return;
    const current = audio();
    if (!current || current.paused) return;
    current.pause(); onInterrupted();
  };
  context.addEventListener('statechange', changed);
  return () => context.removeEventListener('statechange', changed);
}
