import type { ReactNode } from "react";
import { ABBREVIATION_PATTERN, ABBREVIATIONS } from "@/lib/abbreviations";

// An abbreviation with its full form in a glass tooltip on hover (globals.css, .fjd-abbr).
// Screen readers get the full form as visually hidden text instead of the tooltip.
export function Abbr({ short }: { short: string }) {
  const full = ABBREVIATIONS[short];
  return (
    <abbr className="fjd-abbr" data-full={full}>
      {short}
      <span className="sr-only"> ({full})</span>
    </abbr>
  );
}

// Splits plain text and wraps every known abbreviation. Returns React nodes, never HTML.
export function withAbbreviations(text: string): ReactNode[] {
  return text.split(ABBREVIATION_PATTERN).map((part, index) =>
    index % 2 === 1 ? <Abbr key={index} short={part} /> : part,
  );
}
