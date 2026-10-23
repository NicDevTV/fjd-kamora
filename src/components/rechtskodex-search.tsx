"use client";

import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { flashTarget } from "@/lib/flash-target";
import type { SearchEntry } from "@/lib/rechtskodex-index";
import { CODE_ORDER, POPULAR_SEARCHES, createSearchIndex, fold, searchCodex } from "@/lib/rechtskodex-search";

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

const RECENT_KEY = "fjd-recent-searches";

function readRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function rememberSearch(query: string) {
  const text = query.trim();
  if (text.length < 2) return;
  try {
    const next = [text, ...readRecent().filter((item) => fold(item) !== fold(text))].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the search still works, it just forgets.
  }
}

function forgetSearches() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // Nothing to clear.
  }
}

const KIND_LABEL: Record<string, string> = { row: "Strafkatalog", entry: "Abschnitt", heading: "Teil" };

const subscribeNothing = () => () => {};

// The index is fetched once, on first hover, focus or open, and then shared by every instance.
let indexRequest: Promise<SearchEntry[]> | null = null;

function loadIndex(): Promise<SearchEntry[]> {
  indexRequest ??= fetch("/rechtskodex/suchindex")
    .then((response) => (response.ok ? (response.json() as Promise<SearchEntry[]>) : Promise.reject(new Error(String(response.status)))))
    .catch((error) => {
      indexRequest = null;
      throw error;
    });
  return indexRequest;
}

const NO_ENTRIES: SearchEntry[] = [];

