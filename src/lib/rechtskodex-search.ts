import type { SearchEntry } from "@/lib/rechtskodex-index";

// Search over the codex index. Pure functions, so the ranking can be tested without a browser.
// Beyond plain substring matching it understands norm references („KStGB 10“, „Art 5“), a leading
// law as a filter („jo haft“), German word endings, everyday synonyms and small typos.

export const CODE_ORDER = ["KV", "KStGB", "JO", "PolG", "WaffG", "BeamtG", "ImmG", "FJDS"];

// Folds umlauts and accents while keeping the length, so match positions stay aligned.
const FOLD: Record<string, string> = {
  ä: "a", ö: "o", ü: "u", ß: "s", à: "a", á: "a", â: "a", è: "e", é: "e", ê: "e",
  ì: "i", í: "i", î: "i", ò: "o", ó: "o", ô: "o", ù: "u", ú: "u", û: "u", ç: "c",
};

export function fold(input: string): string {
  return input.toLowerCase().replace(/[^\x00-\x7F]/g, (char) => FOLD[char] ?? char);
}

// Maps the abbreviations used in codex references to their code.
// „Art. 5“ refers to an article of the constitution.
const ALIAS: Record<string, string> = {
  art: "KV",
  kv: "KV",
  kstgb: "KStGB",
  jo: "JO",
  polg: "PolG",
  waffg: "WaffG",
  beamtg: "BeamtG",
  immg: "ImmG",
  fjds: "FJDS",
};

// Filler words of natural questions such as "Strafe für Diebstahl" or "wer entscheidet über Gnade".
const STOPWORDS = new Set([
  "strafe", "strafen", "bestraft", "wer", "was", "wie", "wann", "wo", "darf", "kann", "muss", "entscheidet",
  "fur", "uber", "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "und", "oder", "bei",
  "im", "in", "zu", "zum", "zur", "ist", "von", "mit", "auf", "gibt", "es", "man", "wenn", "nach", "fuer",
]);

// Words people type that the codex writes differently. Keys and values are folded when loaded.
const SYNONYM_SOURCE: Record<string, string[]> = {
  marshal: ["marschall"],
  marshals: ["marschall"],
  polizei: ["kpd"],
  polizist: ["kpd"],
  cop: ["kpd"],
  cops: ["kpd"],
  bulle: ["kpd"],
  streife: ["kpd"],
  minister: ["jm"],
  justizminister: ["jm"],
  staatsanwalt: ["sta"],
  anklager: ["sta"],
  todesstrafe: ["hinrichtung"],
  knast: ["haft", "gefängnis", "gewahrsam"],
  arrest: ["haft", "gewahrsam"],
  zelle: ["haft", "gefängnis"],
  jail: ["haft", "gefängnis"],
  bußgeld: ["geldstrafe", "ticket"],
  strafzettel: ["ticket", "geldstrafe"],
  knöllchen: ["ticket", "geldstrafe"],
  geldbuße: ["geldstrafe", "ticket"],
  verteidiger: ["anwalt"],
  pflichtverteidiger: ["anwalt"],
  fahrerlaubnis: ["führerschein"],
  lizenz: ["führerschein", "waffenschein"],
  waffenlizenz: ["waffenschein"],
  waffenerlaubnis: ["waffenschein"],
  drogen: ["btm", "betäubungsmittel"],
  rauschgift: ["btm", "betäubungsmittel"],
  überfall: ["raub"],
  bankraub: ["raub"],
  klauen: ["diebstahl"],
  stehlen: ["diebstahl"],
  dieb: ["diebstahl"],
  umbringen: ["mord", "totschlag"],
  töten: ["mord", "totschlag"],
  killen: ["mord", "totschlag"],
  kündigung: ["entlassung"],
  rauswurf: ["entlassung"],
  gefeuert: ["entlassung"],
  feuern: ["entlassung"],
  begnadigung: ["gnade"],
  pardon: ["gnade"],
  widerspruch: ["berufung", "einspruch"],
  einspruch: ["berufung"],
  vorstrafe: ["register", "strafregister"],
  reporter: ["presse", "journalist"],
  journalist: ["presse"],
  medien: ["presse"],
  zeitung: ["presse"],
  raser: ["rasen", "verkehr"],
  blitzer: ["verkehr", "geschwindigkeit"],
  tempo: ["verkehr", "geschwindigkeit"],
  festgenommen: ["festnahme"],
  verhaftet: ["festnahme", "haft"],
  verhaftung: ["festnahme", "haft"],
  bestechung: ["korruption"],
  putsch: ["hochverrat"],
};

