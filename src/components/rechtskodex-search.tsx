"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { flashTarget } from "@/lib/flash-target";
import type { SearchEntry } from "@/lib/rechtskodex-index";

const CODE_ORDER = ["KV", "KStGB", "JO", "PolG", "BeamtG", "ImmG", "FJDS"];

// Folds umlauts and accents while keeping the length, so match positions stay aligned.
const FOLD: Record<string, string> = {
  ä: "a", ö: "o", ü: "u", ß: "s", à: "a", á: "a", â: "a", è: "e", é: "e", ê: "e",
  ì: "i", í: "i", î: "i", ò: "o", ó: "o", ô: "o", ù: "u", ú: "u", û: "u", ç: "c",
};

function fold(input: string): string {
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
  beamtg: "BeamtG",
  immg: "ImmG",
  fjds: "FJDS",
};

type Indexed = { entry: SearchEntry; haystack: string; body: string };

// Filler words of natural questions such as "Strafe für Diebstahl" or "wer entscheidet über Gnade".
const STOPWORDS = new Set([
  "strafe", "strafen", "bestraft", "wer", "was", "wie", "wann", "wo", "darf", "kann", "muss", "entscheidet",
  "fur", "uber", "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "und", "oder", "bei",
  "im", "in", "zu", "zum", "zur", "ist", "von", "mit", "auf", "gibt", "es", "man",
]);

// Spellings people type that the codex writes differently.
const SYNONYMS: Record<string, string[]> = {
  marshal: ["marschall"],
  marshals: ["marschall"],
  polizei: ["kpd"],
  minister: ["jm"],
  justizminister: ["jm"],
  todesstrafe: ["hinrichtung"],
};

