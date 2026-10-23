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

export type TemplateGroup = "Ernennung" | "Dienstrecht" | "Waffen" | "Beschlüsse";

export type SealKind = "foederation" | "fjd";

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
  role: Role;
  // Fixed choices for the line under the signature, so nobody can sign with an invented office.
  signerTitles: string[];
  fields: TemplateField[];
  // Values for the thumbnail and an empty form's preview.
  sample: Record<string, string>;
  blocks: (fields: Record<string, string>) => Block[];
  // Rules between fields that single-field validation cannot express; returns an error message.
  check?: (values: Record<string, string>) => string | null;
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
export const or = (value: string | undefined, fallback: string) => (value && value.trim() ? value : fallback);

