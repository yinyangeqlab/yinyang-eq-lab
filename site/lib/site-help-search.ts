import { helpTopics, type HelpTopic } from "./site-help-guide";

export const HELP_QUESTION_LIMIT = 240;

const stopWords = new Set("a about am an and are as at be by can could did do does for from get have how i in is it lets me my of on or please see should show support tell that the this to use want was what when where which why will with would you your".split(" "));
const aliases: Record<string, string> = {
  ab: "compare", comparison: "compare", comparing: "compare", equalizer: "eq", equalization: "eq", peq: "eq",
  normalise: "normalization", normalize: "normalization", normalisation: "normalization", normalized: "normalization",
  normalizing: "normalization", lufs: "loudness", louder: "loudness", download: "export", downloading: "export",
  greyed: "disabled", grayed: "disabled", locked: "disabled", voting: "vote", hear: "listen", listening: "listen",
  button: "control", look: "view", locate: "view", view: "view", launch: "start", begin: "start", cant: "cannot", remove: "delete", erase: "delete",
};

function words(text: string): string[] {
  return (text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "")
    .replace(/\ba\s*[/–-]\s*b\b/g, "ab").match(/[a-z0-9]+/g) ?? []).flatMap(word => {
    if (stopWords.has(word)) return [];
    const singular = word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
    return [Object.hasOwn(aliases, word) ? aliases[word] : Object.hasOwn(aliases, singular) ? aliases[singular] : singular];
  });
}

const index = helpTopics.map(topic => {
  const title = words(topic.title);
  const phrases = [title, ...topic.terms.split(";").map(words)];
  return { topic, phrases, terms: new Set(phrases.flat()), title: new Set(title) };
});

const explicitPages = [
  [/\b(?:personal tournament|personal shootout)\b/i, "/shootout/personal"],
  [/\b(?:preference tuning|tuning lab|in tuning)\b/i, "/preference-tuning"],
  [/\b(?:my data|data choices)\b/i, "/my-data"],
  [/\b(?:blind eq comparison|blind eq|eq comparison)\b/i, "/eq-compare"],
  [/\b(?:listening pool|music library)\b/i, "/music-library"],
  [/\bopen comparison\b/i, "/shootout?mode=open"],
  [/\bblind research\b/i, "/shootout?mode=blind"],
] as const;

const wordsInTopics = new Map<string, number>();
for (const entry of index) {
  for (const term of entry.terms) wordsInTopics.set(term, (wordsInTopics.get(term) ?? 0) + 1);
}

function near(word: string, term: string): boolean {
  if (Math.min(word.length, term.length) < 4 || Math.abs(word.length - term.length) > 1) return false;
  let offset = 0;
  while (offset < word.length && word[offset] === term[offset]) offset++;
  if (word.length === term.length) {
    return word.slice(offset + 1) === term.slice(offset + 1) ||
      word[offset] === term[offset + 1] && word[offset + 1] === term[offset] && word.slice(offset + 2) === term.slice(offset + 2);
  }
  return word.length > term.length
    ? word.slice(offset + 1) === term.slice(offset)
    : term.slice(offset + 1) === word.slice(offset);
}

