import { peqCoefficients, type PeqFilter } from "./autoeq";
import type { ChannelMatchPreset } from "./peq-preset";
import { exportEasyEffects, exportPeq, type FinalizedVariant } from "./preference-finalize";

export const EXPORT_CONTENTS = {
  main: "Main EQ only",
  match: "Channel Match only",
  both: "Main EQ + Channel Match",
} as const;
export type ExportContents = keyof typeof EXPORT_CONTENTS;

export const EXPORT_DESTINATIONS = {
  txt: "EQ TXT",
  equalizerapo: "Equalizer APO (Windows)",
  peace: "Peace via Equalizer APO (Windows)",
  "easy-effects-json": "Easy Effects (Linux)",
  easyeffects: "Easy Effects APO TXT (Linux)",
  soundsource: "SoundSource (macOS)",
  apomac: "APOMac (macOS 15+)",
  qudelix: "Qudelix (hardware)",
} as const;
export type ExportDestination = keyof typeof EXPORT_DESTINATIONS;
export type QudelixModel = "5k" | "5k-plus";

type Stage = { preampDb: number; filters: PeqFilter[] };
type Stereo = [Stage, Stage];
type ExportSelection = {
  contents: ExportContents;
  destination: ExportDestination;
  model: QudelixModel;
  fit?: FinalizedVariant;
  match?: ChannelMatchPreset;
  mainLimit: number;
};
export type EqExportFile = {
  filename: string;
  text: string;
  mime: "text/plain" | "application/json";
  label?: string;
};
type RecordedEqFormat = "txt" | "equalizerapo" | "easyeffects";

const RATES = [44100, 48000, 88200, 96000];
const MARGIN_DB = 0.5;
const Q_SCALE = 1024;
const isStereoTxt = (destination: ExportDestination) =>
  destination === "txt" || destination === "easyeffects" || destination === "soundsource";

export function usesMain(contents: ExportContents) {
  return contents !== "match";
}

export function usesMatch(contents: ExportContents) {
  return contents !== "main";
}

export function supportsContents(destination: ExportDestination, contents: ExportContents) {
  return contents === "main" || !isStereoTxt(destination);
}

export function recordedEqFormat(destination: ExportDestination, contents: ExportContents): RecordedEqFormat | undefined {
  if (contents !== "main") return;
  if (destination === "txt" || destination === "equalizerapo" || destination === "easyeffects") return destination;
}

export function platformEqIssue({ contents, destination, model, fit, match, mainLimit }: ExportSelection) {
  const main = usesMain(contents) ? fit?.filters : undefined;
  const ears = usesMatch(contents) ? match?.channels : undefined;
  if (!supportsContents(destination, contents)) return "This format supports Main EQ only. Choose another format for Channel Match.";
  if (usesMain(contents) && !main) return "Generate and select a Main EQ first.";
  if (usesMatch(contents) && !ears) return "Add paired measurements or an uploaded Channel Match first.";
  const count = main?.length ?? 0;
  if (count > mainLimit) return "Select a fit within your " + mainLimit + "-band Main EQ limit.";
  const channelCount = Math.max(0, ...(ears?.map(channel => channel.filters.length) ?? []));
  if (destination === "qudelix") {
    const modelName = model === "5k" ? "Qudelix 5K" : "Qudelix 5K Plus";
    const matchLimit = model === "5k" ? 10 : 20;
    if (channelCount > matchLimit) return modelName + " supports up to " + matchLimit + " Channel Match filters per side.";
    const sharedLimit = model === "5k" ? 10 : 30 - channelCount;
    if (count > sharedLimit) {
      return modelName + " can use up to " + sharedLimit + " Main EQ filters with this selection. Choose a smaller fit.";
    }
    const qLimit = model === "5k" ? 15 : 63;
    if ([...(main ?? []), ...(ears?.flatMap(channel => channel.filters) ?? [])].some(
      filter => filter.hz < 10 || filter.hz > 22000 || Math.abs(filter.gain) > 50 || filter.q < 10 / Q_SCALE || filter.q > qLimit
    )) return "A filter is outside this Qudelix model’s frequency, gain, or Q range.";
    const preamps = [...(main ? [fit!.preamp] : []), ...(ears?.map(channel => channel.preampDb) ?? [])];
    if (preamps.some(value => Math.abs(Math.round(value * 10)) > 240)) {
      return "A preamp is outside this Qudelix export’s −24 to +24 dB range.";
    }
  }
  if ((destination === "easy-effects-json" || destination === "soundsource") && Math.max(count, channelCount) > 32) {
    return "This format accepts up to 32 filters per EQ stage.";
  }
  if (destination === "easy-effects-json" && [...(main ?? []), ...(ears?.flatMap(channel => channel.filters) ?? [])]
    .some(filter => filter.hz < 10 || filter.hz > 24000 || Math.abs(filter.gain) > 36 || filter.q < 0 || filter.q > 100)) {
    return "A filter is outside the Easy Effects frequency, gain, or Q range.";
  }
}

