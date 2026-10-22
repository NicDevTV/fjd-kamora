import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Children, Fragment, ViewTransition, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { withAbbreviations } from "@/components/abbr";
import { FjdLogo } from "@/components/fjd-logo";
import { GlassBackdrop } from "@/components/glass-backdrop";
import { OffenseRow, OffenseToggle } from "@/components/offense-row";
import { SCHAUBILD_PATTERN, Schaubild } from "@/components/schaubild";
import { SiteFooter } from "@/components/site-footer";
import { ReadingProgress } from "@/components/reading-progress";
import { RechtskodexSearch } from "@/components/rechtskodex-search";
import { RechtskodexToc, type TocItem } from "@/components/rechtskodex-toc";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SiteHeader } from "@/components/site-header";
import { TargetFlash } from "@/components/target-flash";
import { rehypeArticles } from "@/lib/rehype-articles";
import { rehypeTableLabels } from "@/lib/rehype-table-labels";
import type { Element as HastElement } from "hast";
import {
  getRechtskodex,
  slugify,
  type RechtskodexSection,
} from "@/lib/rechtskodex";
import { buildSearchIndex, type SearchEntry } from "@/lib/rechtskodex-index";
import { getTatbestaende } from "@/lib/tatbestaende";
import { pageTransition } from "@/lib/view-transitions";

export const metadata = {
  title: "Rechtskodex | Federal Justice Department (FJD)",
  description: "Rechtskodex des fiktiven Staates Kamora, Rollenspiel-Projekt.",
};

// Extracts the text of headings so anchors match the table of contents.
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

function headingId(section: RechtskodexSection, text: string) {
  return `${section.id}--${slugify(text)}`;
}

// References such as „JO 5“, „KStGB 10“ or „Art. 11“ become links to the cited passage.
const REF = /((?:KV|KStGB|JO|PolG|BeamtG|ImmG|FJDS|Art\.)\s?\d+(?:[–-]\d+)?)/;

function linkRefs(children: ReactNode, refs: Map<string, string>): ReactNode {
  if (typeof children === "string") {
    // Plain text and link text both get abbreviation tooltips, so „JO“ in „JO 5“ explains itself too.
    return children.split(REF).map((part, index) => {
      const text = <Fragment key={index}>{withAbbreviations(part)}</Fragment>;
      if (index % 2 === 0) return text;
      const match = /^(KV|KStGB|JO|PolG|BeamtG|ImmG|FJDS|Art\.)\s?(\d+)/.exec(part);
      if (!match) return text;
      const code = match[1] === "Art." ? "KV" : match[1];
      const href = refs.get(`${code} ${match[2]}`);
      return href ? (
        <a key={index} href={href} className="rk-ref">
          {withAbbreviations(part)}
        </a>
      ) : (
        text
      );
    });
  }
  if (Array.isArray(children)) return children.map((child) => linkRefs(child, refs));
  return children;
}

function hastText(node: HastElement | HastElement["children"][number]): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(hastText).join("");
  return "";
}

// Splits „§ 10 Mord“ into number and title so the number can sit quietly in front.
function splitNumber(text: string) {
  const match = /^((?:§|Art\.) \d+)\s+(.*)$/.exec(text);
  return match ? { number: match[1], title: match[2] } : null;
}

