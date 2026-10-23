import { getRechtskodex } from "@/lib/rechtskodex";
import { buildSearchIndex } from "@/lib/rechtskodex-index";
import { getTatbestaende } from "@/lib/tatbestaende";

// The search index is about a megabyte of text. It lives outside the page so the codex HTML stays
// small; the search loads it once on first use. Prerendered at build time, cached by the browser.
export function GET() {
  const entries = buildSearchIndex(getRechtskodex(), getTatbestaende());
  return Response.json(entries, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
