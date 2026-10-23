import type { DocumentRecord } from "@/lib/server/db/types";
import { formatDate, type Template, type Block } from "./template-kit";

// Publication is opt-in. New templates, private licences, disciplinary matters
// and court/investigation records stay internal until explicitly reviewed here.
const PUBLIC_TEMPLATES = {
  "ernennung-jm": "Ernennung",
  "ernennung-fjd": "Ernennung",
  "ernennung-staatssekretaer": "Ernennung",
  "ernennung-amtsleiter": "Ernennung",
  "ernennung-gsta": "Ernennung",
  "ernennung-richter": "Ernennung",
  "ernennung-chief": "Ernennung",
  "ernennung-minister": "Ernennung",
  "entlassung-jm": "Entlassung",
  "entlassung-fjd": "Entlassung",
  vereidigung: "Vereidigung",
  befoerderung: "Beförderung",
} as const;

type PublicTemplateId = keyof typeof PUBLIC_TEMPLATES;

export function isPublicTemplate(id: string): id is PublicTemplateId {
  return Object.hasOwn(PUBLIC_TEMPLATES, id);
}

// Only these facts may leave the app. Never spread document.fields or render
// certificate blocks with unfiltered fields: reasons and case details are private.
export function publicNotice(document: Pick<DocumentRecord, "template" | "fields">) {
  const { template, fields } = document;
  if (!isPublicTemplate(template)) return null;
  let office: string;
  switch (template) {
    case "ernennung-jm":
    case "entlassung-jm": office = "Justizminister des Staates Kamora"; break;
    case "ernennung-staatssekretaer": office = "Staatssekretär im Föderalen Justizdepartement"; break;
    case "ernennung-gsta": office = "Generalstaatsanwalt von Kamora"; break;
    case "ernennung-chief": office = "Chief of Police"; break;
    case "ernennung-richter": office = `Richter am ${fields.gericht || "Gericht"}`; break;
    case "ernennung-minister": office = `Minister für ${fields.ressort || "…"}`; break;
    case "befoerderung": office = fields.nach; break;
    default: office = fields.amt;
  }
  return {
    kind: PUBLIC_TEMPLATES[template],
    name: fields.name || "…",
    office: office || "…",
    date: template === "vereidigung" ? fields.datum : fields.wirksam,
    dateLabel: template === "vereidigung" ? "Vereidigt am" : template.startsWith("entlassung-") ? "Entlassen mit Ablauf des" : "Mit Wirkung vom",
  };
}

// Explicit field projection before invoking any certificate renderer. Keep the
// original typography and wording; only private passages get a public version.
export function publicCertificateInput(document: DocumentRecord, template: Template) {
  if (document.template !== template.id || !isPublicTemplate(template.id)) return null;
  const allowed: Record<PublicTemplateId, string[]> = {
    "ernennung-jm": ["name", "wirksam"], "ernennung-fjd": ["name", "wirksam", "amt"],
    "ernennung-staatssekretaer": ["name", "wirksam"], "ernennung-amtsleiter": ["name", "wirksam", "amt"],
    "ernennung-gsta": ["name", "wirksam"], "ernennung-richter": ["name", "wirksam", "gericht"],
    "ernennung-chief": ["name", "wirksam"], "ernennung-minister": ["name", "wirksam", "ressort"],
    "entlassung-jm": ["name", "wirksam"], "entlassung-fjd": ["name", "wirksam", "amt"],
    vereidigung: ["name", "datum", "amt"], befoerderung: ["name", "wirksam", "nach"],
  };
  const fields = Object.fromEntries(allowed[template.id].map((key) => [key, document.fields[key] ?? ""]));
  const notice = publicNotice({ template: template.id, fields })!;
  let blocks: Block[] = template.blocks(fields);
  if (notice.kind === "Entlassung") {
    blocks = [blocks[0], blocks[1],
      { kind: "text", text: `mit Ablauf des ${formatDate(notice.date || "")} aus dem Amt des` },
      { kind: "office", text: notice.office },
      { kind: "text", text: "entlassen." }];
  } else if (notice.kind === "Beförderung") {
    blocks = blocks.map((block, index) => index === 2 ? { kind: "text", text: `mit Wirkung vom ${formatDate(notice.date || "")} befördert zum` } : block);
  }
  return { document: { ...document, fields }, template: { ...template, blocks: () => blocks } };
}

export const PUBLICATION_HINT = {
  public: "Nach vollständiger Gegenzeichnung: Name, Amt und Datum werden als öffentliche Bekanntmachung nach Discord gesendet. Gründe und vollständige PDFs bleiben intern.",
  internal: "Vertraulicher Vorgang: Diese Urkunde und ihre Gegenzeichnungen werden nicht nach Discord gesendet.",
};