function markdownComponents(
  section: RechtskodexSection,
  refs: Map<string, string>,
  definitions: Map<string, string>,
): Components {
  const withRefs = (children: ReactNode) => linkRefs(children, refs);

  return {
    h3: ({ children }) => {
      const parts = splitNumber(textOf(children));
      return (
        <h3
          id={headingId(section, textOf(children))}
          className="mt-12 scroll-mt-28 font-serif text-2xl font-medium leading-snug sm:text-[1.75rem]"
        >
          {parts ? (
            <>
              <span className="mr-3 font-sans text-base font-normal text-muted tabular-nums">{parts.number}</span>
              {parts.title}
            </>
          ) : (
            children
          )}
        </h3>
      );
    },
    h4: ({ children }) => {
      const parts = splitNumber(textOf(children));
      return (
        <h4
          id={headingId(section, textOf(children))}
          className="mt-12 scroll-mt-28 font-serif text-xl font-medium leading-snug sm:text-2xl"
        >
          {parts ? (
            <>
              <span className="mr-3 font-sans text-sm font-normal text-muted tabular-nums">{parts.number}</span>
              {parts.title}
            </>
          ) : (
            children
          )}
        </h4>
      );
    },
    // Every norm is its own glass card (rehype-articles.ts groups heading and text).
    section: ({ children }) => (
      <section data-article className="glass-panel p-6 sm:p-9 [&>*:first-child]:mt-0">
        {children}
      </section>
    ),
    p: ({ children }) => {
      // A line like "::schaubild staatsaufbau::" places a diagram (schaubild.tsx).
      const diagram = SCHAUBILD_PATTERN.exec(textOf(children).trim());
      if (diagram) return <Schaubild name={diagram[1]} refs={refs} />;
      return <p className="mt-4 max-w-prose text-[1.0625rem] leading-[1.75] text-ink/90">{withRefs(children)}</p>;
    },
    ul: ({ children }) => (
      <ul className="mt-5 max-w-prose space-y-3 text-[1.0625rem] leading-[1.7] text-ink/90 [&>li]:relative [&>li]:pl-6 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[0.7em] [&>li]:before:h-px [&>li]:before:w-3 [&>li]:before:bg-accent">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mt-5 max-w-prose list-none space-y-3 text-[1.0625rem] leading-[1.7] text-ink/90">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-1">{withRefs(children)}</li>,
    strong: ({ children }) => <strong className="font-medium text-ink">{children}</strong>,
    blockquote: ({ children }) =>
      // The one out-of-character note gets a plain dashed frame, so it never reads as law.
      textOf(children).trim().startsWith("OOC") ? (
        <aside className="mt-6 max-w-prose rounded-[1.25rem] border border-dashed border-ink/30 px-5 py-4 [&_p]:mt-0 [&_p]:text-[0.9375rem] [&_p]:leading-relaxed [&_p]:text-ink/75">
          {children}
        </aside>
      ) : (
      <blockquote className="glass-inset relative mt-6 max-w-prose rounded-[1.25rem] py-4 pl-6 pr-6 font-serif [&>p:first-child]:mt-0 text-[1.1875rem] leading-[1.7] text-ink shadow-[inset_3px_0_0_#7a2232,inset_0_1px_0_rgb(255_255_255/0.9)]">
        {children}
      </blockquote>
      ),
    table: ({ node, children }) => (
      <div className="rk-table glass-inset mt-6 overflow-x-auto rounded-[1.5rem]">
        <table
          data-keyed={node?.properties.dataKeyed ? "true" : undefined}
          className="w-full min-w-[30rem] border-collapse text-left text-sm"
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-navy/90 text-white">{children}</thead>,
    th: ({ children }) => <th className="px-4 py-3.5 text-xs font-medium tracking-wide">{withRefs(children)}</th>,
    // Penalty catalogue rows get an anchor so search and references land exactly there.
    tr: ({ node, children }) => {
      const firstCell = node?.children.find(
        (child): child is HastElement => child.type === "element" && child.tagName === "td",
      );
      const number = firstCell ? hastText(firstCell).trim() : "";
      const id = /^\d+$/.test(number) ? `${section.id}--row-${number}` : undefined;
      const definition = id ? definitions.get(number) : undefined;
      if (!id || !definition) {
        return (
          <tr id={id} className="scroll-mt-32">
            {children}
          </tr>
        );
      }

      // Offences with a definition unfold on click; the § number becomes the toggle button.
      const cells = Children.toArray(children).filter(isValidElement) as ReactElement<{ children?: ReactNode }>[];
      return (
        <OffenseRow id={id} columns={cells.length} definition={withRefs(definition)}>
          {cells.map((cell, index) =>
            index === 0 ? cloneElement(cell, { children: <OffenseToggle>{cell.props.children}</OffenseToggle> }) : cell,
          )}
        </OffenseRow>
      );
    },
    td: ({ node, children }) => (
      <td
        data-label={typeof node?.properties.dataLabel === "string" ? node.properties.dataLabel : undefined}
        className="border-t border-ink/10 px-4 py-3.5 align-top tabular-nums"
      >
        {withRefs(children)}
      </td>
    ),
  };
}

export default function RechtskodexPage() {
  const doc = getRechtskodex();
  const definitions = getTatbestaende();
  const searchIndex: SearchEntry[] = buildSearchIndex(doc, definitions);

  // Keys such as „JO 5“ or „KStGB 10“ point to the first matching passage.
  const refs = new Map<string, string>();
  for (const entry of searchIndex) {
    const key = entry.kind === "art" ? `KV ${entry.num}` : entry.code && entry.num ? `${entry.code} ${entry.num}` : "";
    if (key && !refs.has(key)) refs.set(key, entry.href);
  }

  const toc: TocItem[] = doc.sections.flatMap((section) => [
    { href: `#${section.id}`, label: section.title, level: 2 },
    ...section.body.split("\n").flatMap((line) => {
      const match = /^(#{3,4}) (.+)$/.exec(line);
      if (!match) return [];
      const label = match[2].trim();
      return [{ href: `#${headingId(section, label)}`, label, level: match[1].length }];
    }),
  ]);

  const statuses = [
    { label: "Fassung", value: doc.meta.fassung },
    { label: "Stand", value: doc.meta.stand },
    { label: "Autor", value: doc.meta.autor },
  ];

  return (
    <>
      <ScrollReveal />
      <ReadingProgress />
      <TargetFlash />
      <SiteHeader />

      <ViewTransition enter={pageTransition.enter} exit={pageTransition.exit} default="none">
        <div className="relative isolate min-h-screen overflow-clip bg-paper">
          <GlassBackdrop />

          <main id="inhalt" className="mx-auto block max-w-6xl px-4 pb-16 pt-24 sm:px-8 sm:pt-28">
            <header className="glass-panel grid grid-cols-[minmax(0,1fr)] gap-12 p-8 sm:p-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
              <div>
                <FjdLogo className="mb-8 h-14 w-auto text-navy" />
                <h1 className="font-serif text-5xl font-medium leading-[1.02] tracking-tight sm:text-7xl">
                  {doc.meta.titel}
                </h1>
                <div className="mt-10">
                  <RechtskodexSearch entries={searchIndex} />
                </div>
              </div>

              <dl className="glass-inset grid grid-cols-1 overflow-hidden rounded-[1.5rem] sm:grid-cols-3 lg:grid-cols-1">
                {statuses.map((status) => (
                  <div key={status.label} className="border-b border-white/70 px-6 py-5 last:border-b-0 sm:border-b-0 sm:border-r last:sm:border-r-0 lg:border-b lg:border-r-0 lg:last:border-b-0">
                    <dt className="text-xs text-muted">{status.label}</dt>
                    <dd className="mt-1 font-serif text-lg font-medium">{status.value}</dd>
                  </div>
                ))}
              </dl>
            </header>

            <details className="glass-panel mt-8 p-6 lg:hidden">
              <summary className="-my-3 cursor-pointer py-3 font-medium">Inhalt</summary>
              <div className="rk-scroll mt-4 max-h-[60vh] overflow-y-auto pr-2">
                <RechtskodexToc items={toc} />
              </div>
            </details>

            <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
              <aside className="hidden lg:block">
                <div className="glass-panel sticky top-24 max-h-[calc(100vh-7rem)] overflow-hidden p-5">
                  <div className="rk-scroll max-h-[calc(100vh-10rem)] overflow-y-auto pr-2">
                    <RechtskodexToc items={toc} />
                  </div>
                </div>
              </aside>

              <article className="rk-article min-w-0">
                {doc.sections.map((section) => {
                  const teil = /^Teil (\d+) · (.+)$/.exec(section.title);
                  return (
                    <section
                      key={section.id}
                      id={section.id}
                      className="scroll-mt-28 pt-16 first:pt-2"
                    >
                      <h2 data-reveal className="flex items-baseline gap-5 rounded-2xl">
                        {teil && (
                          <span aria-hidden="true" className="font-serif text-6xl font-medium leading-none text-accent/60 tabular-nums">
                            {teil[1]}
                          </span>
                        )}
                        <span className="font-serif text-3xl font-medium leading-tight sm:text-4xl">
                          {teil ? teil[2] : section.title}
                        </span>
                      </h2>
                      <div data-draw className="mt-6 h-px bg-ink/70" />
                      <div className="mt-6 space-y-4">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeArticles, rehypeTableLabels]}
                          components={markdownComponents(section, refs, definitions)}
                        >
                          {section.body}
                        </ReactMarkdown>
                      </div>
                    </section>
                  );
                })}
              </article>
            </div>
          </main>

          <SiteFooter />
        </div>
      </ViewTransition>
    </>
  );
}
