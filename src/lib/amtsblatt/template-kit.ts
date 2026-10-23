import type { Role } from "@/lib/server/db/types";

// Types and helpers shared by the Amtsblatt templates.
// Templates of the Amtsblatt generator. Each one describes its form fields, who may issue it,
// and turns the entered values into the text blocks of the certificate. The same blocks feed
// the PDF (pdf.tsx) and the live preview on the page (certificate-preview.tsx).

export type FieldType = "text" | "date" | "select";

export type TemplateField = {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  maxLength?: number;
  options?: string[];
  placeholder?: string;
};

export type Block =
  | { kind: "text"; text: string }
  | { kind: "name"; text: string }
  | { kind: "office"; text: string };

// Another office stamps the document after it was issued: consent, review or objection. Any holder of
// one of the roles may do it, except the issuer. The first decision is the approving one; the second,
// if any, rejects and makes the document void.
export type Countersign = {
  key?: string;
  afterPrevious?: boolean;
  roles: Role[];
  label: string;
  decisions: [string] | [string, string];
  // Shown beside the open request, e.g. a deadline from the law.
  note?: string;
};

export type TemplateGroup = "Amtsleitungen" | "Ernennung" | "Dienstrecht" | "Waffen" | "Beschlüsse";

// Whose seal the wax shows: the Sicherheitsrat, the FJD, the government or the courts.
export type SealKind = "sicherheitsrat" | "fjd" | "kamora" | "gericht";

export type Template = {
  id: string;
  // Section of the template gallery.
  group: TemplateGroup;
  label: string;
  description: string;
  title: string;
  // Formula above the title ("Im Namen des Staates Kamora") and the issuing body under it.
  formula: string;
  issuer: string;
  seal: SealKind;
  legalBasis: string;
  // Only holders of this role may issue the document.
  roles: Role[];
  fields: TemplateField[];
  // Values for the thumbnail and an empty form's preview.
  sample: Record<string, string>;
  blocks: (fields: Record<string, string>) => Block[];
  // Rules between fields that single-field validation cannot express; returns an error message.
  check?: (values: Record<string, string>) => string | null;
  // Countersignatures the document needs, by its values. None means it is valid once issued.
  countersigns?: (values: Record<string, string>) => Countersign[];
  // The issuer is the first judge; two other people must countersign.
  judicialQuorum?: 3;
  // The one reason (option of "grund") that allows a dishonourable dismissal; chosen automatically.
  dishonourableReason?: string;
};

const DATE_FORMAT = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
}

// Placeholder text in the preview while a field is still empty.
// The person or object a document is about, for lists and messages.
export const subjectOf = (fields: Record<string, string>) => fields.name || fields.objekt || "";

export const or = (value: string | undefined, fallback: string) => (value && value.trim() ? value : fallback);

export const DISMISSAL_KINDS = ["ehrenhaft", "unehrenhaft"];

// "ehrenhaft" / "unehrenhaft" in the sentence of the certificate; the preview shows a placeholder until chosen.
export const dismissalKind = (value: string | undefined) => (value === "unehrenhaft" ? "unehrenhaft" : value === "ehrenhaft" ? "ehrenhaft" : "…");

export const dismissalNote = (value: string | undefined) =>
  value === "unehrenhaft"
    ? "Rang und Titel erlöschen (§ 9 BeamtG)."
    : "Für die geleisteten Dienste wird gedankt. Rang und Titel dürfen mit dem Zusatz „a. D.“ geführt werden (§ 9 BeamtG).";