function numeric(value: number) {
  return value.toFixed(9).replace(/\.?0+$/, "");
}

function filterText(filters: PeqFilter[], first = 1, typeFor: (filter: PeqFilter) => string = filter => filter.type ?? "PK") {
  return filters.map((filter, index) =>
    "Filter " + (first + index) + ": ON " + typeFor(filter) + " Fc " + numeric(filter.hz) +
    " Hz Gain " + numeric(filter.gain) + " dB Q " + numeric(filter.q)
  );
}

function shortShelfType(filter: PeqFilter) {
  return filter.type === "LSC" ? "LS" : filter.type === "HSC" ? "HS" : "PK";
}

function preampText(value: number) {
  return "Preamp: " + numeric(value) + " dB";
}

function apoText(main?: Stage, ears?: Stereo) {
  const lines = [];
  let index = 1;
  if (main) {
    // A standalone main preset is also valid as a conventional stereo import.
    lines.push("Channel: L R", preampText(main.preampDb), ...filterText(main.filters, index));
    index += main.filters.length;
  }
  if (ears) {
    for (const [side, stage] of [["L", ears[0]], ["R", ears[1]]] as const) {
      if (lines.length) lines.push("");
      lines.push("Channel: " + side, preampText(stage.preampDb), ...filterText(stage.filters, index));
      index += stage.filters.length;
    }
  }
  return lines.join("\n") + "\n";
}

function easyEffectStage(left: Stage, right: Stage, split: boolean) {
  const leftGain = 10 ** (left.preampDb / 20);
  const rightGain = 10 ** (right.preampDb / 20);
  const sharedDb = split ? 20 * Math.log10((leftGain + rightGain) / 2) : left.preampDb;
  const inputGain = Math.max(-36, Math.min(36, sharedDb));
  const outputGain = sharedDb - inputGain;
  if (Math.abs(outputGain) > 36) throw Error("The required Easy Effects gain exceeds the supported range.");
  const count = Math.max(1, left.filters.length, right.filters.length);
  const bands = (filters: PeqFilter[]) => Object.fromEntries(Array.from({ length: count }, (_, index) => {
    const filter = filters[index];
    const type = filter?.type === "LSC" ? "Lo-shelf" : filter?.type === "HSC" ? "Hi-shelf" : filter ? "Bell" : "Off";
    return ["band" + index, {
      type, mode: "APO (DR)", slope: "x1", solo: false, mute: false, width: 4,
      frequency: filter?.hz ?? 1000, gain: filter?.gain ?? 0, q: filter?.q ?? 1,
    }];
  }));
  return {
    bypass: false, mode: "IIR", decramp: "Off", "num-bands": count, "split-channels": split,
    "input-gain": inputGain, "output-gain": outputGain,
    // LSP Balance scales L by (1 − b/100) and R by (1 + b/100).
    balance: split ? 100 * (rightGain - leftGain) / (rightGain + leftGain) : 0,
    "pitch-left": 0, "pitch-right": 0, left: bands(left.filters), right: bands(right.filters),
  };
}

