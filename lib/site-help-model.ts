import { siteHelpWeights } from "./site-help-weights";
import { helpTopics } from "./site-help-guide";

export const SITE_HELP_MODEL_PATH = "/vendor/site-help/potion-2m-int4-v1.bin";
const ROWS = 29528;
const DIMENSIONS = 64;
const WEIGHT_OFFSET = 16 + ROWS * 4;
const WORD_OFFSET = WEIGHT_OFFSET + ROWS * DIMENSIONS / 2;
export const SITE_HELP_MODEL_BYTES = WORD_OFFSET + 219689;

function dot(a: Float32Array, b: Float32Array | Int8Array) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function normalize(values: Float32Array) {
  const length = Math.sqrt(dot(values, values));
  return length ? values.map(value => value / length) : values;
}

export function createSiteHelpEncoder(bytes: ArrayBuffer) {
  const header = new DataView(bytes);
  if (bytes.byteLength !== SITE_HELP_MODEL_BYTES || header.getUint32(0) !== 0x53484d32 ||
      header.getUint32(4, true) !== ROWS || header.getUint32(8, true) !== DIMENSIONS ||
      header.getUint32(12, true) !== bytes.byteLength - WORD_OFFSET) throw Error("Invalid site help model");

  const scales = Float32Array.from({ length: ROWS }, (_, i) => header.getFloat32(16 + 4 * i, true));
  if (scales.some(value => !Number.isFinite(value) || value <= 0)) throw Error("Invalid site help model scales");
  const weights = new Uint8Array(bytes, WEIGHT_OFFSET, ROWS * DIMENSIONS / 2);
  const words = new TextDecoder("utf-8", { fatal: true }).decode(bytes.slice(WORD_OFFSET)).split("\n");
  if (words.length !== ROWS) throw Error("Invalid site help model vocabulary");
  const vocab = new Map(words.map((word, index) => [word, index] as const));

  return (text: string) => {
    const result = new Float32Array(DIMENSIONS);
    const tokens = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
      .match(/[\p{L}\p{N}]+|[^\p{L}\p{N}\p{Z}\s\p{C}]/gu) ?? [];
    for (const word of tokens) {
      if (word.length > 100) continue;
      const pieces: number[] = [];
      let start = 0;
      while (start < word.length) {
        let end = word.length;
        let id: number | undefined;
        while (end > start) {
          id = vocab.get((start ? "##" : "") + word.slice(start, end));
          if (id !== undefined) break;
          end--;
        }
        if (id === undefined) break;
        pieces.push(id);
        start = end;
      }
      if (start !== word.length) continue;
      for (const id of pieces) {
        for (let i = 0; i < DIMENSIONS; i += 2) {
          const packed = weights[(id * DIMENSIONS + i) / 2];
          result[i] += ((packed & 15) - 8) * scales[id];
          result[i + 1] += ((packed >> 4) - 8) * scales[id];
        }
      }
    }
    return normalize(result);
  };
}

function route(path: string) {
  return path.split("?", 1)[0];
}

// Common out-of-scope intents compete with guide topics, so similar words
// such as “account,” “download,” or “headphones” do not force an answer.
const outOfScope = [
  "local weather forecast temperature rain",
  "recommend restaurants recipes food cooking",
  "exercise health medical advice medications",
  "write a song poem story or essay",
  "tell me a joke general knowledge or solve a math problem",
  "give me the answer to an arithmetic question such as two plus two",
  "write code execute a script or shell command",
  "explain source code developer implementation or API details",
  "show passwords API keys credentials or private user accounts",
  "suggest which headphones electronics to buy shopping and product recommendations",
  "credit cards credit score banking transfer money upload a bank statement",
  "cancel a paid subscription to another service or request a refund",
  "car vehicle maintenance driving repair battery",
  "book flights travel tickets hotels or reservations",
  "suggest music for an event wedding or party",
  "send an email text message or manage my calendar",
  "what is your name who are you",
  "identify the song playing right now who wrote it name the artist",
  "edit overwrite the original audio file or normalize it permanently",
  "change the volume on a television phone speaker car stereo or another app",
  "control someone else’s device or account on my behalf",
  "use my phone as a remote control for a computer or television",
];

export function createSiteHelpMatcher(bytes: ArrayBuffer) {
  const encode = createSiteHelpEncoder(bytes);
  const entries = helpTopics.map(topic => ({
    id: topic.id,
    href: topic.href,
    title: encode(topic.title),
    phrases: topic.terms.split(";").map(encode),
    description: encode(topic.steps.join(" ")),
  }));

  const negatives = outOfScope.map(encode);
  const trained = siteHelpWeights.map(([id, encoded]) => ({
    id,
    href: helpTopics.find(topic => topic.id === id)?.href,
    weights: Int8Array.from(atob(encoded), char => char.charCodeAt(0)),
  }));

  return (question: string, context: string, fallback?: string) => {
    const query = encode(question.slice(0, 240));
    if (!query.some(Boolean)) return fallback;
    const topicOnPage = (href: string | undefined) => href !== undefined && route(href) === route(context);
    const outsideSimilarity = Math.max(...negatives.map(vector => dot(query, vector)));
    const corePage = ["/shootout/personal", "/preference-tuning", "/my-data"].includes(route(context));
    if (corePage) {
      const scores = trained.map(({ id, href, weights }) => ({
        id, score: (dot(query, weights) + weights[DIMENSIONS]) / 16 + (topicOnPage(href) ? 0.45 : 0),
      })).sort((a, b) => b.score - a.score);
      const [best, next] = scores;
      const outside = scores.find(row => row.id === "")!.score;
      const isSupported = best.id && best.id !== "delete-all" && best.score >= 0.9 && best.score - outside >= 0.35;
      const margin = fallback && fallback !== best.id ? 1.35 : 0.42;
      if (isSupported && best.score - next.score >= margin && outsideSimilarity < 0.73) return best.id;
    }
    if (fallback) return fallback;
    const ranked = entries.map(({ id, href, title, phrases, description }) => {
      const similarity = Math.max(dot(query, title), ...phrases.map(vector => dot(query, vector)));
      const score = similarity * 0.72 + dot(query, title) * 0.15 + dot(query, description) * 0.13;
      const contextBonus = href === context ? 0.045 : route(href) === route(context) ? 0.022 : 0;
      return { id, score: score + contextBonus, scoreWithoutContext: score, samePage: route(href) === route(context) };
    }).sort((a, b) => b.score - a.score);

    const [best, second] = ranked;
    if (best.scoreWithoutContext < (best.samePage ? 0.49 : 0.58) || best.scoreWithoutContext - outsideSimilarity < 0.035 ||
        best.score - second.score < 0.035) return undefined;
    return best.id;
  };
}
