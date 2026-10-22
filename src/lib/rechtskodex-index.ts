import { slugify, type RechtskodexDocument } from "@/lib/rechtskodex";

// A search hit is an article, a paragraph, a row of the penalty catalogue or the entry
// point of a part. The index is created at build time and handed to the browser as data.
export type SearchKind = "art" | "par" | "row" | "entry" | "heading";

export type SearchEntry = {
  id: string;
  href: string;
  code: string;
  label: string;
  heading: string;
  kind: SearchKind;
  num: string;
  text: string;
};

type Draft = Omit<SearchEntry, "text"> & { lines: string[] };

// Strips Markdown characters so the search text stays clean.
function plain(line: string): string {
  return line
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\\$/, "")
    .replace(/^\s*>\s?/, "")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/, "")
    .trim();
}

// Definitions of the catalogue offences are searchable too, so „Putsch“ finds Hochverrat.
export function buildSearchIndex(
  doc: RechtskodexDocument,
  definitions: Map<string, string> = new Map(),
): SearchEntry[] {
  const drafts: Draft[] = [];

  for (const section of doc.sections) {
    const sectionCode = /\(([^()]+)\)\s*$/.exec(section.title)?.[1] ?? "";
    let code = sectionCode;

    let current: Draft = {
      id: section.id,
      href: `#${section.id}`,
      code: sectionCode,
      label: "",
      heading: section.title,
      kind: "heading",
      num: "",
      lines: [],
    };
    drafts.push(current);

    for (const line of section.body.split("\n")) {
      const heading = /^(#{3,4}) (.+)$/.exec(line);
      if (heading) {
        const title = heading[2].trim();

        // Law names such as „Beamtengesetz (BeamtG)“ only set the code for the paragraphs that follow.
        const law = /\(([^()]+)\)$/.exec(title);
        if (heading[1] === "###" && law) {
          code = law[1];
          continue;
        }

        const norm = /^(Art\.|§) (\d+)/.exec(title);
        const id = `${section.id}--${slugify(title)}`;
        current = {
          id,
          href: `#${id}`,
          code,
          label: norm ? (norm[1] === "Art." ? `Art. ${norm[2]}` : `§ ${norm[2]}`) : "",
          heading: title,
          kind: norm ? (norm[1] === "Art." ? "art" : "par") : "entry",
          num: norm?.[2] ?? "",
          lines: [],
        };
        drafts.push(current);
        continue;
      }

      // Penalty catalogue: every row becomes its own hit with its own anchor (see tr on the codex page).
      const row = /^\| (\d+) \| (.+?) \| (.+?) \| (.+?) \|$/.exec(line);
      if (row) {
        const [, num, crime, he, dollars] = row;
        const parts = [
          he.trim() === "–" ? "" : `${he.trim()} HE`,
          dollars.trim() === "–" ? "" : `${dollars.trim()} $`,
        ].filter(Boolean);
        drafts.push({
          id: `${section.id}--row-${num}`,
          href: `#${section.id}--row-${num}`,
          code,
          label: `§ ${num}`,
          heading: crime.trim(),
          kind: "row",
          num,
          lines: [parts.join(" · "), definitions.get(num) ?? ""],
        });
        continue;
      }

      // Other tables collapse into a single line joined with separator dots.
      if (line.startsWith("|")) {
        if (/^\|[\s|-]+\|$/.test(line)) continue;
        current.lines.push(
          line
            .split("|")
            .slice(1, -1)
            .map((cell) => cell.trim())
            .filter(Boolean)
            .join(" · "),
        );
        continue;
      }

      // Diagram placeholders (schaubild.tsx) carry no searchable text.
      if (line.startsWith("::schaubild")) continue;
      if (line.trim()) current.lines.push(plain(line));
    }
  }

  return drafts.map(({ lines, ...entry }) => ({
    ...entry,
    text: lines.filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
  }));
}
