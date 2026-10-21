import { readFileSync } from "node:fs";
import path from "node:path";

// Definitions for the penalty catalogue, read at build time like the codex itself.
// Format of the source: one line per offence, „§ 10: definition“.
const SOURCE = path.join(process.cwd(), "content", "tatbestaende-kamora-v1.md");

export function getTatbestaende(): Map<string, string> {
  const definitions = new Map<string, string>();
  for (const line of readFileSync(SOURCE, "utf8").split(/\r?\n/)) {
    const match = /^§ (\d+): (.+)$/.exec(line.trim());
    if (match) definitions.set(match[1], match[2]);
  }
  return definitions;
}
