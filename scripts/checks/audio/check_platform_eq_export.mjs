import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import vm from "node:vm";
import ts from "typescript";

const loaded = new Map();
function load(filename) {
  const path = resolve(filename);
  if (loaded.has(path)) return loaded.get(path).exports;
  const loadedModule = { exports: {} };
  loaded.set(path, loadedModule);
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInThisContext("(function(module, exports, require){" + outputText + "\n})", { filename: path })(
    loadedModule, loadedModule.exports,
    id => load((id.startsWith("@/") ? resolve("site", id.slice(2)) : resolve(dirname(path), id)) + ".ts"),
  );
  return loadedModule.exports;
}

const { buildPlatformEq, exportPeakDb, platformEqIssue, recordedEqFormat } = load("site/lib/platform-eq-export.ts");
const { response } = load("site/lib/autoeq.ts");
const { channelMatchIirPreset, channelMatchIirText } = load("site/lib/channel-match-export.ts");
const { parseChannelMatchPreset } = load("site/lib/peq-preset.ts");
const pk = (hz, gain, q) => ({ type: "PK", hz, gain, q });
const fit = {
  filters: [pk(120.375, 2.7, 0.91), { type: "LSC", hz: 62, gain: 2.35, q: 0.63 }],
  preamp: -6, bands: 10, method: "precise", priority: "close",
};
const custom = {
  channelMatchMode: "custom",
  channelMatchPreset: { channels: [
    { preampDb: -2.623, filters: [pk(1400, -1.62, 3.15), { type: "HSC", hz: 9700, gain: 0.73, q: 0.64 }] },
    { preampDb: -1.581, filters: [pk(510, 1.05, 0.74)] },
  ] },
};
const match = channelMatchIirPreset(custom, 10);
const settings = { fit, match, model: "5k", mainLimit: 32 };
const build = (destination, contents, patch = {}) => buildPlatformEq({ ...settings, destination, contents, ...patch }, "synthetic-review");
const equal = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, String(actual) + " != " + expected);

function apoChannels(text) {
  const channels = [{ preampDb: 0, filters: [] }, { preampDb: 0, filters: [] }];
  let indices = [0, 1];
  const ids = [];
  for (const line of text.trim().split(/\r?\n/)) {
    if (!line) continue;
    const [key, value] = line.split(": ");
    if (key === "Channel") indices = value.split(" ").map(side => side === "L" ? 0 : side === "R" ? 1 : -1);
    else if (key === "Preamp") for (const index of indices) channels[index].preampDb += Number.parseFloat(value);
    else {
      assert.match(key, /^Filter \d+$/);
      ids.push(Number(key.split(" ")[1]));
      const [on, type, fc, hz, unit, gainLabel, gain, db, qLabel, q] = value.split(" ");
      assert.deepEqual([on, fc, unit, gainLabel, db, qLabel], ["ON", "Fc", "Hz", "Gain", "dB", "Q"]);
      for (const index of indices) channels[index].filters.push({ type, hz: +hz, gain: +gain, q: +q });
    }
  }
  assert.deepEqual(ids, Array.from({ length: ids.length }, (_, i) => i + 1));
  return channels;
}

function reference(contents, index) {
  const stage = match.channels[index];
  return {
    preampDb: (contents === "match" ? 0 : fit.preamp) + (contents === "main" ? 0 : stage.preampDb),
    filters: [...(contents === "match" ? [] : fit.filters), ...(contents === "main" ? [] : stage.filters)],
  };
}

for (const contents of ["main", "match", "both"]) {
  const apo = build("equalizerapo", contents);
  const mac = build("apomac", contents);
  assert.equal(mac.files[0].text, apo.files[0].text);
  assert.equal(build("peace", contents).files[0].text, apo.files[0].text);
  const decoded = apoChannels(apo.files[0].text);
  assert.equal(apo.attenuationDb, 0);
  assert.deepEqual(decoded, [reference(contents, 0), reference(contents, 1)]);
  const effects = JSON.parse(build("easy-effects-json", contents).files[0].text).output;
  assert.equal(effects.plugins_order.length, contents === "both" ? 2 : 1);
  for (const [index, side] of ["left", "right"].entries()) {
    const actual = { filters: [], preampDb: 0 };
    for (const key of effects.plugins_order) {
      const eq = effects[key];
      const bands = Object.values(eq[side]);
      assert.equal(bands.length, eq["num-bands"]);
      assert.equal(eq["split-channels"], contents !== "main" && (contents !== "both" || key.endsWith("#1")));
      actual.preampDb += eq["input-gain"] + eq["output-gain"] + 20 * Math.log10(1 + (index === 0 ? -1 : 1) * eq.balance / 100);
      actual.filters.push(...bands.filter(band => band.type !== "Off").map(band => ({
        type: { Bell: "PK", "Lo-shelf": "LSC", "Hi-shelf": "HSC" }[band.type],
        hz: band.frequency, gain: band.gain, q: band.q,
      })));
    }
    const expected = reference(contents, index);
    equal(actual.preampDb, expected.preampDb);
    assert.deepEqual(actual.filters, expected.filters);
    for (const rate of [44100, 48000, 88200, 96000]) for (const hz of [30, 62, 510, 1400, 9700, 20000]) {
      const db = stage => stage.filters.reduce((sum, filter) => sum + response(hz, filter, rate), stage.preampDb);
      equal(db(actual), db(expected));
    }
  }
}

