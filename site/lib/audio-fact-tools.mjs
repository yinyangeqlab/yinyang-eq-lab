import { audioFacts, audioFactPath, audioFactSources, audioFactSourceIds } from "./audio-facts.mjs";

export const audioFactCards = audioFacts.map(fact => ({
  slug: fact.slug, href: audioFactPath(fact.slug), title: fact.title, answer: fact.answer, verdict: fact.verdict,
  topic: fact.topic, claim: fact.claim, aliases: fact.aliases,
  context: fact.evidence.map(item => item.text).concat(fact.takeaway, audioFactSourceIds(fact).map(id => audioFactSources[id].title)).join(" "),
}));

/** @param {import("./audio-facts.mjs").AudioFact} fact @param {string} url */
export function formatAudioFactForDiscord(fact, url) {
  const sources = audioFactSourceIds(fact);
  const paragraphs = fact.evidence.map(item => {
    const refs = item.sources.map(id => sources.indexOf(id) + 1);
    return `${item.text} [${refs.join(", ")}]`;
  });
  const references = sources.map((id, index) => {
    const { label, title, url: sourceUrl } = audioFactSources[id];
    return `[${index + 1}] ${label} — ${title} <${sourceUrl}>`;
  });
  return [
    `**${fact.title}**\n**Claim:** ${fact.claim}\n**${fact.verdict}:** ${fact.answer}`,
    ...paragraphs,
    `**Takeaway:** ${fact.takeaway}`,
    `**Sources**\n${references.join("\n")}`,
    url,
  ].join("\n\n");
}
