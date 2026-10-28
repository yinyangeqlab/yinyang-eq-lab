/** Private preset comparisons have no server or browser-storage representation. */
export type EqFilter = { type: "PK" | "LSC" | "HSC"; hz: number; gain: number; q: number };
export type EqChannel = { preampDb: number; filters: EqFilter[] };
export type EqPreset = { name: string; channels: [EqChannel, EqChannel] };
export type BlindChoice = "A" | "B" | "tie" | "skip";
export type BlindRound = { sourceId?: string; order: [0 | 1, 0 | 1]; song: string; artist: string; start: number; seconds: number; choice: BlindChoice; heard: [number, number] };
export type BlindSession = { presets: [EqPreset, EqPreset]; order: [0 | 1, 0 | 1]; rounds: BlindRound[]; revealed: boolean; revealedAt: string | null };

export function validateEqPreset(preset: EqPreset): EqPreset {
  if (!preset.name.trim() || preset.name.length > 100) throw Error("Give this preset a name of 1–100 characters.");
  if (preset.channels.length !== 2) throw Error("A preset needs Left and Right channels.");
  for (const channel of preset.channels) {
    if (!Number.isFinite(channel.preampDb) || Math.abs(channel.preampDb) > 40) throw Error("Preamp must be between −40 and +40 dB.");
    if (channel.filters.length > 32) throw Error("Use at most 32 enabled filters per channel.");
    for (const filter of channel.filters) {
      if (!["PK", "LSC", "HSC"].includes(filter.type) || !Number.isFinite(filter.hz) || filter.hz < 10 || filter.hz > 24000 ||
        !Number.isFinite(filter.gain) || Math.abs(filter.gain) > 30 || !Number.isFinite(filter.q) || filter.q < .1 || filter.q > 20) {
        throw Error("Each filter needs 10–24,000 Hz, −30 to +30 dB gain and Q 0.1–20.");
      }
    }
  }
  return structuredClone(preset);
}

/** Validate before names are hidden; the context rate, not the file rate, sets Nyquist. */
export function validateEqSampleRate(presets: readonly EqPreset[], sampleRate: number) {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw Error("The playback sample rate is unavailable. Try starting again.");
  presets.forEach((preset, p) => preset.channels.forEach((channel, c) => channel.filters.forEach((filter, f) => {
    if (filter.hz >= sampleRate / 2) throw Error(`Preset ${p + 1}, ${c === 0 ? "Left" : "Right"} filter ${f + 1}: ${filter.hz} Hz must be below this device’s playback limit (${sampleRate / 2} Hz). Edit the filter before starting.`);
  })));
}

/** Equalizer APO / Peace parametric TXT, plus the supported CH: 0 / CH: 1 dialect.
 * Fail closed on signal-processing commands that cannot be reproduced here.
 * LS/HS without slope modifiers are center-frequency shelves (APO reference).
 */
export function parseEqPresetText(text: string, name: string): EqPreset {
  if (text.length > 200_000) throw Error("Choose an EQ TXT file under 200 KB.");
  const channels: [EqChannel, EqChannel] = [{ preampDb: 0, filters: [] }, { preampDb: 0, filters: [] }];
  const qudelix = /^\s*CH:/im.test(text);
  let selected: number[] = qudelix ? [] : [0, 1];
  const seen = new Set<number>();
  let commands = 0;
  const number = "([-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))";
  const preamp = new RegExp(`^Preamp:\\s*${number}\\s*dB$`, "i");
  const filter = new RegExp(`^Filter(?:\\s+\\d+)?:\\s*ON\\s+(PK|PEQ|LS|LSC|HS|HSC)\\s+Fc\\s+${number}\\s*Hz\\s+Gain\\s+${number}\\s*dB(?:\\s+Q\\s+${number})?$`, "i");
  for (const [index, raw] of text.replace(/^\uFEFF/, "").split(/\r?\n/).entries()) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const fail = (detail: string): never => { throw Error(`Line ${index + 1}: ${detail}`); };
    const ch = /^CH:\s*([01])$/i.exec(line);
    if (ch) { selected = [Number(ch[1])]; seen.add(selected[0]); continue; }
    const channel = /^Channel:\s*(ALL|L|R|L\s+R|1|2|1\s+2)$/i.exec(line);
    if (channel) {
      if (qudelix) fail("Do not mix CH and Channel formats.");
      const value = channel[1].toUpperCase();
      selected = value === "L" || value === "1" ? [0] : value === "R" || value === "2" ? [1] : [0, 1];
      continue;
    }
    if (/^TYPE:\s*PEQ$/i.test(line) && qudelix && selected.length) continue;
    if (!selected.length) fail("Start with CH: 0 or CH: 1.");
    const pre = preamp.exec(line);
    if (pre) { for (const channel of selected) channels[channel].preampDb += Number(pre[1]); commands++; continue; }
    if (/^Filter(?:\s+\d+)?:\s*OFF\b/i.test(line)) { commands++; continue; }
    const row = filter.exec(line);
    if (row) {
      const type = row[1].toUpperCase();
      const entry: EqFilter = { type: type === "PEQ" ? "PK" : type === "LS" ? "LSC" : type === "HS" ? "HSC" : type as EqFilter["type"], hz: Number(row[2]), gain: Number(row[3]), q: row[4] === undefined ? Math.SQRT1_2 : Number(row[4]) };
      // The captures are type, frequency, gain and optional Q.
      if ((type === "PK" || type === "PEQ") && row[4] === undefined) fail("Peak filters need a Q value.");
      for (const channel of selected) channels[channel].filters.push({ ...entry });
      commands++; continue;
    }
    fail("Unsupported EQ setting. Use a parametric TXT export with PK, LS/LSC or HS/HSC filters and Q, or enter the filters manually. GraphicEQ, convolution, includes, slope/BW modifiers and native .peace files are not supported.");
  }
  if (qudelix && seen.size !== 2) throw Error("A channel-specific export must contain both CH: 0 and CH: 1.");
  if (!commands) throw Error("No EQ settings found. Upload a parametric TXT export or use manual entry.");
  return validateEqPreset({ name, channels });
}