const SYNONYMS = new Map<string, string[]>(
  Object.entries(SYNONYM_SOURCE).map(([key, values]) => [fold(key), values.map(fold)]),
);

// Suggestions for the empty state: the questions people ask most.
export const POPULAR_SEARCHES = ["Mord", "Notstand", "Immunität", "Haft", "Anwalt", "Waffenschein", "Gnade", "Presse", "Führerschein"];

// Strips common German endings so „Waffen“ finds „Waffenschein“ and „Diebstahls“ finds „Diebstahl“.
const ENDINGS = ["ungen", "ung", "keit", "heit", "ern", "en", "er", "es", "em", "e", "s", "n"];

function stem(token: string): string {
  if (token.length < 5 || /\d/.test(token)) return token;
  for (const ending of ENDINGS) {
    if (token.endsWith(ending) && token.length - ending.length >= 4) return token.slice(0, -ending.length);
  }
  return token;
}

// Everything a single typed word may stand for: itself, its stem and the synonyms of both.
function variants(token: string): string[] {
  const root = stem(token);
  const found = new Set<string>([token, root]);
  for (const source of new Set([token, root])) {
    for (const synonym of SYNONYMS.get(source) ?? []) {
      found.add(synonym);
      found.add(stem(synonym));
    }
  }
  return [...found];
}

type Ref = { code: string | null; num: string };

function parseRef(query: string): Ref | null {
  const match = /^([a-z]+)?\s*(\d+)$/.exec(query);
  if (!match) return null;
  if (!match[1]) return { code: null, num: match[2] };
  const code = ALIAS[match[1]];
  return code ? { code, num: match[2] } : null;
}

function isWordStart(text: string, index: number) {
  return index === 0 || !/[a-z0-9]/.test(text[index - 1]);
}

// Finds a term in text. Very short terms only count at the start of a word, so „ei“ is not everywhere.
function find(text: string, term: string): number {
  if (term.length >= 3) return text.indexOf(term);
  let index = text.indexOf(term);
  while (index >= 0 && !isWordStart(text, index)) index = text.indexOf(term, index + 1);
  return index;
}

// Tokens without filler words; a query made only of filler words keeps them.
function meaningfulTokens(query: string): string[] {
  const all = query.split(/[^a-z0-9]+/).filter(Boolean);
  const kept = all.filter((token) => !STOPWORDS.has(token));
  return kept.length ? kept : all;
}

function normalise(rawQuery: string): string {
  return fold(rawQuery).replace(/[§.]/g, " ").replace(/\s+/g, " ").trim();
}

export type Indexed = { entry: SearchEntry; haystack: string; body: string };

export type SearchIndex = {
  items: Indexed[];
  // Every word of the codex with its frequency, the pool for typo correction.
  vocabulary: Map<string, number>;
  // How a folded word is spelled in the codex, so corrections read „Immunität“, not „immunitat“.
  spelling: Map<string, string>;
  corpus: string;
};

export function createSearchIndex(entries: SearchEntry[]): SearchIndex {
  const items = entries.map((entry) => ({
    entry,
    haystack: fold(`${entry.code} ${entry.label} ${entry.heading}`),
    body: fold(entry.text),
  }));
  const corpus = items.map((item) => `${item.haystack} ${item.body}`).join(" ");
  const vocabulary = new Map<string, number>();
  for (const word of corpus.match(/[a-z0-9]{4,}/g) ?? []) vocabulary.set(word, (vocabulary.get(word) ?? 0) + 1);
  const spelling = new Map<string, string>();
  for (const entry of entries) {
    for (const word of `${entry.heading} ${entry.text}`.match(/[\p{L}\d]{4,}/gu) ?? []) {
      const key = fold(word);
      if (!spelling.has(key)) spelling.set(key, word);
    }
  }
  return { items, vocabulary, spelling, corpus };
}

// Edit distance with swapped neighbours counted as one mistake („Mrod“ for „Mord“).
function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