function easyEffectsJson(main?: Stage, ears?: Stereo) {
  const effects = [];
  if (main) effects.push(easyEffectStage(main, main, false));
  if (ears) effects.push(easyEffectStage(ears[0], ears[1], true));
  const order = effects.map((_, index) => "equalizer#" + index);
  const output = Object.fromEntries(effects.map((effect, index) => [order[index], effect]));
  return JSON.stringify({ output: { blocklist: [], plugins_order: order, ...output } }, null, 2) + "\n";
}

function quantize(stage: Stage): Stage {
  return {
    preampDb: Math.round(stage.preampDb * 10) / 10,
    filters: stage.filters.map(filter => ({
      ...filter, hz: Math.round(filter.hz), gain: Math.round(filter.gain * 10) / 10,
      q: Math.round(filter.q * Q_SCALE) / Q_SCALE,
    })),
  };
}

function qudelixText(stages: [Stage] | Stereo, slots: number, model: QudelixModel) {
  const lines = ["TYPE: PEQ"];
  for (const [side, stage] of stages.entries()) {
    if (stages.length === 2) lines.push("", model === "5k-plus" ? "CH: " + side : "Channel: " + (side === 0 ? "L" : "R"));
    lines.push("Preamp: " + stage.preampDb.toFixed(1) + " dB", ...filterText(stage.filters, 1, shortShelfType));
    for (let slot = stage.filters.length + 1; slot <= slots; slot++) {
      lines.push("Filter " + slot + ": OFF PK Fc 1000 Hz Gain 0.0 dB Q 1.000");
    }
  }
  return lines.join("\r\n") + "\r\n";
}

function peakDb(filters: PeqFilter[], rate: number) {
  const coeffs = filters.filter(filter => filter.gain !== 0).map(filter => peqCoefficients(filter, rate));
  if (!coeffs.length) return 0;
  function level(hz: number) {
    const omega = 2 * Math.PI * hz / rate;
    const c1 = Math.cos(omega), s1 = Math.sin(omega), c2 = Math.cos(2 * omega), s2 = Math.sin(2 * omega);
    let db = 0;
    for (const { a, b } of coeffs) {
      const nr = b[0] + b[1] * c1 + b[2] * c2, ni = b[1] * s1 + b[2] * s2;
      const dr = a[0] + a[1] * c1 + a[2] * c2, di = a[1] * s1 + a[2] * s2;
      db += 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
    }
    return db;
  }
  const step = Math.log((rate / 2) / 0.1) / 4096;
  const frequency = (index: number) => 0.1 * Math.exp(step * index);
  const samples = Array.from({ length: 4097 }, (_, index) => level(frequency(index)));
  let peak = Math.max(level(0), level(rate / 2), ...samples, ...filters.map(filter => level(filter.hz)));
  for (let index = 1; index < samples.length - 1; index++) {
    if (samples[index] <= samples[index - 1] || samples[index] <= samples[index + 1]) continue;
    let low = index - 1, high = index + 1;
    for (let step = 0; step < 16; step++) {
      const a = low + (high - low) / 3, b = high - (high - low) / 3;
      if (level(frequency(a)) < level(frequency(b))) low = a;
      else high = b;
    }
    peak = Math.max(peak, level(frequency((low + high) / 2)));
  }
  return peak;
}

export function exportPeakDb(main?: Stage, ears?: Stereo) {
  return Math.max(...RATES.flatMap(rate => [0, 1].map(index => {
    const ear = ears?.[index];
    const filters = [...(main?.filters ?? []), ...(ear?.filters ?? [])];
    return peakDb(filters, rate) + (main?.preampDb ?? 0) + (ear?.preampDb ?? 0);
  })));
}

