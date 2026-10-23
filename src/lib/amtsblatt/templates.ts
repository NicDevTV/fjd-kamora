import type { Role } from "@/lib/server/db/types";

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

export type SealKind = "foederation" | "fjd";

export type Template = {
  id: string;
  label: string;
  description: string;
  title: string;
  // Formula above the title ("Im Namen des Staates Kamora") and the issuing body under it.
  formula: string;
  issuer: string;
  seal: SealKind;
  legalBasis: string;
  // Only holders of this role may issue the document.
  role: Role;
  // Fixed choices for the line under the signature, so nobody can sign with an invented office.
  signerTitles: string[];
  fields: TemplateField[];
  // Values for the thumbnail and an empty form's preview.
  sample: Record<string, string>;
  blocks: (fields: Record<string, string>) => Block[];
};

const DATE_FORMAT = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
}

// Placeholder text in the preview while a field is still empty.
const or = (value: string | undefined, fallback: string) => (value && value.trim() ? value : fallback);

const FJD_OFFICES = ["Staatsanwalt", "Oberstaatsanwalt", "Deputy Marshal", "Marshal", "Anwärter des Justizmarschalldienstes"];

const ernennungJm: Template = {
  id: "ernennung-jm",
  label: "Ernennung des Justizministers",
  description: "Der Sicherheitsrat ernennt den Justizminister (Art. 7 und 12 KV).",
  title: "Ernennungsurkunde",
  formula: "Im Namen des Staates Kamora",
  issuer: "Der Sicherheitsrat",
  seal: "foederation",
  legalBasis: "Art. 7 und Art. 12 der Verfassung des Staates Kamora",
  role: "sicherheitsrat",
  signerTitles: ["Vorsitzender des Sicherheitsrats", "Mitglied des Sicherheitsrats"],
  fields: [
    { name: "name", label: "Name des Ernannten", type: "text", required: true, maxLength: 60, placeholder: "Vor- und Nachname" },
    { name: "wirksam", label: "Wirksam ab", type: "date", required: true },
  ],
  sample: { name: "Marlene Hartenstein", wirksam: "2026-11-01" },
  blocks: (fields) => [
    { kind: "text", text: "Auf Grundlage von Art. 7 und Art. 12 der Verfassung des Staates Kamora ernennt der Sicherheitsrat" },
    { kind: "name", text: or(fields.name, "Name des Ernannten") },
    { kind: "text", text: `mit Wirkung vom ${or(formatDate(fields.wirksam), "…")} zum` },
    { kind: "office", text: "Justizminister des Staates Kamora" },
    {
      kind: "text",
      text: "Der Ernannte leitet das Föderale Justizdepartement. Er ist parteilos, an Verfassung und Gesetze gebunden und der Charta des Sicherheitsrats verpflichtet.",
    },
  ],
};

const entlassungJm: Template = {
  id: "entlassung-jm",
  label: "Entlassung des Justizministers",
  description: "Der Sicherheitsrat entlässt den Justizminister; der Staatssekretär führt weiter.",
  title: "Entlassungsurkunde",
  formula: "Im Namen des Staates Kamora",
  issuer: "Der Sicherheitsrat",
  seal: "foederation",
  legalBasis: "Art. 7, Art. 12 und Art. 13 der Verfassung des Staates Kamora",
  role: "sicherheitsrat",
  signerTitles: ["Vorsitzender des Sicherheitsrats", "Mitglied des Sicherheitsrats"],
  fields: [
    { name: "name", label: "Name des Entlassenen", type: "text", required: true, maxLength: 60, placeholder: "Vor- und Nachname" },
    { name: "wirksam", label: "Entlassen mit Ablauf des", type: "date", required: true },
    {
      name: "grund",
      label: "Grund",
      type: "select",
      required: true,
      options: ["auf eigenen Wunsch", "durch Beschluss des Sicherheitsrats", "nach Amtsenthebung durch Senat und OGH"],
    },
  ],
  sample: { name: "Marlene Hartenstein", wirksam: "2026-12-31", grund: "auf eigenen Wunsch" },
  blocks: (fields) => [
    { kind: "text", text: "Auf Grundlage von Art. 7 und Art. 12 der Verfassung des Staates Kamora entlässt der Sicherheitsrat" },
    { kind: "name", text: or(fields.name, "Name des Entlassenen") },
    { kind: "text", text: `${or(fields.grund, "…")} mit Ablauf des ${or(formatDate(fields.wirksam), "…")} aus dem Amt des` },
    { kind: "office", text: "Justizministers des Staates Kamora" },
    {
      kind: "text",
      text: "Bis zur Ernennung eines Nachfolgers führt der Staatssekretär die Amtsgeschäfte (Art. 13 der Verfassung). Dem Entlassenen wird für seine Dienste gedankt.",
    },
  ],
};

