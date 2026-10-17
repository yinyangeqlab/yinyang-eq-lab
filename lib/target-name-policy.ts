export type NameFlag = { category: "profanity" | "sexual" | "slur"; rule: string; form: "word" | "disguised" | "masked" };
export type NameScreen = { blocked: boolean; flags: NameFlag[] };

// This is deliberately a word-level screen. Substring matching would reject
// legitimate audio names such as Bass, Class A, Cockpit and Scunthorpe.
const groups = {
  profanity: [
    "ass", "arse", "asshole", "arsehole", "asshat", "jackass", "dumbass", "smartass", "badass",
    "bastard", "bitch", "bollocks", "bloody", "bugger", "bullshit", "crap", "damn", "dammit",
    "douche", "douchebag", "fuck", "fucker", "fuckhead", "fuckface", "motherfucker", "goddamn",
    "hell", "horseshit", "piss", "prick", "shit", "shithead", "shitface", "shitty", "twat",
    "wank", "wanker", "tosser", "jackoff", "jerkoff",
    "cabron", "chingada", "chingado", "chingar", "cojones", "cono", "culero", "joder",
    "mierda", "pendejo", "puta", "puto", "verga", "malparido", "gilipollas",
    "arschloch", "fotze", "hurensohn", "scheisse", "scheiss", "wichser",
    "connard", "encule", "merde", "putain", "salope", "stronzo", "cazzo", "vaffanculo",
    "kurwa", "pierdol", "blyat", "suka",
  ],
  sexual: [
    "boobs", "cock", "cockhead", "cum", "cumming", "dick", "dickhead", "dildo", "fap",
    "handjob", "blowjob", "jizz", "nude", "nudes", "porn", "porno", "pornographic",
    "pussy", "rape", "rapist", "rimjob", "sex", "sexy", "slut", "skank", "tits", "titty", "whore",
  ],
  slur: [
    "chink", "coon", "dyke", "fag", "faggot", "gook", "jap", "kike", "nigga", "nigger",
    "paki", "raghead", "retard", "spic", "tranny", "towelhead", "wetback",
  ],
} as const;

const inflections: [RegExp, NameFlag["category"], string][] = [
  [/^fuck(?:s|ed|ing|er|ers|ers?|head|face|wit|off|up)?$/, "profanity", "fuck"],
  [/^shit(?:s|ted|ting|ty|tier|tiest|head|heads|storm|show)?$/, "profanity", "shit"],
  [/^bitch(?:es|ed|ing|y|ier|iest)?$/, "profanity", "bitch"],
  [/^cunt(?:s|y)?$/, "profanity", "cunt"],
  [/^asshole(?:s)?$/, "profanity", "asshole"],
  [/^dick(?:s|head|heads)?$/, "sexual", "dick"],
  [/^piss(?:es|ed|ing|y)?$/, "profanity", "piss"],
  [/^whore(?:s|ish)?$/, "sexual", "whore"],
  [/^slut(?:s|ty|tier|tiest)?$/, "sexual", "slut"],
];

const map: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g",
  "@": "a", "$": "s", "!": "i", "+": "t", "€": "e", "£": "l",
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i", "ј": "j",
  "α": "a", "ο": "o", "ρ": "p", "ι": "i", "χ": "x", "κ": "k", "ν": "v",
};

const dictionary = new Map<string, NameFlag["category"]>();
for (const [category, words] of Object.entries(groups) as [NameFlag["category"], readonly string[]][]) {
  for (const word of words) dictionary.set(word, category);
}

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase().normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, "")
    .replace(/./gu, char => map[char] ?? char);
}

function findWord(value: string): { category: NameFlag["category"]; rule: string } | null {
  const direct = dictionary.get(value);
  if (direct) return { category: direct, rule: value };
  for (const [pattern, category, rule] of inflections) if (pattern.test(value)) return { category, rule };
  if (value.includes("fuck")) return { category: "profanity", rule: "fuck compound" };
  if (/nigg(?:er|a)|faggot/.test(value)) return { category: "slur", rule: "slur compound" };
  return null;
}

const masked: [RegExp, NameFlag["category"], string][] = [
  [/(?:^|[^a-z0-9])f[*_?@#.]+ck(?:$|[^a-z0-9])/, "profanity", "masked fuck"],
  [/(?:^|[^a-z0-9])sh[*_?@#.]+t(?:$|[^a-z0-9])/, "profanity", "masked shit"],
  [/(?:^|[^a-z0-9])b[*_?@#.]+tch(?:$|[^a-z0-9])/, "profanity", "masked bitch"],
  [/(?:^|[^a-z0-9])c[*_?@#.]+nt(?:$|[^a-z0-9])/, "profanity", "masked cunt"],
  [/(?:^|[^a-z0-9])d[*_?@#.]+ck(?:$|[^a-z0-9])/, "sexual", "masked dick"],
];

export function screenTargetName(input: string): NameScreen {
  const original = input.trim();
  if (!original) return { blocked: false, flags: [] };
  const raw = original.normalize("NFKC").toLowerCase();
  const normalized = normalize(original);
  const plainTokens = new Set(original.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const flags: NameFlag[] = [];
  const seen = new Set<string>();
  const add = (flag: NameFlag) => { const key = `${flag.category}:${flag.rule}:${flag.form}`; if (!seen.has(key)) { seen.add(key); flags.push(flag); } };
  for (const token of normalized.match(/[a-z0-9]+/g) ?? []) {
    const collapsed = token.replace(/([a-z])\1{2,}/g, "$1");
    const match = findWord(collapsed);
    if (match) add({ ...match, form: collapsed === token && plainTokens.has(token) ? "word" : "disguised" });
  }
  // Separated letters, e.g. f.u.c.k or f u c k. Only complete words are joined.
  for (const run of normalized.matchAll(/(?:^|[^a-z0-9])(?:[a-z][^a-z0-9]{1,3}){2,}[a-z](?=$|[^a-z0-9])/g)) {
    const joined = run[0].replace(/[^a-z]/g, "");
    const match = findWord(joined);
    if (match) add({ ...match, form: "disguised" });
  }
  for (const [pattern, category, rule] of masked) if (pattern.test(raw) || pattern.test(normalized)) add({ category, rule, form: "masked" });
  return { blocked: flags.length > 0, flags };
}
