// Strip the words that normally turn a term into a question. Keep domain terms
// (including single-letter Q) and use prefix matching for simple inflections.
const filler = new Set("a all always an and are as at actually be better between can could difference do does for from have how i in is it like many me mean more must my need of on or people really should so than that the their there they this to use was what when where which who why will with would you your".split(" "));
const normalize = (/** @type {string} */ value) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const words = (/** @type {string} */ value) => normalize(value).split(" ").filter(word => word && !filler.has(word));

/** @param {typeof import("./audio-fact-tools.mjs").audioFactCards} cards @param {string} query @param {string} topic */
export function searchAudioFacts(cards, query, topic = "") {
  const candidates = topic ? cards.filter(card => card.topic === topic) : cards;
  const text = normalize(query);
  if (!text) return candidates;
  const terms = [...new Set(words(query))];
  if (!terms.length) return [];
  return candidates.map(card => {
    const heading = normalize(card.title + " " + card.claim);
    const tags = card.aliases.map(normalize);
    const main = new Set(words([card.title, card.claim, ...card.aliases].join(" ")));
    const background = new Set(words([card.answer, card.context, card.topic, card.verdict].join(" ")));
    const matched = terms.map(term => {
      if (main.has(term)) return 6;
      if (term.length >= 3 && [...main].some(word => word.startsWith(term))) return 4;
      if (background.has(term)) return 2;
      if (term.length >= 4 && [...background].some(word => word.startsWith(term))) return 1;
      return 0;
    });
    const phraseBoost = terms.length > 1 && (heading.includes(text) || tags.some(alias => alias.includes(text))) ? 10 : 0;
    return { card, count: matched.filter(Boolean).length, score: matched.reduce((a, b) => a + b, phraseBoost) };
  }).filter(result => result.count >= Math.ceil(terms.length * 0.65) && result.score >= 1)
    .sort((a, b) => b.score - a.score).map(result => result.card);
}
