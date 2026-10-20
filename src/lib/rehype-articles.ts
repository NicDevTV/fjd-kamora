import type { Element, ElementContent, Root, RootContent } from "hast";

function isArticleHeading(node: RootContent): node is Element {
  return node.type === "element" && (node.tagName === "h3" || node.tagName === "h4");
}

function isBlank(node: RootContent | ElementContent) {
  return node.type === "text" && !node.value.trim();
}

// Wraps every article or paragraph heading (h3, h4) together with its text in a <section>,
// so each norm becomes its own card. Text before the first heading gets a card as well.
// Headings without text of their own, such as „Beamtengesetz (BeamtG)“, stay free-standing
// and group the cards below them.
export function rehypeArticles() {
  return (tree: Root) => {
    const sections: Element[] = [];
    let current: Element | null = null;

    for (const node of tree.children) {
      if (isArticleHeading(node)) {
        current = { type: "element", tagName: "section", properties: {}, children: [node] };
        sections.push(current);
        continue;
      }
      if (isBlank(node) || node.type === "doctype") continue;
      if (!current) {
        current = { type: "element", tagName: "section", properties: {}, children: [] };
        sections.push(current);
      }
      current.children.push(node as ElementContent);
    }

    tree.children = sections.map((section) => {
      const content = section.children.filter((child) => !isBlank(child));
      const onlyHeading = content.length === 1 && isArticleHeading(content[0] as RootContent);
      return onlyHeading ? (content[0] as RootContent) : section;
    });
  };
}
