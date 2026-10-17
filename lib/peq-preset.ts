export type PresetFilter = { type: "PK" | "LSC" | "HSC"; hz: number; gain: number; q: number };
export type ChannelMatchPreset = { channels: [{ preampDb: number; filters: PresetFilter[] }, { preampDb: number; filters: PresetFilter[] }] };

export function parseChannelMatchPreset(text: string): ChannelMatchPreset {
  if (text.length > 200_000) throw new Error("Preset file exceeds 200 KB.");
  if (!/^\s*(?:CH:\s*[01]\s*$)/im.test(text)) {
    throw new Error("This is not a two-channel channel-match preset. Choose the Qudelix/PEQdB TXT with CH: 0 and CH: 1 sections; put frequency/level files in the Left and Right response fields.");
  }
  const channels: ChannelMatchPreset["channels"] = [{ preampDb: 0, filters: [] }, { preampDb: 0, filters: [] }];
  const seen = [false, false], preamps = [false, false];
  let channel = -1;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const head = /^CH:\s*([01])$/i.exec(trimmed);
    if (head) { channel = Number(head[1]); seen[channel] = true; continue; }
    if (channel < 0) throw new Error("The preset must begin with CH: 0 or CH: 1.");
    if (/^TYPE:\s*PEQ$/i.test(trimmed)) continue;
    const preamp = /^Preamp:\s*([-+]?\d+(?:\.\d+)?)\s*dB$/i.exec(trimmed);
    if (preamp) { channels[channel].preampDb = Number(preamp[1]); preamps[channel] = true; continue; }
    const filter = /^Filter\s+\d+:\s*(ON|OFF)\s+(PK|LSC|HSC)\s+Fc\s+(\d+(?:\.\d+)?)\s+Hz\s+Gain\s+([-+]?\d+(?:\.\d+)?)\s+dB\s+Q\s+(\d+(?:\.\d+)?)$/i.exec(trimmed);
    if (!filter) throw new Error(`Unsupported preset line: ${trimmed.slice(0, 70)}. Choose a two-channel Qudelix/PEQdB PEQ export.`);
    if (filter[1].toUpperCase() === "OFF") continue;
    const [, , type, hzText, gainText, qText] = filter;
    const hz = Number(hzText), gain = Number(gainText), q = Number(qText);
    if (hz < 20 || hz > 20000 || Math.abs(gain) > 40 || q < .1 || q > 20) throw new Error("A preset filter has a frequency, gain, or Q outside the supported range.");
    if (channels[channel].filters.length >= 32) throw new Error("Use at most 32 filters per channel.");
    channels[channel].filters.push({ type: type.toUpperCase() as PresetFilter["type"], hz, gain, q });
  }
  if (!seen.every(Boolean) || !preamps.every(Boolean)) throw new Error("The preset needs CH: 0 and CH: 1 sections, each with a preamp. A single-channel EQ or frequency-response export cannot be used as a channel-match preset.");
  if (channels.some(row => Math.abs(row.preampDb) > 40)) throw new Error("Preset preamp exceeds 40 dB.");
  return { channels };
}

// RBJ/W3C Audio EQ Cookbook magnitude response for PK, low shelf and high shelf.
export function presetFilterResponse(hz: number, filter: PresetFilter, sampleRate: number) {
  const center = Math.min(filter.hz, sampleRate * .49);
  const omega = 2 * Math.PI * center / sampleRate, c = Math.cos(omega);
  const alpha = Math.sin(omega) / (2 * filter.q), A = 10 ** (filter.gain / 40), root = Math.sqrt(A);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  if (filter.type === "PK") {
    b0 = 1 + alpha * A; b1 = -2 * c; b2 = 1 - alpha * A;
    a0 = 1 + alpha / A; a1 = -2 * c; a2 = 1 - alpha / A;
  } else if (filter.type === "LSC") {
    b0 = A * ((A + 1) - (A - 1) * c + 2 * root * alpha);
    b1 = 2 * A * ((A - 1) - (A + 1) * c);
    b2 = A * ((A + 1) - (A - 1) * c - 2 * root * alpha);
    a0 = (A + 1) + (A - 1) * c + 2 * root * alpha;
    a1 = -2 * ((A - 1) + (A + 1) * c);
    a2 = (A + 1) + (A - 1) * c - 2 * root * alpha;
  } else {
    b0 = A * ((A + 1) + (A - 1) * c + 2 * root * alpha);
    b1 = -2 * A * ((A - 1) + (A + 1) * c);
    b2 = A * ((A + 1) + (A - 1) * c - 2 * root * alpha);
    a0 = (A + 1) - (A - 1) * c + 2 * root * alpha;
    a1 = 2 * ((A - 1) - (A + 1) * c);
    a2 = (A + 1) - (A - 1) * c - 2 * root * alpha;
  }
  const w = 2 * Math.PI * Math.min(hz, sampleRate / 2) / sampleRate;
  const C = Math.cos(w), S = Math.sin(w), C2 = Math.cos(2 * w), S2 = Math.sin(2 * w);
  const nr = b0 + b1 * C + b2 * C2, ni = b1 * S + b2 * S2;
  const dr = a0 + a1 * C + a2 * C2, di = a1 * S + a2 * S2;
  return 10 * Math.log10(Math.max(1e-24, (nr * nr + ni * ni) / (dr * dr + di * di)));
}

export function presetResponse(hz: number, preset: ChannelMatchPreset, channel: 0 | 1, sampleRate: number) {
  const row = preset.channels[channel];
  return row.preampDb + row.filters.reduce((sum, filter) => sum + presetFilterResponse(hz, filter, sampleRate), 0);
}
