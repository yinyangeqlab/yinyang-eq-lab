import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const mod = { exports: {} };
const source = readFileSync("lib/glossary.ts", "utf8");
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { module: mod, exports: mod.exports });
const { glossaryTerms, searchGlossary } = mod.exports;
const ids = query => Array.from(searchGlossary(query), term => term.id);
assert.equal(glossaryTerms.length, 12);
assert.deepEqual(Array.from(glossaryTerms, term => term.title), Array.from(glossaryTerms, term => term.title).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
assert.equal(new Set(ids("")).size, 12, "blank search shows every term once");
assert.deepEqual(ids("bass"), ["eq", "frequency-response", "target"], "related words find multiple useful definitions");
assert.ok(ids("volume").includes("lufs"), "a plain word finds an abbreviation");
assert.ok(ids("variable bitrate").includes("bitrate"), "full acronym expansions are searchable");
assert.ok(ids("48 kHz").includes("sample-rate"), "a sample-rate example finds its definition");
assert.ok(ids("fit seal").includes("measurement"), "all query words can match a definition");
assert.ok(ids("EQUALIZER").includes("preset"), "search ignores letter case");
assert.ok(ids("  EQ / equalization  ").includes("eq"), "suggestion labels are valid queries");
assert.deepEqual(ids("no-such-term-xyz"), [], "unmatched query returns no false success");
assert.equal(searchGlossary(" ").length, 12);
console.log("PASS: alphabetical, complete glossary results; titles, definitions, aliases, multiple words and empty/no-result queries.");

const { audioFacts, audioFactPath, audioFactTopics, audioFactSources, audioFactSourceIds, findAudioFact } = await import("../lib/audio-facts.mjs");
const { audioFactCards, formatAudioFactForDiscord } = await import("../lib/audio-fact-tools.mjs");
const { searchAudioFacts } = await import("../lib/audio-fact-search.mjs");
const { SITE_ORIGIN, sharePageFor, shareMetadataFields, previewTitle } = await import("../lib/share-pages.mjs");
const first = query => searchAudioFacts(audioFactCards, query)[0]?.slug;
for (const [query, slug] of [
  ["Why does a poor seal reduce bass?", "iem-seal-and-bass"],
  ["Do all people like Harman?", "harman-target"],
  ["What's the difference between LUFS and dB SPL?", "lufs-vs-peak-level"],
  ["Is higher bitrate always better?", "bitrate-and-lossless"],
  ["Fletcher–Munson", "equal-loudness-curves"],
  ["Can I hear a difference between high resolution and CD quality?", "high-resolution-audio"],
  ["What does ABX prove?", "blind-tests"],
  ["Q bandwidth", "eq-q-and-gain"],
]) assert.equal(first(query), slug, query);
assert.deepEqual(searchAudioFacts(audioFactCards, "nonexistent xylophone"), []);
assert.ok(searchAudioFacts(audioFactCards, "", "Digital audio").every(card => card.topic === "Digital audio"));
assert.deepEqual(searchAudioFacts(audioFactCards, "bitrate", "Headphones & targets"), []);
assert.equal(new Set(audioFacts.map(fact => fact.slug)).size, audioFacts.length);
for (const fact of audioFacts) {
  assert.match(fact.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(audioFactTopics.includes(fact.topic));
  for (const entry of fact.evidence) {
    assert.ok(entry.sources.length > 0 && entry.sources.every(id => Object.hasOwn(audioFactSources, id)), fact.slug);
  }
  assert.ok(fact.related.every(slug => slug !== fact.slug && findAudioFact(slug)), fact.slug);
  const path = audioFactPath(fact.slug);
  const url = SITE_ORIGIN + path;
  const message = formatAudioFactForDiscord(fact, url);
  assert.ok(message.length <= 2000, `${fact.slug}: ${message.length} exceeds standard Discord message length`);
  assert.ok([fact.claim, fact.answer, fact.takeaway, url, ...fact.evidence.map(item => item.text)].every(text => message.includes(text)));
  for (const id of audioFactSourceIds(fact)) assert.ok(message.includes(audioFactSources[id].url), fact.slug);
  assert.equal(previewTitle(sharePageFor(path)), fact.title);
  assert.equal(sharePageFor(path).description, fact.answer);
  const metadata = shareMetadataFields(path);
  assert.equal(metadata.alternates.canonical, path);
  assert.equal(metadata.robots, undefined);
}
console.log("PASS: Audio Fact Checks natural-language queries, topic filters, citations, canonical previews and complete single-message Discord text.");
