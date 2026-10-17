type Waveform = { minL: Float32Array; maxL: Float32Array; minR: Float32Array; maxR: Float32Array };

/** Difference between the 90th and 10th percentile of waveform-bin peaks, in dB. */
export function estimateWaveformSpread(waves: Waveform): number {
  const peaks: number[] = [];
  const step = Math.max(1, Math.floor(waves.minL.length / 2048));
  for (let i = 0; i < waves.minL.length; i += step) {
    const peak = Math.max(Math.abs(waves.minL[i]), Math.abs(waves.maxL[i]), Math.abs(waves.minR[i]), Math.abs(waves.maxR[i]));
    if (peak > .001) peaks.push(peak);
  }
  if (peaks.length < 20) return 0;
  peaks.sort((a, b) => a - b);
  return 20 * Math.log10(peaks[Math.floor((peaks.length - 1) * .9)] / peaks[Math.floor((peaks.length - 1) * .1)]);
}

/** A peak-envelope preview. The worklet uses individual samples, so this is intentionally an estimate. */
export function previewDynamics(source: Waveform, amount: number, duration: number): Waveform {
  if (Math.abs(amount) < .0001 || !duration) return source;
  const count = source.minL.length;
  const output: Waveform = { minL: new Float32Array(count), maxL: new Float32Array(count), minR: new Float32Array(count), maxR: new Float32Array(count) };
  const secondsPerBin = duration / count;
  const attack = Math.exp(-secondsPerBin / .008), release = Math.exp(-secondsPerBin / .18);
  const smoothing = 1 - Math.exp(-secondsPerBin / .025);
  const expanderAttack = Math.exp(-secondsPerBin / .1), expanderRelease = Math.exp(-secondsPerBin / 1.2);
  const expanderSmoothing = 1 - Math.exp(-secondsPerBin / .25);
  let envelope = 0, expanderEnvelope = 0, gain = 1;
  for (let i = 0; i < count; i++) {
    const peak = Math.max(Math.abs(source.minL[i]), Math.abs(source.maxL[i]), Math.abs(source.minR[i]), Math.abs(source.maxR[i]));
    envelope = peak + (envelope - peak) * (peak > envelope ? attack : release);
    expanderEnvelope = peak + (expanderEnvelope - peak) * (peak > expanderEnvelope ? expanderAttack : expanderRelease);
    const levelDb = 20 * Math.log10(Math.max(envelope, 1e-5));
    let gainDb = 0;
    if (amount < 0) {
      const depth = -amount, threshold = -14 - 6 * depth, ratio = 1 + 4 * depth, knee = 8;
      const over = levelDb - threshold;
      if (over >= knee / 2) gainDb = -over * (1 - 1 / ratio);
      else if (over > -knee / 2) gainDb = -(1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee);
      gainDb += 20 * depth;
    } else {
      const threshold = -20 + 12 * amount;
      const expanderLevelDb = 20 * Math.log10(Math.max(expanderEnvelope, 1e-5));
      if (expanderLevelDb < threshold) gainDb = Math.max(-18, (expanderLevelDb - threshold) * (2 * amount));
    }
    gain += (10 ** (gainDb / 20) - gain) * (amount > 0 ? expanderSmoothing : smoothing);
    const factor = Math.min(gain, peak > 0 ? .98 / peak : gain);
    output.minL[i] = source.minL[i] * factor; output.maxL[i] = source.maxL[i] * factor;
    output.minR[i] = source.minR[i] * factor; output.maxR[i] = source.maxR[i] * factor;
  }
  return output;
}
