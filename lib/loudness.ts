/** Local source-file analysis. Values other than the waveform are estimates, not certified mastering measurements. */
export type TrackAnalysis = {
  waveform: { minL: Float32Array; maxL: Float32Array; minR: Float32Array; maxR: Float32Array };
  samplePeakDbfs: number;
  rmsDbfs: number;
  crestDb: number;
  stereoCorrelation: number;
  sideMidDb: number;
  channelBalanceDb: number;
  loudnessSpreadDb: number | null;
  clippedSamples: number;
  integratedLufs: number;
};

const db = (amplitude: number) => amplitude > 0 ? 20 * Math.log10(amplitude) : -Infinity;
const percentile = (sorted: number[], fraction: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];

export async function analyzeTrack(file: Blob): Promise<TrackAnalysis> {
  const decoder = new AudioContext();
  try {
    const decoded = await decoder.decodeAudioData(await file.arrayBuffer());
    if (decoded.numberOfChannels !== 2) throw new Error("Stereo audio required.");
    const left = decoded.getChannelData(0), right = decoded.getChannelData(1);
    const count = Math.min(32768, decoded.length);
    const minL = new Float32Array(count), maxL = new Float32Array(count);
    const minR = new Float32Array(count), maxR = new Float32Array(count);
    const bucketSize = Math.max(1, Math.round(decoded.sampleRate / 10));
    const energyBuckets = new Float64Array(Math.ceil(decoded.length / bucketSize));
    let sumL = 0, sumR = 0, sumLR = 0, sumMid = 0, sumSide = 0, peak = 0, clippedSamples = 0;
    for (let bin = 0; bin < count; bin++) {
      const start = Math.floor(bin * decoded.length / count);
      const end = Math.floor((bin + 1) * decoded.length / count);
      let lowL = 1, highL = -1, lowR = 1, highR = -1;
      for (let i = start; i < end; i++) {
        const l = left[i], r = right[i];
        lowL = Math.min(lowL, l); highL = Math.max(highL, l);
        lowR = Math.min(lowR, r); highR = Math.max(highR, r);
        const ll = l * l, rr = r * r;
        sumL += ll; sumR += rr; sumLR += l * r;
        sumMid += (l + r) ** 2; sumSide += (l - r) ** 2;
        energyBuckets[Math.floor(i / bucketSize)] += ll + rr;
        peak = Math.max(peak, Math.abs(l), Math.abs(r));
        if (Math.abs(l) >= .9999) clippedSamples++;
        if (Math.abs(r) >= .9999) clippedSamples++;
      }
      minL[bin] = lowL; maxL[bin] = highL;
      minR[bin] = lowR; maxR[bin] = highR;
      if (bin % 1024 === 1023) await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    const rms = Math.sqrt((sumL + sumR) / (2 * decoded.length));
    const windows: number[] = [];
    for (let i = 0; i + 30 <= energyBuckets.length; i += 10) {
      let energy = 0;
      for (let j = i; j < i + 30; j++) energy += energyBuckets[j];
      const level = db(Math.sqrt(energy / (2 * bucketSize * 30)));
      if (Number.isFinite(level) && level > -60) windows.push(level);
    }
    windows.sort((a, b) => a - b);
    const loudnessSpreadDb = windows.length >= 2 ? percentile(windows, .9) - percentile(windows, .1) : null;
    const integratedLufs = await estimateLufs(decoded);
    return {
      waveform: { minL, maxL, minR, maxR },
      samplePeakDbfs: db(peak), rmsDbfs: db(rms), crestDb: db(peak) - db(rms),
      stereoCorrelation: sumL && sumR ? Math.max(-1, Math.min(1, sumLR / Math.sqrt(sumL * sumR))) : 0,
      sideMidDb: db(Math.sqrt(sumSide / decoded.length)) - db(Math.sqrt(sumMid / decoded.length)),
      channelBalanceDb: db(Math.sqrt(sumL / decoded.length)) - db(Math.sqrt(sumR / decoded.length)),
      loudnessSpreadDb, clippedSamples, integratedLufs,
    };
  } finally { await decoder.close(); }
}

async function estimateLufs(decoded: AudioBuffer): Promise<number> {
  const offline = new OfflineAudioContext(2, decoded.length, decoded.sampleRate);
  const source = offline.createBufferSource(); source.buffer = decoded;
  const shelf = offline.createBiquadFilter(); shelf.type = "highshelf"; shelf.frequency.value = 1681.974; shelf.gain.value = 4;
  const highpass = offline.createBiquadFilter(); highpass.type = "highpass"; highpass.frequency.value = 38.135; highpass.Q.value = .5;
  source.connect(shelf); shelf.connect(highpass); highpass.connect(offline.destination); source.start();
  const weighted = await offline.startRendering();
  const left = weighted.getChannelData(0), right = weighted.getChannelData(1);
  const block = Math.round(weighted.sampleRate * .4), hop = Math.round(weighted.sampleRate * .1);
  const energies: number[] = [];
  for (let start = 0; start + block <= weighted.length; start += hop) {
    let energy = 0;
    for (let i = start; i < start + block; i++) energy += left[i] ** 2 + right[i] ** 2;
    energy /= block;
    if (energy > 0 && -.691 + 10 * Math.log10(energy) >= -70) energies.push(energy);
  }
  if (!energies.length) throw new Error("Track is too quiet to measure loudness.");
  const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
  const gate = -.691 + 10 * Math.log10(mean) - 10;
  const gated = energies.filter(value => -.691 + 10 * Math.log10(value) >= gate);
  return -.691 + 10 * Math.log10(gated.reduce((a, b) => a + b, 0) / gated.length);
}