/** RBJ biquads, with explicit shelf Q (Web Audio's shelf nodes ignore Q). */
export function eqCoefficients(filter: EqFilter, sampleRate: number) {
  if (filter.hz >= sampleRate / 2) throw Error("These presets cannot be prepared at this device’s playback rate. Return to setup to review them; no choice was saved.");
  const omega = 2 * Math.PI * filter.hz / sampleRate, c = Math.cos(omega);
  const alpha = Math.sin(omega) / (2 * filter.q), A = 10 ** (filter.gain / 40), root = Math.sqrt(A);
  let b: number[], a: number[];
  if (filter.type === "PK") {
    b = [1 + alpha * A, -2 * c, 1 - alpha * A]; a = [1 + alpha / A, -2 * c, 1 - alpha / A];
  } else if (filter.type === "LSC") {
    b = [A * ((A + 1) - (A - 1) * c + 2 * root * alpha), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - 2 * root * alpha)];
    a = [(A + 1) + (A - 1) * c + 2 * root * alpha, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - 2 * root * alpha];
  } else {
    b = [A * ((A + 1) + (A - 1) * c + 2 * root * alpha), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - 2 * root * alpha)];
    a = [(A + 1) - (A - 1) * c + 2 * root * alpha, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - 2 * root * alpha];
  }
  return { feedforward: b.map(value => value / a[0]), feedback: a.map(value => value / a[0]) };
}

/** Same attenuation on L/R preserves the preset's channel balance. Match each
 * rendered passage's stereo RMS, then apply common headroom to both variants. */
export function comparisonGains(stats: [{ rms: number; peak: number }, { rms: number; peak: number }], match: boolean): [number, number] {
  if (stats.some(s => !Number.isFinite(s.rms) || !Number.isFinite(s.peak))) throw Error("This preset produced invalid audio.");
  if (stats.some(s => s.rms < 1e-7)) throw Error("This passage is silent or too quiet to compare. Choose another passage.");
  const target = Math.min(stats[0].rms, stats[1].rms);
  const gain = stats.map(s => match ? target / s.rms : 1);
  const peak = Math.max(...stats.map((s, i) => s.peak * gain[i]));
  const headroom = Math.min(1, 10 ** (-3 / 20) / Math.max(peak, 1e-9));
  return [gain[0] * headroom, gain[1] * headroom];
}

export function createBlindSession(presets: [EqPreset, EqPreset], random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32): BlindSession {
  return { presets: presets.map(validateEqPreset) as [EqPreset, EqPreset], order: random() < .5 ? [0, 1] : [1, 0], rounds: [], revealed: false, revealedAt: null };
}
export function recordBlindRound(session: BlindSession, round: Omit<BlindRound, "order">, random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32): BlindSession {
  if (session.revealed) throw Error("This comparison is already revealed. Start a new session.");
  if (!["A", "B", "tie", "skip"].includes(round.choice) || round.heard.length !== 2 || !Number.isFinite(round.start) || round.start < 0 || !Number.isFinite(round.seconds) || round.seconds < 5) throw Error("Invalid comparison result.");
  if (round.choice !== "skip" && round.heard.some(seconds => !Number.isFinite(seconds) || seconds < 5)) throw Error("Listen to at least five seconds of both A and B first.");
  return { ...session, order: random() < .5 ? [0, 1] : [1, 0], rounds: [...session.rounds, { ...structuredClone(round), order: [...session.order] }] };
}
export function revealBlindSession(session: BlindSession): BlindSession {
  if (session.revealed) return session;
  if (!session.rounds.some(round => round.choice !== "skip")) throw Error("Complete at least one comparison before revealing.");
  return { ...session, revealed: true, revealedAt: new Date().toISOString() };
}