assert.deepEqual(match, parseChannelMatchPreset(channelMatchIirText(custom, 10)));
assert.throws(() => channelMatchIirPreset(custom, 1), /exceeds/);
assert.throws(() => build("equalizerapo", "both", { match: undefined }), /Add paired/);
assert.throws(() => build("soundsource", "both"), /Main EQ only/);
assert.throws(() => build("easyeffects", "match"), /Main EQ only/);
assert.equal(recordedEqFormat("equalizerapo", "both"), undefined);
assert.equal(recordedEqFormat("equalizerapo", "main"), "equalizerapo");
assert.equal(recordedEqFormat("easy-effects-json", "main"), undefined);
assert.equal(recordedEqFormat("apomac", "main"), undefined);

const points = Array.from({ length: 25 }, (_, i) => [20 * 1000 ** (i / 24), Math.sin(i / 2)]);
const automatic = channelMatchIirPreset({
  leftPoints: points, rightPoints: points.map(([hz, db], index) => [hz, db + Math.sin(index / 4)]),
  rightLevelDb: 0.7,
}, 3);
assert.ok(automatic.channels.every(channel => channel.filters.length <= 3));
assert.ok(automatic.channels[0].filters.length > 0);
assert.notEqual(automatic.channels[0].preampDb, automatic.channels[1].preampDb);
assert.equal(automatic.channels[0].filters[0].gain, -automatic.channels[1].filters[0].gain);

const highShelf = { type: "HSC", hz: 19900, gain: 12, q: 0.707106 };
const boost = { filters: [highShelf], preamp: -1 };
const boosted = build("equalizerapo", "both", { fit: { ...fit, ...boost } });
const protectedChannels = apoChannels(boosted.files[0].text);
assert.ok(boosted.attenuationDb > 5);
assert.ok(exportPeakDb(undefined, protectedChannels) <= -0.5 + 1e-8);
equal(protectedChannels[0].preampDb - protectedChannels[1].preampDb, match.channels[0].preampDb - match.channels[1].preampDb);

const mainThirty = { ...fit, filters: Array.from({ length: 30 }, (_, i) => pk(80 + i * 60, -1, 0.9)), bands: 30 };
const macThirty = build("soundsource", "main", { fit: mainThirty }).files[0].text;
assert.ok(macThirty.startsWith("Preamp: "));
assert.equal(macThirty.split("\n").filter(line => line.startsWith("Filter ")).length, 30);
assert.match(build("soundsource", "main").files[0].text, / ON LS Fc 62 Hz/);
assert.match(build("soundsource", "main", { fit: { ...fit, filters: [highShelf], preamp: -15 } }).files[0].text, / ON HS Fc 19900 Hz/);

const qudelix = build("qudelix", "both");
assert.equal(qudelix.files.length, 2);
assert.match(qudelix.files[1].text, /Channel: L\r\nPreamp: -2\.6 dB/);
assert.match(qudelix.files[1].text, /Channel: R\r\nPreamp: -1\.6 dB/);
assert.equal(qudelix.files[1].text.match(/Filter \d+:/g).length, 20);
assert.match(qudelix.files[0].text, /Fc 120 Hz Gain 2\.7 dB Q 0\.91015625/);
assert.throws(() => build("qudelix", "both", { fit: mainThirty }), /10 Main EQ/);
assert.throws(() => build("qudelix", "both", { fit: mainThirty, model: "5k-plus" }), /28 Main EQ/);
assert.equal(build("qudelix", "main", { fit: mainThirty, model: "5k-plus" }).files[0].text.match(/Filter \d+: ON/g).length, 30);
const layered = build("qudelix", "both", { fit: { ...mainThirty, filters: mainThirty.filters.slice(0, 12) }, model: "5k-plus" });
assert.equal(layered.files[0].text.match(/Filter \d+: ON/g).length, 10);
assert.equal(layered.files[1].text.match(/Filter \d+: ON/g).length, 7);
assert.match(layered.files[1].text, /CH: 0\r\nPreamp: -2\.6 dB/);
assert.match(layered.files[1].text, /CH: 1\r\nPreamp: -1\.6 dB/);
assert.equal(platformEqIssue({ ...settings, contents: "match", destination: "qudelix", mainLimit: 1 }), undefined);

if (process.argv[2]) {
  mkdirSync(process.argv[2], { recursive: true });
  for (const contents of ["main", "match", "both"]) {
    for (const destination of ["equalizerapo", "easy-effects-json", "qudelix"]) {
      for (const file of build(destination, contents).files) writeFileSync(resolve(process.argv[2], file.filename), file.text);
    }
    for (const file of build("qudelix", contents, { model: "5k-plus" }).files) {
      writeFileSync(resolve(process.argv[2], file.filename), file.text);
    }
  }
  const mac = build("soundsource", "main", { fit: mainThirty }).files[0];
  writeFileSync(resolve(process.argv[2], mac.filename.replace("-soundsource.txt", "-30band-soundsource.txt")), mac.text);
  const macShelf = build("soundsource", "main").files[0];
  writeFileSync(resolve(process.argv[2], macShelf.filename), macShelf.text);
}
console.log("PASS platform EQ export structure, routing, preamps, headroom, and Qudelix layouts on asymmetric fixtures");
