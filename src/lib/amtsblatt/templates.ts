// Templates of the Amtsblatt generator. Each one describes its form fields and turns the
// entered values into the text blocks of the certificate (pdf.tsx lays them out).

export type FieldType = "text" | "date" | "select";

export type TemplateField = {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  maxLength?: number;
  options?: string[];
  hint?: string;
};

export type Block =
  | { kind: "text"; text: string }
  | { kind: "name"; text: string }
  | { kind: "office"; text: string };

export type Issuer = {
  // Small capitals above the title, e.g. "Föderation".
  realm: string;
  // The issuing body under it, e.g. "Der Föderationsrat".
  body: string;
};

export type SealKind = "foederation" | "fjd";

export type Template = {
  id: string;
  label: string;
  description: string;
  title: string;
  issuer: Issuer;
  seal: SealKind;
  legalBasis: string;
  defaultSignerTitle: string;
  fields: TemplateField[];
  blocks: (fields: Record<string, string>) => Block[];
};

const DATE_FORMAT = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
}

const ernennungJm: Template = {
  id: "ernennung-jm",
  label: "Ernennung des Justizministers",
  description: "Ernennungsurkunde des Föderationsrats nach Art. 7 und Art. 12 der Verfassung.",
  title: "Ernennungsurkunde",
  issuer: { realm: "Föderation", body: "Der Föderationsrat" },
  seal: "foederation",
  legalBasis: "Art. 7 und Art. 12 der Verfassung des Staates Kamora",
  defaultSignerTitle: "Für den Föderationsrat",
  fields: [
    { name: "name", label: "Name des Ernannten", type: "text", required: true, maxLength: 60 },
    { name: "wirksam", label: "Wirksam ab", type: "date", required: true },
  ],
  blocks: (fields) => [
    { kind: "text", text: "Auf Grundlage von Art. 7 und Art. 12 der Verfassung des Staates Kamora ernennt der Föderationsrat" },
    { kind: "name", text: fields.name },
    { kind: "text", text: `mit Wirkung vom ${formatDate(fields.wirksam)} zum` },
    { kind: "office", text: "Justizminister des Staates Kamora" },
    {
      kind: "text",
      text: "Der Ernannte leitet das Föderale Justizdepartement. Er ist parteilos, an Verfassung und Gesetze gebunden und der Charta der Föderation verpflichtet. Lex supra omnes.",
    },
  ],
};

const entlassungJm: Template = {
  id: "entlassung-jm",
  label: "Entlassung des Justizministers",
  description: "Entlassungsurkunde des Föderationsrats; die Amtsgeschäfte gehen an den Staatssekretär.",
  title: "Entlassungsurkunde",
  issuer: { realm: "Föderation", body: "Der Föderationsrat" },
  seal: "foederation",
  legalBasis: "Art. 7, Art. 12 und Art. 13 der Verfassung des Staates Kamora",
  defaultSignerTitle: "Für den Föderationsrat",
  fields: [
    { name: "name", label: "Name des Entlassenen", type: "text", required: true, maxLength: 60 },
    { name: "wirksam", label: "Entlassen mit Ablauf des", type: "date", required: true },
    {
      name: "grund",
      label: "Grund",
      type: "select",
      required: true,
      options: ["auf eigenen Wunsch", "durch Beschluss des Föderationsrats", "nach Amtsenthebung durch Senat und OGH"],
    },
  ],
  blocks: (fields) => [
    { kind: "text", text: "Auf Grundlage von Art. 7 und Art. 12 der Verfassung des Staates Kamora entlässt der Föderationsrat" },
    { kind: "name", text: fields.name },
    { kind: "text", text: `${fields.grund} mit Ablauf des ${formatDate(fields.wirksam)} aus dem Amt des` },
    { kind: "office", text: "Justizministers des Staates Kamora" },
    {
      kind: "text",
      text: "Bis zur Ernennung eines Nachfolgers führt der Staatssekretär die Amtsgeschäfte (Art. 13 der Verfassung). Dem Entlassenen wird für seine Dienste gedankt.",
    },
  ],
};

export const TEMPLATES: Template[] = [ernennungJm, entlassungJm];

export function getTemplate(id: string) {
  return TEMPLATES.find((template) => template.id === id) ?? null;
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
    if (field.type === "date" && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { error: `„${field.label}“ ist kein gültiges Datum.` };
    }
    if (field.type === "select" && value && !field.options?.includes(value)) {
      return { error: `„${field.label}“ hat einen unbekannten Wert.` };
    }
    values[field.name] = value;
  }
  return { values };
}