export function RechtskodexSearch() {
  const [entries, setEntries] = useState<SearchEntry[]>(NO_ENTRIES);
  const [loadFailed, setLoadFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [inlineVisible, setInlineVisible] = useState(true);
  // True only in the browser, where document.body exists for the portal.
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inlineRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const searchIndex = useMemo(() => createSearchIndex(entries), [entries]);
  const outcome = useMemo(() => searchCodex(searchIndex, query), [searchIndex, query]);

  // A law chosen by chip wins; otherwise a law named in the query („jo haft“) narrows the search.
  const scope = code ?? outcome.scope;
  const results = useMemo(
    () => outcome.hits.filter((entry) => !scope || entry.code === scope).slice(0, 40),
    [outcome, scope],
  );
  const counts = useMemo(() => {
    const found = new Map<string, number>();
    for (const entry of outcome.hits) found.set(entry.code, (found.get(entry.code) ?? 0) + 1);
    return found;
  }, [outcome]);

  // Opens the search and reads the last searches. Storage can be blocked, then there are none.
  const openSearch = useCallback(() => {
    setRecent(readRecent());
    setOpen(true);
  }, []);

  // Loads the index shortly before it is needed; a failed request can be retried on the next try.
  function warmUp() {
    loadIndex().then(setEntries, () => setLoadFailed(true));
  }

  // Warm up while the browser is idle, so the first search is instant without slowing the page.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 2000));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => {
      loadIndex().then(setEntries, () => setLoadFailed(true));
    });
    return () => cancel(handle);
  }, []);

  const tokens = outcome.marks;

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
        openSearch();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  // Open and close the dialog natively so the focus trap and Escape work.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // The floating button only appears once the inline button has scrolled out of view.
  useEffect(() => {
    const button = inlineRef.current;
    if (!button) return;
    const observer = new IntersectionObserver(([entry]) => setInlineVisible(entry.isIntersecting));
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function close() {
    setOpen(false);
  }

  // Close the dialog right away, then glide to the passage and let it light up briefly.
  function openResult(event: ReactMouseEvent<HTMLAnchorElement>, entry: SearchEntry) {
    event.preventDefault();
    rememberSearch(query);
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

  const inputRef = useRef<HTMLInputElement>(null);

  // A suggestion fills the field and keeps the cursor there, ready to refine.
  function pick(text: string) {
    setQuery(text);
    setActive(0);
    inputRef.current?.focus();
  }

  const suggestionClass =
    "rounded-full border border-ink/12 bg-white/55 px-4 py-2 text-sm text-ink/80 transition-colors hover:border-ink/25 hover:bg-white [@media(pointer:coarse)]:min-h-11";

  const chipClass = (selected: boolean) =>
    `shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-all duration-200 [@media(pointer:coarse)]:min-h-11 ${
      selected
        ? "bg-navy text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_6px_16px_-8px_rgb(22_38_58/0.8)]"
        : "text-ink/70 hover:bg-white/70 hover:text-ink"
    }`;

  return (
    <>
      <button
        ref={inlineRef}
        type="button"
        onClick={openSearch}
        onPointerEnter={warmUp}
        onFocus={warmUp}
        className="liquid-solid inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm font-medium text-white"
      >
        Im Kodex suchen
        <kbd className="rounded-md border border-white/40 px-1.5 py-0.5 font-mono text-xs [@media(pointer:coarse)]:hidden">/</kbd>
      </button>

      {/* The codex is very long on phones: the search stays one tap away. It is portalled to
          the body: the glass panels form their own stacking contexts, which would trap it below
          later cards, and they set position: relative, so the placement lives on a wrapper. */}
      {mounted &&
        createPortal(
          <div
            className={`fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-30 transition-[opacity,translate] duration-300 lg:hidden ${
              inlineVisible ? "pointer-events-none translate-y-4 opacity-0" : ""
            }`}
          >
            <button
              type="button"
              tabIndex={inlineVisible ? -1 : undefined}
              onClick={openSearch}
              aria-label="Im Kodex suchen"
              className="liquid-solid flex size-14 items-center justify-center rounded-full text-white"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-6">
                <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>,
          document.body,
        )}

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
                ref={inputRef}
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

            <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 [mask-image:linear-gradient(to_right,transparent,black_1.25rem,black_calc(100%-1.75rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]">
              <button
                type="button"
                aria-pressed={scope === null}
                onClick={() => {
                  setCode(null);
                  setActive(0);
                }}
                className={chipClass(scope === null)}
              >
                Alle
              </button>
              {CODE_ORDER.map((item) => {
                const count = query.trim() ? (counts.get(item) ?? 0) : null;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={scope === item}
                    disabled={count === 0 && scope !== item}
                    onClick={() => {
                      setCode(code === item ? null : item);
                      setActive(0);
                    }}
                    className={`${chipClass(scope === item)} font-mono text-xs disabled:pointer-events-none disabled:opacity-35`}
                  >
                    {item}
                    {count ? <span className="ml-1.5 tabular-nums opacity-60">{count}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rk-scroll min-h-0 flex-1 overflow-y-auto">
            {query.trim() === "" ? (
              <div className="space-y-7 px-5 py-8 text-sm text-ink/70 sm:px-7">
                {recent.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="font-serif text-lg text-ink">Zuletzt gesucht</p>
                      <button
                        type="button"
                        onClick={() => {
                          forgetSearches();
                          setRecent([]);
                        }}
                        className="rounded-full px-3 py-1.5 text-xs text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
                      >
                        Löschen
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recent.map((item) => (
                        <button key={item} type="button" onClick={() => pick(item)} className={suggestionClass}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="font-serif text-lg text-ink">Häufig gefragt</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map((item) => (
                      <button key={item} type="button" onClick={() => pick(item)} className={suggestionClass}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="max-w-prose leading-relaxed">
                  Eine Norm findest du direkt mit „KStGB 10“, „Art 5“ oder nur „10“. Ein Gesetz vor dem Begriff
                  begrenzt die Suche, zum Beispiel „JO Haft“. Auch Umgangssprache wie „Knast“ oder „Bußgeld“ führt
                  zum passenden Paragraphen.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="px-5 py-10 text-sm sm:px-7">
                <p className="font-serif text-xl">
                  {entries.length === 0
                    ? loadFailed
                      ? "Der Suchindex konnte nicht geladen werden."
                      : "Suchindex wird geladen …"
                    : `Keine Treffer für „${query.trim()}“.`}
                </p>
                <p className="mt-2 text-ink/70">
                  {scope && !code
                    ? `Gesucht wurde nur in ${scope}. Nimm „Alle“, um das ganze Gesetzbuch zu durchsuchen.`
                    : "Probier einen kürzeren Begriff, ein Stichwort wie „Haft“ oder eine Norm wie „JO 4“."}
                </p>
                {scope && (
                  <button
                    type="button"
                    onClick={() => {
                      setCode(null);
                      setQuery(query.trim().split(/\s+/).slice(1).join(" "));
                    }}
                    className={`${suggestionClass} mt-4`}
                  >
                    In allen Gesetzen suchen
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="px-5 pt-5 text-xs text-ink/60 sm:px-7" aria-live="polite">
                  {outcome.correction ? (
                    <>
                      Statt „{query.trim()}“ zeigt die Suche{" "}
                      <strong className="font-medium text-ink">„{outcome.correction}“</strong>.{" "}
                    </>
                  ) : null}
                  {results.length} Treffer{scope ? ` in ${scope}` : ""}
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
                            {KIND_LABEL[entry.kind] && (
                              <span className={`ml-auto text-ink/65 ${isActive ? "[@media(pointer:fine)]:text-white/75" : ""}`}>
                                {KIND_LABEL[entry.kind]}
                              </span>
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
