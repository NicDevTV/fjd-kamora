import type { Role } from "@/lib/server/db/types";
import { fjdOffices } from "./ranks";
import { formatDate, or, type Template } from "./template-kit";
import { serviceTemplates } from "./templates-service";

export { formatDate } from "./template-kit";
export type { Block, FieldType, SealKind, Template, TemplateField, TemplateGroup } from "./template-kit";

const DISMISSAL_KINDS = ["ehrenhaft", "unehrenhaft"];

// "ehrenhaft" / "unehrenhaft" in the sentence of the certificate; the preview shows a placeholder until chosen.
const dismissalKind = (value: string | undefined) => (value === "unehrenhaft" ? "unehrenhaft" : value === "ehrenhaft" ? "ehrenhaft" : "…");

const dismissalNote = (value: string | undefined) =>
  value === "unehrenhaft"
    ? "Rang und Titel erlöschen (§ 9 BeamtG)."
    : "Für die geleisteten Dienste wird gedankt. Rang und Titel dürfen mit dem Zusatz „a. D.“ geführt werden (§ 9 BeamtG).";

const ernennungJm: Template = {
  id: "ernennung-jm",
  group: "Ernennung",
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
  group: "Dienstrecht",
  label: "Entlassung des Justizministers",
  description: "Der Sicherheitsrat entlässt den Justizminister; der Staatssekretär führt weiter.",
  title: "Entlassungsurkunde",
  formula: "Im Namen des Staates Kamora",
  issuer: "Der Sicherheitsrat",
  seal: "foederation",
  legalBasis: "Art. 7, Art. 12 und Art. 13 der Verfassung des Staates Kamora und § 9 des Beamtengesetzes",
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
    { name: "art", label: "Art der Entlassung", type: "select", required: true, options: DISMISSAL_KINDS },
  ],
  sample: { name: "Marlene Hartenstein", wirksam: "2026-12-31", grund: "auf eigenen Wunsch", art: "ehrenhaft" },
  dishonourableReason: "nach Amtsenthebung durch Senat und OGH",
  check: (values) =>
    values.art === "unehrenhaft" && values.grund !== "nach Amtsenthebung durch Senat und OGH"
      ? "Unehrenhaft entlassen wird der Justizminister nur nach einer Amtsenthebung durch Senat und OGH (§ 9 BeamtG)."
      : null,
  blocks: (fields) => [
    { kind: "text", text: "Auf Grundlage von Art. 7 und Art. 12 der Verfassung des Staates Kamora entlässt der Sicherheitsrat" },
    { kind: "name", text: or(fields.name, "Name des Entlassenen") },
    { kind: "text", text: `${dismissalKind(fields.art)} ${or(fields.grund, "…")} mit Ablauf des ${or(formatDate(fields.wirksam), "…")} aus dem Amt des` },
    { kind: "office", text: "Justizministers des Staates Kamora" },
    {
      kind: "text",
      text: `Bis zur Ernennung eines Nachfolgers führt der Staatssekretär die Amtsgeschäfte (Art. 13 der Verfassung). ${dismissalNote(fields.art)}`,
    },
  ],
};

const ernennungFjd: Template = {
  id: "ernennung-fjd",
  group: "Ernennung",
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
    { name: "amt", label: "Amt", type: "select", required: true, options: fjdOffices },
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
  group: "Dienstrecht",
  label: "Entlassung im FJD",
  description: "Der Justizminister entlässt aus einem Amt des Departements (§ 6 BeamtG).",
  title: "Entlassungsurkunde",
  formula: "Im Namen des Staates Kamora",
  issuer: "Der Justizminister",
  seal: "fjd",
  legalBasis: "§§ 6 und 9 des Beamtengesetzes und § 9 des FJD-Statuts",
  role: "justizminister",
  signerTitles: ["Justizminister des Staates Kamora", "Staatssekretär im Föderalen Justizdepartement"],
  fields: [
    { name: "name", label: "Name des Entlassenen", type: "text", required: true, maxLength: 60, placeholder: "Vor- und Nachname" },
    { name: "amt", label: "Bisheriges Amt", type: "select", required: true, options: [...fjdOffices, "Chief Marshal"] },
    { name: "wirksam", label: "Entlassen mit Ablauf des", type: "date", required: true },
    {
      name: "grund",
      label: "Grund",
      type: "select",
      required: true,
      options: ["auf eigenen Wunsch", "nach Beschluss der Disziplinarkammer", "wegen Inaktivität (Art. 13 KV)"],
    },
    { name: "art", label: "Art der Entlassung", type: "select", required: true, options: DISMISSAL_KINDS },
  ],
  sample: { name: "Jonas Brandt", amt: "Staatsanwalt", wirksam: "2026-12-31", grund: "auf eigenen Wunsch", art: "ehrenhaft" },
  dishonourableReason: "nach Beschluss der Disziplinarkammer",
  check: (values) =>
    values.art === "unehrenhaft" && values.grund !== "nach Beschluss der Disziplinarkammer"
      ? "Unehrenhaft entlassen wird nur nach einem Beschluss der Disziplinarkammer (§ 9 BeamtG)."
      : null,
  blocks: (fields) => [
    { kind: "text", text: "Aus dem Föderalen Justizdepartement wird" },
    { kind: "name", text: or(fields.name, "Name des Entlassenen") },
    { kind: "text", text: `${dismissalKind(fields.art)} ${or(fields.grund, "…")} mit Ablauf des ${or(formatDate(fields.wirksam), "…")} aus dem Amt` },
    { kind: "office", text: or(fields.amt, "Amt") },
    { kind: "text", text: `entlassen. Dienstausweis und Ausrüstung sind zurückzugeben (§ 3 BeamtG). ${dismissalNote(fields.art)}` },
  ],
};

export const TEMPLATES: Template[] = [ernennungJm, ernennungFjd, ...serviceTemplates.filter((t) => t.group === "Ernennung"), entlassungJm, entlassungFjd, ...serviceTemplates.filter((t) => t.group !== "Ernennung")];

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
  const problem = template.check?.(values);
  if (problem) return { error: problem };
  return { values };
}