const ernennungFjd: Template = {
  id: "ernennung-fjd",
  label: "Ernennung im FJD",
  description: "Der Justizminister ernennt Staatsanwälte und Justizmarschalle (§ 2 BeamtG).",
  title: "Ernennungsurkunde",
  formula: "Im Namen des Staates Kamora",
  issuer: "Der Justizminister",
  seal: "fjd",
  legalBasis: "§ 2 des Beamtengesetzes und § 3 des FJD-Statuts",
  role: "justizminister",
  signerTitles: ["Justizminister des Staates Kamora", "Staatssekretär im Föderalen Justizdepartement"],
  fields: [
    { name: "name", label: "Name des Ernannten", type: "text", required: true, maxLength: 60, placeholder: "Vor- und Nachname" },
    { name: "amt", label: "Amt", type: "select", required: true, options: FJD_OFFICES },
    { name: "wirksam", label: "Wirksam ab", type: "date", required: true },
  ],
  sample: { name: "Jonas Brandt", amt: "Staatsanwalt", wirksam: "2026-11-01" },
  blocks: (fields) => [
    { kind: "text", text: "Im Föderalen Justizdepartement wird" },
    { kind: "name", text: or(fields.name, "Name des Ernannten") },
    { kind: "text", text: `mit Wirkung vom ${or(formatDate(fields.wirksam), "…")} ernannt zum` },
    { kind: "office", text: or(fields.amt, "Amt") },
    {
      kind: "text",
      text: "Die Ernennung wird mit dem Diensteid wirksam (§ 2 BeamtG). Der Ernannte ist dem Gesetz verpflichtet und dient dem Volk von Kamora. Lex supra omnes.",
    },
  ],
};

const entlassungFjd: Template = {
  id: "entlassung-fjd",
  label: "Entlassung im FJD",
  description: "Der Justizminister entlässt aus einem Amt des Departements (§ 6 BeamtG).",
  title: "Entlassungsurkunde",
  formula: "Im Namen des Staates Kamora",
  issuer: "Der Justizminister",
  seal: "fjd",
  legalBasis: "§ 6 des Beamtengesetzes und § 9 des FJD-Statuts",
  role: "justizminister",
  signerTitles: ["Justizminister des Staates Kamora", "Staatssekretär im Föderalen Justizdepartement"],
  fields: [
    { name: "name", label: "Name des Entlassenen", type: "text", required: true, maxLength: 60, placeholder: "Vor- und Nachname" },
    { name: "amt", label: "Bisheriges Amt", type: "select", required: true, options: FJD_OFFICES },
    { name: "wirksam", label: "Entlassen mit Ablauf des", type: "date", required: true },
    {
      name: "grund",
      label: "Grund",
      type: "select",
      required: true,
      options: ["auf eigenen Wunsch", "nach Beschluss der Disziplinarkammer", "wegen Inaktivität (Art. 13 KV)"],
    },
  ],
  sample: { name: "Jonas Brandt", amt: "Staatsanwalt", wirksam: "2026-12-31", grund: "auf eigenen Wunsch" },
  blocks: (fields) => [
    { kind: "text", text: "Aus dem Föderalen Justizdepartement wird" },
    { kind: "name", text: or(fields.name, "Name des Entlassenen") },
    { kind: "text", text: `${or(fields.grund, "…")} mit Ablauf des ${or(formatDate(fields.wirksam), "…")} aus dem Amt` },
    { kind: "office", text: or(fields.amt, "Amt") },
    { kind: "text", text: "entlassen. Dienstausweis und Ausrüstung sind zurückzugeben (§ 3 BeamtG). Für die geleisteten Dienste wird gedankt." },
  ],
};

export const TEMPLATES: Template[] = [ernennungJm, entlassungJm, ernennungFjd, entlassungFjd];

export function getTemplate(id: string) {
  return TEMPLATES.find((template) => template.id === id) ?? null;
}

export function templatesFor(roles: Role[]) {
  return TEMPLATES.filter((template) => roles.includes(template.role));
}

// Checks the submitted values against the template: required, length, allowed options,
// real dates. Returns clean values or the first problem in plain language.
export function validateFields(template: Template, input: Record<string, string>) {
  const values: Record<string, string> = {};
  for (const field of template.fields) {
    const value = (input[field.name] ?? "").replace(/\s+/g, " ").trim();
    if (field.required && !value) return { error: `„${field.label}“ fehlt.` };
    if (field.maxLength && value.length > field.maxLength) {
      return { error: `„${field.label}“ ist zu lang (höchstens ${field.maxLength} Zeichen).` };
    }
    if (field.type === "date" && value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)))) {
      return { error: `„${field.label}“ ist kein gültiges Datum.` };
    }
    if (field.type === "select" && value && !field.options?.includes(value)) {
      return { error: `„${field.label}“ hat einen unbekannten Wert.` };
    }
    values[field.name] = value;
  }
  return { values };
}
