import { readFileSync } from "node:fs";
import path from "node:path";
import { slugify } from "@/lib/slugify";

// The codex is read from the repository at build time and served as a static page.
// Visitors cannot change the text; changes only go through a commit and a new deployment.
const SOURCE = path.join(process.cwd(), "content", "rechtskodex-kamora-v1.md");

export type RechtskodexSection = {
  id: string;
  title: string;
  body: string;
};

export type RechtskodexDocument = {
  meta: Record<string, string>;
  sections: RechtskodexSection[];
};

export { slugify };

export function getRechtskodex(): RechtskodexDocument {
  // Windows checkouts may use CRLF; every parser below expects plain line feeds.
  const raw = readFileSync(SOURCE, "utf8").replace(/\r\n/g, "\n");

  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(raw);
  const meta = Object.fromEntries(
    (frontmatter?.[1] ?? "").split("\n").map((line) => {
      const colon = line.indexOf(":");
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
    }),
  );
  const body = raw.slice(frontmatter ? frontmatter[0].length : 0);

  const sections = body
    .split(/^## /m)
    .slice(1)
    .map((chunk) => {
      const [heading, ...rest] = chunk.split("\n");
      const title = heading.trim();
      return { id: slugify(title), title, body: rest.join("\n") };
    });

  return { meta, sections };
}