// Replaces a word the codex does not contain with the closest word it does.
function correct(index: SearchIndex, token: string): string {
  if (token.length < 4 || /\d/.test(token)) return token;
  if (variants(token).some((variant) => index.corpus.includes(variant))) return token;
  const allowed = token.length >= 8 ? 2 : 1;
  let best = token;
  let bestDistance = allowed + 1;
  let bestCount = 0;
  for (const [word, count] of index.vocabulary) {
    if (Math.abs(word.length - token.length) > allowed) continue;
    const gap = distance(token, word);
    if (gap < bestDistance || (gap === bestDistance && count > bestCount)) {
      best = word;
      bestDistance = gap;
      bestCount = count;
    }
  }
  return bestDistance <= allowed ? best : token;
}

// Scores one entry. With requireAll, every word must match; otherwise any word is enough.
function scoreEntry(item: Indexed, tokens: string[], phrase: string, requireAll: boolean): number {
  let score = 0;
  for (const token of tokens) {
    let best = 0;
    for (const variant of variants(token)) {
      const inHead = find(item.haystack, variant);
      const inBody = find(item.body, variant);
      let value = 0;
      // A hit in the title outweighs any number of hits in the text.
      if (inHead >= 0) value += isWordStart(item.haystack, inHead) ? 20 : 12;
      if (inBody >= 0) value += 3;
      // A hit through a synonym or stem is a little weaker than the word as typed.
      if (variant !== token) value *= 0.85;
      best = Math.max(best, value);
    }
    if (best === 0 && requireAll) return 0;
    score += best;
  }
  if (phrase && item.haystack.includes(phrase)) score += 15;
  if (phrase && item.body.includes(phrase)) score += 6;
  if (tokens.length && item.haystack.startsWith(tokens[0])) score += 4;
  return score;
}

const KIND_ORDER: Record<string, number> = { par: 0, art: 0, row: 1, entry: 2, heading: 3 };
const byKind = (a: Indexed, b: Indexed) => KIND_ORDER[a.entry.kind] - KIND_ORDER[b.entry.kind];

function rank(index: SearchIndex, tokens: string[], requireAll: boolean, scope: string | null): SearchEntry[] {
  const phrase = tokens.join(" ");
  const scored: { item: Indexed; score: number }[] = [];
  for (const item of index.items) {
    if (scope && item.entry.code !== scope) continue;
    const score = scoreEntry(item, tokens, phrase, requireAll);
    if (score > 0) scored.push({ item, score });
  }
  return scored
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : byKind(a.item, b.item)))
    .map(({ item }) => item.entry);
}

export type SearchOutcome = {
  hits: SearchEntry[];
  // Words to mark in the results: the typed words plus their stems and synonyms.
  marks: string[];
  // The query as the search understood it after fixing typos, or null when nothing was changed.
  correction: string | null;
  // A law named at the start of the query („jo haft“) narrows the search to that law.
  scope: string | null;
};

const EMPTY: SearchOutcome = { hits: [], marks: [], correction: null, scope: null };

export function searchCodex(index: SearchIndex, rawQuery: string): SearchOutcome {
  const query = normalise(rawQuery);
  if (!query) return EMPTY;

  // A recognised norm such as „KStGB 10“ or „Art 5“ shows exactly that passage.
  const ref = parseRef(query);
  if (ref) {
    const exact = index.items
      .filter((item) => item.entry.num === ref.num && (!ref.code || item.entry.code === ref.code))
      .sort(byKind)
      .map((item) => item.entry);
    if (exact.length) return { hits: exact, marks: [], correction: null, scope: ref.code };
  }

  let tokens = meaningfulTokens(query);
  let scope: string | null = null;
  if (tokens.length >= 2 && tokens[0] !== "art" && ALIAS[tokens[0]]) {
    scope = ALIAS[tokens[0]];
    tokens = tokens.slice(1);
  }

  let hits = rank(index, tokens, true, scope);
  let correction: string | null = null;

  if (!hits.length) {
    const fixed = tokens.map((token) => correct(index, token));
    if (fixed.some((token, i) => token !== tokens[i])) {
      const retry = rank(index, fixed, true, scope);
      if (retry.length) {
        hits = retry;
        tokens = fixed;
        correction = fixed.map((token) => index.spelling.get(token) ?? token).join(" ");
      }
    }
  }
  // Last resort: any single word is enough.
  if (!hits.length) hits = rank(index, tokens, false, scope);

  return { hits, marks: [...new Set(tokens.flatMap(variants))], correction, scope };
}