export function buildPlatformEq(selection: ExportSelection, basename: string): { files: EqExportFile[]; attenuationDb: number; mainPreampDb?: number } {
  const issue = platformEqIssue(selection);
  if (issue) throw Error(issue);
  const { destination, contents, fit, match, model } = selection;
  const hardware = destination === "qudelix";
  let main: Stage | undefined = usesMain(contents) ? { preampDb: fit!.preamp, filters: fit!.filters } : undefined;
  let ears: Stereo | undefined = usesMatch(contents) ? match!.channels : undefined;
  if (hardware) {
    if (main) main = quantize(main);
    if (ears) ears = [quantize(ears[0]), quantize(ears[1])];
  }
  // Check the numbers that the legacy text exporters actually write.
  if (main && (destination === "txt" || destination === "easyeffects")) {
    main = {
      preampDb: Number(main.preampDb.toFixed(1)),
      filters: main.filters.map(filter => ({ ...filter, gain: Number(filter.gain.toFixed(6)), q: Number(filter.q.toFixed(6)) })),
    };
  }
  const attenuationDb = Math.max(0, Math.ceil((exportPeakDb(main, ears) + MARGIN_DB - 1e-8) * 10) / 10);
  if (attenuationDb) {
    const fromMain = main ? Math.min(attenuationDb, hardware ? Math.max(0, main.preampDb + 24) : attenuationDb) : 0;
    if (main) main = { ...main, preampDb: main.preampDb - fromMain };
    const fromMatch = attenuationDb - fromMain;
    if (fromMatch > 1e-6) {
      if (!ears || hardware && ears.some(ear => ear.preampDb - fromMatch < -24 - 1e-6)) {
        throw Error("This Qudelix preset needs more headroom than its preamp range allows. Choose a lower-boost fit.");
      }
      ears = [{ ...ears[0], preampDb: ears[0].preampDb - fromMatch }, { ...ears[1], preampDb: ears[1].preampDb - fromMatch }];
    }
  }
  const scope = contents === "main" ? "" : contents === "match" ? "-channel-match" : "-paired";
  const file = (suffix: string, text: string, mime: EqExportFile["mime"] = "text/plain", label?: string): EqExportFile =>
    ({ filename: basename + scope + suffix, text, mime, label });
  let files: EqExportFile[];
  switch (destination) {
    case "txt":
    case "easyeffects": {
      const variant = { ...fit!, preamp: main!.preampDb };
      files = destination === "txt" ? [file(".txt", exportPeq(variant))] : [file("-easyeffects.txt", exportEasyEffects(variant))];
      break;
    }
    case "equalizerapo":
    case "peace":
    case "apomac":
      files = [file("-equalizerapo.txt", apoText(main, ears))];
      break;
    case "soundsource":
      files = [file("-soundsource.txt", [
        preampText(main!.preampDb),
        ...filterText(main!.filters, 1, shortShelfType),
      ].join("\n") + "\n")];
      break;
    case "easy-effects-json":
      files = [file("-easyeffects.json", easyEffectsJson(main, ears), "application/json")];
      break;
    case "qudelix": {
      const modelSuffix = "-qudelix-" + model;
      const layered = !!ears;
      const mainSlots = model === "5k" || layered ? 10 : 30;
      const matchSlots = model === "5k" ? 10 : 20;
      files = [];
      if (main) {
        const overflow = main.filters.slice(mainSlots);
        if (ears && overflow.length) {
          ears = [
            { ...ears[0], filters: [...overflow, ...ears[0].filters] },
            { ...ears[1], filters: [...overflow, ...ears[1].filters] },
          ];
        }
        files.push(file(modelSuffix + "-usr.txt", qudelixText([{ ...main, filters: main.filters.slice(0, mainSlots) }], mainSlots, model),
          "text/plain", "Download Main EQ (USR)"));
      }
      if (ears) files.push(file(modelSuffix + "-spk.txt", qudelixText(ears, matchSlots, model),
        "text/plain", "Download Channel Match (SPK)"));
      break;
    }
  }
  return { files, attenuationDb, mainPreampDb: main?.preampDb };
}