function variants(token: string): string[] {
  return [token, ...(SYNONYMS[token] ?? [])];
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

// Scores one entry. With requireAll, every token must match; otherwise any token is enough.
function scoreEntry(item: Indexed, tokens: string[], phrase: string, requireAll: boolean): number {
  let score = 0;
  for (const token of tokens) {
    let best = 0;
    for (const variant of variants(token)) {
      const inHead = item.haystack.indexOf(variant);
      const inBody = item.body.indexOf(variant);
      let value = 0;
      // A hit in the title outweighs any number of hits in the text.
      if (inHead >= 0) value += isWordStart(item.haystack, inHead) ? 20 : 12;
      if (inBody >= 0) value += 3;
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

function search(items: Indexed[], rawQuery: string, code: string | null): SearchEntry[] {
  const query = fold(rawQuery).replace(/[§.]/g, " ").replace(/\s+/g, " ").trim();
  if (!query) return [];

  const kindOrder: Record<string, number> = { par: 0, art: 0, row: 1, entry: 2, heading: 3 };
  const byKind = (a: Indexed, b: Indexed) => kindOrder[a.entry.kind] - kindOrder[b.entry.kind];

  // A recognised norm such as „KStGB 10“ or „Art 5“ shows exactly that passage.
  const ref = parseRef(query);
  if (ref) {
    const exact = items
      .filter((item) => item.entry.num === ref.num)
      .filter((item) => !ref.code || item.entry.code === ref.code)
      .filter((item) => !code || item.entry.code === code)
      .sort(byKind);
    if (exact.length) return exact.slice(0, 30).map((item) => item.entry);
  }

  const tokens = meaningfulTokens(query);
  const phrase = tokens.join(" ");
  const scores = new Map<string, number>();

  // First every word must match; if nothing does, any matching word counts.
  for (const requireAll of [true, false]) {
    for (const item of items) {
      if (code && item.entry.code !== code) continue;
      const score = scoreEntry(item, tokens, phrase, requireAll);
      if (score > 0) scores.set(item.entry.id, score);
    }
    if (scores.size) break;
  }

  return items
    .filter((item) => scores.has(item.entry.id))
    .filter((item) => !code || item.entry.code === code)
    .sort((a, b) => {
      const diff = (scores.get(b.entry.id) ?? 0) - (scores.get(a.entry.id) ?? 0);
      return diff !== 0 ? diff : byKind(a, b);
    })
    .slice(0, 30)
    .map((item) => item.entry);
}

// Tokens without filler words; a query made only of filler words keeps them.
function meaningfulTokens(query: string): string[] {
  const all = query.split(/[^a-z0-9]+/).filter(Boolean);
  const kept = all.filter((token) => !STOPWORDS.has(token));
  return kept.length ? kept : all;
}

function queryTokens(rawQuery: string): string[] {
  const query = fold(rawQuery).replace(/[§.]/g, " ");
  return meaningfulTokens(query).flatMap(variants);
}

// Marks every occurrence of the search terms. Returns React nodes, never HTML.
function highlight(text: string, tokens: string[]): ReactNode[] {
  if (!tokens.length) return [text];
  const folded = fold(text);
  const ranges: [number, number][] = [];
  for (const token of tokens) {
    let index = folded.indexOf(token);
    while (index >= 0) {
      ranges.push([index, index + token.length]);
      index = folded.indexOf(token, index + token.length);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }

  const nodes: ReactNode[] = [];
  let position = 0;
  merged.forEach(([start, end], index) => {
    if (start > position) nodes.push(text.slice(position, start));
    nodes.push(
      <mark key={index} className="rounded-sm bg-accent/15 text-inherit [@media(pointer:fine)]:group-data-[active=true]:bg-white/25">
        {text.slice(start, end)}
      </mark>,
    );
    position = end;
  });
  if (position < text.length) nodes.push(text.slice(position));
  return nodes;
}

// Shows an excerpt around the first match.
function snippet(text: string, tokens: string[]): ReactNode[] {
  const folded = fold(text);
  const first = tokens
    .map((token) => folded.indexOf(token))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  const start = first === undefined ? 0 : Math.max(0, first - 60);
  const end = Math.min(text.length, start + 190);
  const window = text.slice(start, end).trim();

  return [
    start > 0 ? "… " : "",
    ...highlight(window, tokens),
    end < text.length ? " …" : "",
  ];
}

// The keyboard selection is styled only for fine pointers. On touch screens the first result
// would otherwise look pre-selected although nothing was chosen. Written out in full so
// Tailwind finds every class.
const ACTIVE_RESULT =
  "[@media(pointer:fine)]:bg-navy [@media(pointer:fine)]:text-white [@media(pointer:fine)]:hover:bg-navy [@media(pointer:fine)]:shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_14px_30px_-16px_rgb(22_38_58/0.9)]";

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 text-ink/50">
      <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function RechtskodexSearch({ entries }: { entries: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const items = useMemo<Indexed[]>(
    () =>
      entries.map((entry) => ({
        entry,
        haystack: fold(`${entry.code} ${entry.label} ${entry.heading}`),
        body: fold(entry.text),
      })),
    [entries],
  );

  const codes = useMemo(
    () => CODE_ORDER.filter((c) => entries.some((entry) => entry.code === c)),
    [entries],
  );

  const results = useMemo(() => search(items, query, code), [items, query, code]);
  const tokens = useMemo(() => queryTokens(query), [query]);

  // "/" or Ctrl+K opens the search, unless the user is typing in a field.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, [contenteditable='true']");
      if ((event.key === "/" && !typing) || (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey))) {
        event.preventDefault();
        // Open natively right away: after Esc, React may not have seen the close event yet.
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) dialog.showModal();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Open and close the dialog natively so the focus trap and Escape work.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function close() {
    setOpen(false);
  }

  // Close the dialog right away, then glide to the passage and let it light up briefly.
  function openResult(event: ReactMouseEvent<HTMLAnchorElement>, entry: SearchEntry) {
    event.preventDefault();
    dialogRef.current?.close();
    setOpen(false);
    window.history.pushState(null, "", entry.href);
    requestAnimationFrame(() => flashTarget(entry.href.slice(1)));
  }

  function onInputKey(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      listRef.current?.querySelectorAll<HTMLAnchorElement>("a")[active]?.click();
    }
  }

  const chipClass = (selected: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm transition-all duration-200 [@media(pointer:coarse)]:min-h-11 ${
      selected
        ? "bg-navy text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_6px_16px_-8px_rgb(22_38_58/0.8)]"
        : "text-ink/70 hover:bg-white/70 hover:text-ink"
    }`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="liquid-solid inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm font-medium text-white"
      >
        Im Kodex suchen
        <kbd className="rounded-md border border-white/40 px-1.5 py-0.5 font-mono text-xs [@media(pointer:coarse)]:hidden">/</kbd>
      </button>

      {/* The codex is very long on phones: the search stays one tap away. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Im Kodex suchen"
        className="liquid-solid fixed bottom-5 right-5 z-30 flex size-14 items-center justify-center rounded-full text-white lg:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-6">
          <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        onClose={close}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        className="rk-dialog mx-auto w-[min(48rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-[2rem] border border-white/70 bg-transparent p-0 text-ink shadow-[0_40px_90px_-30px_rgb(10_20_35/0.6)] backdrop:bg-navy/35 open:flex open:flex-col"
        style={{ marginTop: "7vh" }}
      >
        {/* Glass surface: translucent, blurred backdrop, light edge on top */}
        <div className="glass-glow flex max-h-[80vh] flex-col bg-[linear-gradient(160deg,rgb(255_255_255/0.86),rgb(246_248_250/0.7))] backdrop-blur-2xl backdrop-saturate-200">
          <div className="relative border-b border-white/60 px-5 pb-5 pt-5 sm:px-7">
            <label htmlFor="rk-search" className="sr-only">
              Im Rechtskodex suchen
            </label>
            <div className="glass-glow flex items-center gap-3 rounded-full border border-white/80 bg-white/70 px-5 py-3.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_8px_24px_-16px_rgb(22_38_58/0.5)] focus-within:ring-2 focus-within:ring-accent/40">
              <SearchIcon />
              <input
                id="rk-search"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKey}
                placeholder="Norm, Begriff oder Paragraph, zum Beispiel KStGB 10"
                className="w-full min-w-0 bg-transparent font-serif text-xl outline-none placeholder:font-sans placeholder:text-base placeholder:text-ink/40"
                aria-controls="rk-results"
              />
              <button
                type="button"
                onClick={close}
                aria-label="Suche schließen"
                className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
                  <path d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={code === null}
                onClick={() => {
                  setCode(null);
                  setActive(0);
                }}
                className={chipClass(code === null)}
              >
                Alle
              </button>
              {codes.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={code === item}
                  onClick={() => {
                    setCode(item);
                    setActive(0);
                  }}
                  className={`${chipClass(code === item)} font-mono text-xs`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="rk-scroll min-h-0 flex-1 overflow-y-auto">
            {query.trim() === "" ? (
              <div className="space-y-3 px-5 py-10 text-sm text-ink/70 sm:px-7">
                <p className="font-serif text-xl text-ink">Gezielt suchen</p>
                <p>
                  „KStGB 10“ oder einfach „10“ finden den Paragraphen. „Art 5“ findet einen
                  Verfassungsartikel. Begriffe wie „Mord“, „Notstand“ oder „Immunität“ finden
                  den passenden Text und Strafkatalog.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="px-5 py-10 text-sm sm:px-7">
                <p className="font-serif text-xl">Keine Treffer für „{query.trim()}“.</p>
                <p className="mt-2 text-ink/70">Probier einen kürzeren Begriff oder eine Norm wie „JO 4“.</p>
              </div>
            ) : (
              <>
                <p className="px-5 pt-5 text-xs text-ink/60 sm:px-7" aria-live="polite">
                  {results.length} Treffer
                </p>
                <ul id="rk-results" ref={listRef} role="listbox" className="space-y-1.5 p-3 sm:p-4">
                  {results.map((entry, index) => {
                    const isActive = index === active;
                    return (
                      <li key={entry.id} role="presentation">
                        <a
                          href={entry.href}
                          role="option"
                          aria-selected={isActive}
                          data-active={isActive}
                          onClick={(event) => openResult(event, entry)}
                          onMouseEnter={() => setActive(index)}
                          className={`group block rounded-2xl px-4 py-3.5 text-ink transition-all duration-200 hover:bg-white/60 sm:px-5 ${
                            isActive ? ACTIVE_RESULT : ""
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className={`rounded-md border border-ink/15 px-1.5 py-0.5 font-mono text-ink/60 ${
                                isActive ? "[@media(pointer:fine)]:border-white/35 [@media(pointer:fine)]:text-white/90" : ""
                              }`}
                            >
                              {entry.code || "Übersicht"}
                            </span>
                            {entry.label && (
                              <span className={`text-ink/60 ${isActive ? "[@media(pointer:fine)]:text-white/70" : ""}`}>{entry.label}</span>
                            )}
                          </div>
                          <p className="mt-2 font-serif text-lg font-medium leading-snug">
                            {highlight(entry.heading, tokens)}
                          </p>
                          {entry.text && (
                            <p className={`mt-1 text-sm leading-relaxed text-ink/65 ${isActive ? "[@media(pointer:fine)]:text-white/75" : ""}`}>
                              {snippet(entry.text, tokens)}
                            </p>
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/60 px-5 py-3.5 text-xs text-ink/60 sm:px-7 [@media(pointer:coarse)]:hidden">
            <span className="flex items-center gap-2">
              <kbd className="rounded-md border border-ink/15 bg-white/70 px-1.5 py-0.5 font-mono">↑</kbd>
              <kbd className="rounded-md border border-ink/15 bg-white/70 px-1.5 py-0.5 font-mono">↓</kbd>
              auswählen
            </span>
            <span className="flex items-center gap-2">
              <kbd className="rounded-md border border-ink/15 bg-white/70 px-1.5 py-0.5 font-mono">Enter</kbd>
              öffnen
            </span>
            <span className="flex items-center gap-2">
              <kbd className="rounded-md border border-ink/15 bg-white/70 px-1.5 py-0.5 font-mono">Esc</kbd>
              schließen
            </span>
          </div>
        </div>
      </dialog>
    </>
  );
}
