import type { Element, ElementContent, Root } from "hast";

function textOf(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
}

function elements(node: Element, tagName: string): Element[] {
  return node.children.filter((child): child is Element => child.type === "element" && child.tagName === tagName);
}

function walk(node: Root | Element, visit: (element: Element) => void) {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    visit(child);
    walk(child, visit);
  }
}

// On phones the codex tables are stacked into rows (globals.css, .rk-table), so every cell
// needs the name of its column. This copies the header text onto each cell as data-label.
// Tables keyed by a short code (§ or Kürzel) are marked so code and name share one line.
export function rehypeTableLabels() {
  return (tree: Root) => {
    walk(tree, (table) => {
      if (table.tagName !== "table") return;
      const headRow = elements(table, "thead").flatMap((head) => elements(head, "tr"))[0];
      if (!headRow) return;
      const labels = elements(headRow, "th").map((cell) => textOf(cell).trim());
      if (labels[0] === "§" || labels[0] === "Kürzel") table.properties.dataKeyed = "true";

      for (const body of elements(table, "tbody")) {
        for (const row of elements(body, "tr")) {
          elements(row, "td").forEach((cell, index) => {
            if (labels[index]) cell.properties.dataLabel = labels[index];
          });
        }
      }
    });
  };
}
