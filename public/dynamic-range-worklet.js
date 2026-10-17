class TargetDynamicRangeProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.target = 0;
    this.amount = 0;
    this.envelope = 0;
    this.expanderEnvelope = 0;
    this.gain = 1;
    this.ceilingGain = 1;
    this.meterFrames = 0;
    this.meterCount = 0;
    this.meterReduction = 0;
    this.meterNetGain = 0;
    this.port.onmessage = event => {
      if (Number.isFinite(event.data?.amount)) this.target = Math.max(-1, Math.min(1, event.data.amount));
    };
  }

  process(inputs, outputs) {
    const input = inputs[0] || [];
    const output = outputs[0] || [];
    const frames = output[0]?.length || 0;
    const attack = Math.exp(-1 / (sampleRate * .008));
    const release = Math.exp(-1 / (sampleRate * .18));
    const movement = 1 - Math.exp(-1 / (sampleRate * .025));
    const expanderAttack = Math.exp(-1 / (sampleRate * .1));
    const expanderRelease = Math.exp(-1 / (sampleRate * 1.2));
    const expanderMovement = 1 - Math.exp(-1 / (sampleRate * .25));
    const ceilingRelease = Math.exp(-1 / (sampleRate * .08));
    for (let i = 0; i < frames; i++) {
      this.amount += (this.target - this.amount) * movement;
      let peak = 0;
      for (const channel of input) peak = Math.max(peak, Math.abs(channel[i] || 0));
      this.envelope = peak + (this.envelope - peak) * (peak > this.envelope ? attack : release);
      this.expanderEnvelope = peak + (this.expanderEnvelope - peak) * (peak > this.expanderEnvelope ? expanderAttack : expanderRelease);
      const levelDb = 20 * Math.log10(Math.max(this.envelope, 1e-5));
      let gainDb = 0;
      let reductionDb = 0;
      if (this.amount < 0) {
        const depth = -this.amount;
        const threshold = -14 - 6 * depth;
        const ratio = 1 + 4 * depth;
        const knee = 8;
        const over = levelDb - threshold;
        // A soft knee reduces peaks smoothly instead of switching gain at one level.
        if (over >= knee / 2) gainDb = -over * (1 - 1 / ratio);
        else if (over > -knee / 2) gainDb = -(1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee);
        reductionDb = -gainDb;
        // Makeup gain raises quieter material after peak reduction, like a conventional compressor.
        gainDb += 20 * depth;
      } else if (this.amount > 0) {
        const threshold = -20 + 12 * this.amount;
        const ratio = 1 + 2 * this.amount;
        const expanderLevelDb = 20 * Math.log10(Math.max(this.expanderEnvelope, 1e-5));
        if (expanderLevelDb < threshold) gainDb = Math.max(-18, (expanderLevelDb - threshold) * (ratio - 1));
        reductionDb = -gainDb;
      }
      this.gain += (10 ** (gainDb / 20) - this.gain) * (this.amount > 0 ? expanderMovement : movement);
      if (Math.abs(this.amount) < .0001) {
        this.gain = 1;
        this.ceilingGain = 1;
      } else {
        const required = peak * this.gain > .98 ? .98 / (peak * this.gain) : 1;
        // The ceiling catches overs only; it is not the dynamic-range control.
        this.ceilingGain = Math.min(required, 1 - (1 - this.ceilingGain) * ceilingRelease);
      }
      for (let channel = 0; channel < output.length; channel++) output[channel][i] = (input[channel]?.[i] || 0) * this.gain * this.ceilingGain;
      if (peak > 1e-4) { this.meterReduction += reductionDb; this.meterNetGain += 20 * Math.log10(Math.max(this.gain * this.ceilingGain, 1e-5)); this.meterCount++; }
      if (++this.meterFrames >= sampleRate / 6) {
        this.port.postMessage({ type: 'dynamics', reductionDb: this.meterCount ? this.meterReduction / this.meterCount : 0, netGainDb: this.meterCount ? this.meterNetGain / this.meterCount : 0 });
        this.meterFrames = 0; this.meterCount = 0; this.meterReduction = 0; this.meterNetGain = 0;
      }
    }
    return true;
  }
}

registerProcessor('target-dynamic-range', TargetDynamicRangeProcessor);