// These describe distinct controls that share words like "volume", "save", and "response".
const contextualIntents = [
  ["/preference-tuning", "curve-export", /\b(?:download|export|csv|txt|file|save)\b/i, /\b(?:before[ -]and[ -]after|original|starting|adjusted|tuned|preference)\b/i, /\b(?:response|curve|target)\b/i],
  ["/preference-tuning", "curve-export", /\b(?:frequency|frequencies|hertz)\b/i, /\b(?:decibels?|spl|db)\b/i, /\b(?:modified|adjusted|tuned|preference)\b/i],
  ["/preference-tuning", "tune", /\b(?:bell|peaking|shelf|notch)\b/i, /\b(?:frequency|bandwidth|q|how wide)\b/i],
  ["/preference-tuning", "make-eq", /\b(?:peace|equalizer apo|easyeffects|qudelix)\b/i, /\b(?:send|export|download|file|import|onto|on|filters?|put)\b/i],
  ["/preference-tuning", "tuning-loop", /\b(?:loop(?:ing)?|repeat(?:ing|itive)?|replay|going around)\b/i, /\b(?:passage|chorus|section|part|verse|music|song|playback|track|seconds?)\b/i],
  ["/preference-tuning", "tuning-headphones", /\b(?:no|without|missing|don't have|do not have)\b/i, /\b(?:measurement|response file)\b/i, /\b(?:preset|eq)\b/i],
  ["/preference-tuning", "tuning-channels", /\b(?:stereo correction|channel matching|channel match|pans? to one side|left and right|one (?:side|ear) (?:is )?louder)\b/i],
  ["/preference-tuning", "snapshots", /\b(?:save|keep|store)\b/i, /\b(?:tweak|edits?|version|adjustments?)\b/i, /\b(?:later|another|hear|trying|compare)\b/i],
  ["/preference-tuning", "tuning-compare", /\b(?:flip|switch|listen|hear|compare|toggle|audition|check)\b/i, /\b(?:old|original|starting|before|baseline|unedited)\b/i, /\b(?:sound|equalization|eq|tuning|changes?|edits?|adjustments?|versions?)\b/i],
  ["/eq-compare", "blind-eq-loudness", /\b(?:loud(?:er|ness)?|volume|levels?|hotter|gain)\b/i, /\b(?:bias|fair|unfair|preset|win(?:s|ning)?|advantage)\b/i],
  ["/shootout/personal", "finalists", /\b(?:retest|recheck|check|try|against)\b/i, /\b(?:different|other|new)\b/i, /\b(?:songs?|tracks?|music)\b/i, /\b(?:favorites?|top|finalists?|contenders?|leading)\b/i],
  ["/shootout/personal", "resume", /\b(?:carry on|pick up|continue|finish)\b/i, /\b(?:half[ -]?way|where i left off|last night|earlier)\b/i],
  ["/shootout/personal", "resume", /\b(?:delete|erase|remove|clear)\b/i, /\b(?:saved test|saved run|tournament setup)\b/i],
  ["/shootout/personal", "resume", /\b(?:run|tournament|progress|bracket|session)\b/i, /\b(?:gone|lost|disappear\w*|missing)\b/i],
  ["/shootout/personal", "personal-privacy", /\b(?:choice|pick|vote|result)\b/i, /\b(?:ranking|rankings|leaderboard|worldwide|target order)\b/i],
  ["/shootout/personal", "resume", /\b(?:resume|continue|return|get back|pick up|recover)\b/i, /\b(?:run|tournament|progress|bracket|session)\b/i],
  ["/shootout/personal", "personal-results", /\b(?:runner[ -]?ups?|shortlist|standings|results)\b/i, /\b(?:first|ended|finished|find|show|where|after|see)\b/i],
  ["/shootout/personal", "personal-music", /\b(?:file|track|song|music|recording)\b/i, /\b(?:device|local|yesterday|reload(?:ed|ing)?|reopen(?:ed|ing)?)\b/i, /\b(?:empty|gone|missing|silent|disappear\w*|lost)\b/i],
  ["/shootout/personal", "pool", /\b(?:pool|targets?|curves?)\b/i, /\b(?:subset|shorter|smaller|handful|fewer)\b/i],
  ["/my-data", "retention", /\b(?:opt(?:ing)? out|withdraw\w*|(?:disabl\w*|stop\w*) (?:research )?sharing|turn(?:ing)? (?:it )?off)\b/i, /\b(?:sent|submitted|past|previous|old|earlier|already|last month)\b/i],
  ["/my-data", "retention", /\b(?:keep|kept|retain\w*|retention)\b/i, /\b(?:records?|data|info(?:rmation)?|submissions?)\b/i, /\b(?:how long|old|previous|earlier|former)\b/i],
  ["/my-data", "submissions", /\b(?:remove|delete|erase)\b/i, /\b(?:contribution|submission|submitted|record|vote)\b/i, /^(?!.*\b(?:all|every|everything)\b)/i],
  ["/my-data", "clear-browser", /\b(?:clear|wipe|erase|remove)\b/i, /\b(?:this computer|this device|this browser|this laptop)\b/i, /\b(?:others?|elsewhere|sync|account)\b/i],
  ["/my-data", "sharing", /\b(?:stop|disable|turn off|pause)\b/i, /\b(?:activity history|activity monitoring|activity log)\b/i],
  ["/my-data", "sharing", /\b(?:share|sharing)\b/i, /\b(?:song|track|music)\b/i, /\b(?:switch|setting|toggle|permission|control)\b/i],
  ["/my-data", "sharing", /\b(?:leave|opt out|quit|withdraw|stop|disable)\b/i, /\b(?:research|research program|participation|sharing|tracking)\b/i],
] as const;

function questionTopic(question: string, query: string[], context: string): string | undefined {
  const tokens = new Set(query);
  const intent = contextualIntents.find(([path, , ...signals]) => page(context) === path && signals.every(signal => signal.test(question)));
  if (page(context) === "/shootout/personal" && /\b(?:left|right)\b/i.test(question) &&
      /\b(?:stronger|louder|imbalance|match|balance)\b/i.test(question) &&
      /\b(?:ear|side|channel)\b/i.test(question)) return "personal-channels";
  if (/\b(?:bass|low[ -]end)\b/i.test(question) && /\b(?:vocals?|voices?|singing|lyrics)\b/i.test(question) &&
      /\b(?:drown\w*|buri\w*|bury\w*|overpower\w*|overwhelm\w*|mask\w*|muffl\w*|too (?:much|loud)|hard to hear|can[’']?t hear)\b/i.test(question)) {
    return "bass-masks-vocals";
  }
  if (/\b(?:treble|sibilan\w*|s and t sounds?|cymbals?)\b/i.test(question) && /\b(?:harsh|sharp|pierc\w*|hiss\w*|painful)\b/i.test(question)) return "treble-harsh";
  if (context === "/shootout?mode=open" && /\b(?:lufs|minus (?:fourteen|sixteen|eighteen)|[−-](?:14|16|18))\b/i.test(question) &&
      /\b(?:source|track|loudness|level)\b/i.test(question)) return "open-loudness";
  if (tokens.has("normalization") && !/\b(?:tv|television|spotify|car|youtube|forever|permanen\w*|overwrite)\b/i.test(question)) {
    const loudness = helpTopics.find(topic => topic.href === context && ["normalization", "tuning-loudness", "library-loudness", "open-loudness", "research-loudness", "blind-eq-loudness"].includes(topic.id));
    if (loudness) return loudness.id;
  }
  if (page(context) === "/preference-tuning" && !/\b(?:forever|permanen\w*|overwrite)\b/i.test(question) && /\b(?:loud(?:er|ness)?|volume|level)\b/i.test(question) &&
      /\b(?:edited|edits?|starting|original|your tuning|current sound|snapshot)\b/i.test(question) &&
      /\b(?:match\w*|equal(?:ly)?|difference|louder|same|as loud as)\b/i.test(question)) return "tuning-loudness";
  if (page(context) === "/preference-tuning" && /\b(?:export|download|save)\b/i.test(question) &&
      /\b(?:bands?|filters?)\b/i.test(question) && /\b(?:txt|text file|windows|preset)\b/i.test(question)) return "make-eq";
  if (intent) return intent[1];
  if (query.length === 1 && tokens.has("eq")) return "eq-support";
  if (tokens.has("compare") && tokens.has("eq") && tokens.has("target")) return "compare-options";
  if (/^\s*(?:what (?:is|are)\b|what does .+ mean\b)/i.test(question) && query.some(word => ["target", "preamp", "frequency", "loudness", "measurement"].includes(word))) return "glossary";
  if (tokens.has("measurement") && /\b(?:where|see|find|view|show)\b/i.test(question) && !/\b(?:upload|add|import|submitted|shared)\b/i.test(question) && !tokens.has("curve") && !tokens.has("response")) {
    if (page(context) === "/shootout/personal" && tokens.has("headphone") && !tokens.has("saved")) return "headphones";
    return "saved-measurements";
  }
}

function page(href: string): string {
  return href.split(/[?#]/, 1)[0].replace(/\/$/, "") || "/";
}

const suggestions: Record<string, string[]> = {
  "/shootout/personal": ["start", "normalization", "personal-results", "vote"],
  "/preference-tuning": ["target-picker", "tune", "tuning-compare", "make-eq"],
  "/my-data": ["sharing", "submissions", "clear-browser", "sync"],
  "/eq-compare": ["compare-eq", "blind-eq-loudness", "compare-targets"],
  "/music-library": ["library", "library-loudness", "saved-eqs"],
};

function topicsById(ids: readonly string[]) {
  return ids.flatMap(id => helpTopics.filter(topic => topic.id === id));
}

export function suggestedTopics(pathname: string) {
  const ids = suggestions[page(pathname)] ?? ["start", "eq-support", "compare-targets", "sharing"];
  return topicsById(ids);
}

export function normalizeHelpQuestion(input: string) {
  return input.slice(0, HELP_QUESTION_LIMIT).normalize("NFKC").replace(/\p{Cf}/gu, "").replace(/\s+/gu, " ").trim().slice(0, HELP_QUESTION_LIMIT);
}

export function acceptsSiteHelpQuestion(input: string) {
  const question = normalizeHelpQuestion(input);
  return !/[<>]/.test(question) &&
    !/\b(?:change|set|register|cast|submit|make|switch)\b.{0,40}\b(?:my )?(?:pick|choice|selection|vote|preference)\b.{0,30}\b(?:automatically|by itself|for me|on my behalf)\b/i.test(question) &&
    !/\b(?:change|set|turn|enable|disable|update)\b.{0,35}\b(?:somebody|someone|anyone) else[’']s\b/i.test(question) &&
    !/\b(?:private (?:information|data|results?|records?) belonging to|what did (?:the )?(?:site )?owner (?:choose|vote|pick)|what time does (?:the |a )?(?:bus|train|flight)|(?:what is|answer to) \d+ (?:plus|minus|times|divided by) \d+)\b/i.test(question) &&
    !/\b(?:log[ -]?in|sign[ -]?in|impersonate)\b.{0,26}\b(?:as |using )(?:my |another |a different )?(?:friend|member|user|listener|participant|someone|somebody)\b/i.test(question) &&
    !/\b(?:my (?:car|tv|television)|(?:refund|cancel)\b.{0,45}\bsubscription|SQL query|recipe|stock price|write\b.{0,18}\b(?:story|poem))\b/i.test(question) &&
    !/\b(?:localStorage|sessionStorage|owner[’\']s (?:sign[ -]in|login) code|bypass (?:the )?(?:access|gate|sign[ -]in)|rig (?:the )?(?:vote|rank|research)|tester[’\']s vote|choose (?:number|option|prefer)\b.{0,35}\b(?:automatically|explain|unit test)|pick (?:sample )?[ab] for me|someone else[’']s email|somebody else[’']s email|without opening anything)\b/i.test(question) &&
    !/\b(?:api[ _-]?keys?|secret(?:s| keys?)?|credentials?|passwords?|admin(?:istrator)? (?:access|panel|token|account)|session[ _-]?(?:tokens?|ids?)|auth[ _-]?tokens?|cookies?|system (?:prompt|message)|private keys?|user database|environment variables?|\.env|prompt injection|jailbreak|developer message|(?:ignore|override|forget|disregard)\b.{0,48}\b(?:instructions?|rules?|prompt|guide)|pretend (?:you are|to be)|reveal (?:your|the) instructions|run (?:this|a|the) (?:code|command|script)|(?:write(?: me)?|give me) (?:a |some |the )?(?:poem|story|code|script)|(?:for me|without (?:my )?(?:permission|confirmation)|automatically)\b.{0,40}\b(?:delete|erase|wipe|submit|vote|sign in)|(?:delete|erase|wipe|submit|vote|change)\b.{0,48}\b(?:for me|on my behalf|without (?:my )?(?:permission|confirmation))|(?:another|other|a different) (?:user|listener|person|participant|member)(?:[’']s)? (?:private )?(?:account|results?|records?|data))\b/i.test(question) &&
    !/(?:https?:\/\/|javascript\s*:|data\s*:\s*text|\/api\/|\b(?:admin|assistant|system|developer)\s*:)/i.test(question);
}

// Search only approved entries. Input is never used as an action, selector, or reply.
export function canShowHelpTopic(topic: HelpTopic, question: string) {
  if (topic.id !== "delete-all") return true;
  return /\b(?:delete|erase|close|wipe|remove|forget)\b/i.test(question) &&
    /\b(?:all|everything|my account|linked|server records|forget me)\b/i.test(question) &&
    !/\b(?:intact|keep|only|single|one)\b/i.test(question);
}

const followUps = [
  {
    id: "tournament-setup", page: "/shootout/personal",
    question: "Are you trying to start a new tournament or get back to one you already began?",
    matches: /^(?:how (?:do|can) i |can you |please )?(?:help me (?:with |get into )?)?(?:get (?:back )?into|set up|access|open|use|help with) (?:my |the |a )?(?:personal )?(?:bracket|tournament)[?.!]*$/i,
    choices: [["start", /\b(?:new|first|start|setup|set up|from scratch)\b/i], ["resume", /\b(?:old|existing|resume|already|earlier|left off|current|unfinished)\b/i]],
  },
  {
    id: "tuning-export", page: "/preference-tuning",
    question: "Do you want EQ settings you can load into a player, or the points of the curve for a graph?",
    matches: /\b(?:export|download|save)\b.{0,30}\b(?:this|my) (?:tuning|work|adjustments?)\b/i,
    choices: [["make-eq", /\b(?:filter|filters|preset|eq|equalizer|player|peace|qudelix)\b/i], ["curve-export", /\b(?:points|curve|graph|plot|spreadsheet|csv)\b/i]],
  },
  {
    id: "tuning-comparison", page: "/preference-tuning",
    question: "Do you want to hear the starting sound again, or compare versions you saved?",
    matches: /^(?:how (?:can|do) i |can i |i want to )?(?:compare|switch between) (?:these|the|my|two|both) (?:sounds?|versions?|edits?|tunings?|settings?)[?.!]*$/i,
    choices: [["tuning-compare", /\b(?:original|starting|before|baseline|unedited)\b/i], ["snapshots", /\b(?:snapshot|snapshots|saved|slots?|versions?)\b/i]],
  },
  {
    id: "data-location", page: "/my-data",
    question: "Do you mean listening results, data you submitted, or what you’ve chosen to share?",
    matches: /\b(?:where|show|find|see|view)\b.{0,35}\b(?:my |saved )(?:data|record|result|history|information)s?\b/i,
    choices: [["collection", /\b(?:results?|listening|history|trials?|comparisons?)\b/i], ["submissions", /\b(?:research|submitted|submissions?|contributed|sent|uploaded)\b/i], ["sharing", /\b(?:share|sharing|consent|permissions?|privacy|future)\b/i]],
  },
  {
    id: "data-sharing", page: "/my-data",
    question: "Do you want to stop sharing going forward, or remove a record you already submitted?",
    matches: /\b(?:stop|change|remove|turn off)\b.{0,25}\b(?:research|sharing)\b.{0,30}\b(?:and|or)\b.{0,25}\b(?:past|old|submitted|delete|remove)\b/i,
    choices: [["sharing", /\b(?:future|going forward|stop sharing|new|turn off|permissions?)\b/i], ["submissions", /\b(?:submitted|past|existing|old|delete|remove|record)\b/i]],
  },
] as const;

type FollowUpId = (typeof followUps)[number]["id"];

const relatedFollowUps: Record<string, FollowUpId> = {
  start: "tournament-setup", resume: "tournament-setup",
  "tuning-compare": "tuning-comparison", snapshots: "tuning-comparison",
  "make-eq": "tuning-export", "curve-export": "tuning-export",
  sharing: "data-sharing", submissions: "data-sharing", collection: "data-location",
};

function followUpForTopic(topic: HelpTopic | undefined): FollowUpId | undefined {
  return topic ? relatedFollowUps[topic.id] : undefined;
}

export function searchSiteHelp(input: string, pathname: string, pending?: FollowUpId, lastTopic?: HelpTopic): {
  answer: HelpTopic | undefined;
  related: readonly HelpTopic[];
  tryModel: boolean;
  context: string;
  clarification?: string;
  followUp?: FollowUpId;
} {
  const question = normalizeHelpQuestion(input);
  const query = [...new Set(words(question.replace(/\b(?:damn|hell|fuck(?:ing)?|shit|heck|goddamn)\b/gi, "")))].slice(0, 18);
  const context = explicitPages.find(([pattern]) => pattern.test(question))?.[1] ?? pathname;
  const miss = { answer: undefined, related: suggestedTopics(pathname), tryModel: false, context };
  if (!acceptsSiteHelpQuestion(question) || query.some(word => /(\w)\1{5,}/.test(word))) return miss;
  if (/\b(?:song|track|recording)\b/i.test(question) && /\bwho (?:wrote|sings?|made|composed|recorded)\b/i.test(question)) {
    return { ...miss, clarification: "To look up song credits, open Details & credits on the recording in the Listening Pool.", related: topicsById(["library"]) };
  }
  if (/\b(?:recording|audio file|source audio|track)\b/i.test(question) && /\b(?:normaliz\w*|volume|loudness)\b/i.test(question) &&
      /\b(?:forever|permanen\w*|overwrite|rewrite|save the (?:new )?(?:level|volume))\b/i.test(question)) {
    return { ...miss, clarification: "The site adjusts loudness during playback. To change the original audio file, use an audio editor.", related: [] };
  }
  if (/\bhow did i (?:vote|answer|choose|rate)\b/i.test(question)) {
    return { ...miss, clarification: "To review choices you’ve saved, open My Collection. For linked research submissions, check Your submitted data.",
      related: topicsById(["collection", "submissions"]) };
  }
  if (!pending && lastTopic && canShowHelpTopic(lastTopic, question) &&
      /^(?:where (?:is|do i find) (?:that|it)|(?:can you )?show me (?:that|it)|how do i get there)[?.!]*$/i.test(question)) {
    return { ...miss, answer: lastTopic, related: [] };
  }
  const ongoing = followUps.find(item => item.id === pending ||
    (!pending && item.id === followUpForTopic(lastTopic) && /^(?:what about|and|instead|the (?:other|old|new|original|starting))\b/i.test(question)));
  if (ongoing && query.length <= 6) {
    const matches = ongoing.choices.filter(([, pattern]) => pattern.test(question));
    if (matches.length === 1) return { ...miss, answer: topicsById([matches[0][0]])[0], related: [] };
    if (/^(?:(?:the )?(?:first|second|third) one|(?:yes|no|both|either|that one))[?.!]*$/i.test(question)) {
      const ordinal = /\b(first|second|third)\b/i.exec(question)?.[1].toLowerCase();
      const selected = ordinal ? ongoing.choices[["first", "second", "third"].indexOf(ordinal)] : undefined;
      if (selected) return { ...miss, answer: topicsById([selected[0]])[0], related: [] };
      return { ...miss, followUp: ongoing.id, clarification: ongoing.question, related: topicsById(ongoing.choices.map(([id]) => id)) };
    }
  }
  const ambiguous = followUps.find(item => item.page === page(context) && item.matches.test(question) &&
    (item.id !== "data-location" || !/\b(?:export|delete|erase|remove|research|submitted|activity|recorded|browser|account|sharing|sync|trials?|measurements?|comparisons?|older)\b/i.test(question)) &&
    (item.id !== "tuning-export" || !/\b(?:filter|filters|preset|eq|curve|csv|points|graph)\b/i.test(question)));
  if (ambiguous) return { ...miss, followUp: ambiguous.id, clarification: ambiguous.question, related: topicsById(ambiguous.choices.map(([id]) => id)) };
  if (!query.length) return miss;
  const primary = questionTopic(question, query, context);
  if (primary) return {
    ...miss, answer: helpTopics.find(topic => topic.id === primary),
    related: primary === "compare-options" ? topicsById(["compare-targets", "compare-eq"]) : [],
  };
  const found = index.map(({ topic, phrases, terms, title }) => {
    const matched = query.filter(word => terms.has(word));
    const fuzzy = query.filter(word => !wordsInTopics.has(word) && [...terms].some(term => near(word, term)));
    const weight = (word: string) => 1 + 2 / (wordsInTopics.get(word) ?? 1);
    const overlap = matched.reduce((score, word) => score + weight(word) + (title.has(word) ? 0.45 : 0), 0);
    const phrase = Math.max(...phrases.map(phrase => {
      const distinct = [...new Set(phrase)];
      return distinct.length > 1 && distinct.every(word => matched.includes(word)) ? Math.min(8, distinct.length * 2) : 0;
    }));
    const amount = matched.length + fuzzy.length * 0.65;
    const score = overlap + fuzzy.length * 1.5 + phrase + (topic.href === context ? 1.6 : page(topic.href) === page(context) ? 0.8 : 0);
    return { topic, amount, score };
  }).filter(row => row.amount > 0 && canShowHelpTopic(row.topic, question)).sort((a, b) => b.score - a.score);

  const likely = found.filter(row => row.amount >= Math.max(0.6, query.length * 0.39));

  const best = likely[0];
  if (!best || best.score < 2 || (query.length >= 4 && best.amount < 2)) return { ...miss, tryModel: query.length >= 2 };
  const learnedPage = ["/shootout/personal", "/preference-tuning", "/my-data"].includes(page(context));
  const tentative = learnedPage && query.length >= 4 && best.amount / query.length < 0.65 &&
    (!likely[1] || likely[1].score + 5 > best.score);
  return { ...miss, answer: best.topic, tryModel: tentative, related: likely.slice(1, 4).filter(row => row.score >= best.score * 0.63).map(row => row.topic) };
}
