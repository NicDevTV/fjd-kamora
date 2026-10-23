import { formatDate, or, type Countersign, type Template, type TemplateField } from "./template-kit";

// Templates of the other offices: the Gouverneur's appointments and pardons and the courts' orders. The
// police and other outside authorities promote and dismiss their own people; the FJD stays out of that
// and only connects them (roles to sign in and countersign). Each template names who may issue it.

const FORMULA = "Im Namen des Staates Kamora";
const NAME = (label: string): TemplateField => ({ name: "name", label, type: "text", required: true, maxLength: 60, placeholder: "Vor- und Nachname" });
const WIRKSAM: TemplateField = { name: "wirksam", label: "Wirksam ab", type: "date", required: true };

const SENATE_CONFIRMS: Countersign = {
  roles: ["senatspraesident"],
  label: "Bestätigung durch den Senat",
  decisions: ["bestätigt", "abgelehnt"],
};

const governor: Pick<Template, "formula" | "issuer" | "seal" | "roles"> = {
  formula: FORMULA,
  issuer: "Der Gouverneur",
  seal: "kamora",
  roles: ["gouverneur"],
};

const ernennungGstA: Template = {
  ...governor,
  id: "ernennung-gsta",
  group: "Ernennung",
  label: "Ernennung des Generalstaatsanwalts",
  description: "Der Gouverneur ernennt auf Vorschlag des Justizministers; der Senat bestätigt (KV 5).",
  title: "Ernennungsurkunde",
  legalBasis: "Art. 5 der Verfassung und § 11 des FJD-Statuts",
  fields: [NAME("Name des Ernannten"), WIRKSAM],
  sample: { name: "Theodor Meisner", wirksam: "2026-11-01" },
  countersigns: () => [SENATE_CONFIRMS],
  blocks: (fields) => [
    { kind: "text", text: "Auf Vorschlag des Justizministers und mit Bestätigung des Senats ernennt der Gouverneur" },
    { kind: "name", text: or(fields.name, "Name des Ernannten") },
    { kind: "text", text: `mit Wirkung vom ${or(formatDate(fields.wirksam), "…")} zum` },
    { kind: "office", text: "Generalstaatsanwalt von Kamora" },
    { kind: "text", text: "Die Ernennung wird mit dem Diensteid wirksam (§ 2 BeamtG). Der Generalstaatsanwalt leitet die Staatsanwaltschaft." },
  ],
};

const ernennungRichter: Template = {
  ...governor,
  id: "ernennung-richter",
  group: "Ernennung",
  label: "Ernennung eines Richters",
  description: "Der Gouverneur ernennt auf Vorschlag des Justizministers; der Senat bestätigt (KV 5).",
  title: "Ernennungsurkunde",
  legalBasis: "Art. 5 und Art. 9 der Verfassung",
  fields: [
    NAME("Name des Ernannten"),
    { name: "gericht", label: "Gericht", type: "select", required: true, options: ["Bezirksgericht", "Oberster Gerichtshof"] },
    WIRKSAM,
  ],
  sample: { name: "Helena Vorwerk", gericht: "Bezirksgericht", wirksam: "2026-11-01" },
  countersigns: () => [SENATE_CONFIRMS],
  blocks: (fields) => [
    { kind: "text", text: "Auf Vorschlag des Justizministers und mit Bestätigung des Senats ernennt der Gouverneur" },
    { kind: "name", text: or(fields.name, "Name des Ernannten") },
    { kind: "text", text: `mit Wirkung vom ${or(formatDate(fields.wirksam), "…")} zum Richter am` },
    { kind: "office", text: or(fields.gericht, "Gericht") },
    { kind: "text", text: "Der Richter schwört auf die Verfassung und ist nur ihr verpflichtet (§ 1 BeamtG). Abgesetzt wird er nur durch Amtsenthebung." },
  ],
};

const ernennungChief: Template = {
  ...governor,
  id: "ernennung-chief",
  group: "Ernennung",
  label: "Ernennung des Chief of Police",
  description: "Der Gouverneur ernennt den Chief of Police (§ 2 PolG).",
  title: "Ernennungsurkunde",
  legalBasis: "§ 2 des Polizeigesetzes",
  fields: [NAME("Name des Ernannten"), WIRKSAM],
  sample: { name: "Konrad von Ellwangen", wirksam: "2026-11-01" },
  blocks: (fields) => [
    { kind: "text", text: "Der Gouverneur ernennt" },
    { kind: "name", text: or(fields.name, "Name des Ernannten") },
    { kind: "text", text: `mit Wirkung vom ${or(formatDate(fields.wirksam), "…")} zum` },
    { kind: "office", text: "Chief of Police" },
    { kind: "text", text: "Der Chief führt das KPD. Personal, Ränge und Dienstpläne liegen allein bei ihm (§ 2 PolG). Die Ernennung wird mit dem Diensteid wirksam." },
  ],
};

const ernennungMinister: Template = {
  ...governor,
  id: "ernennung-minister",
  group: "Ernennung",
  label: "Ernennung eines Ministers",
  description: "Minister außer dem Justizminister ernennt der Gouverneur (KV 5).",
  title: "Ernennungsurkunde",
  legalBasis: "Art. 5 der Verfassung",
  fields: [
    NAME("Name des Ernannten"),
    { name: "ressort", label: "Ressort", type: "text", required: true, maxLength: 50, placeholder: "z. B. Verkehr" },
    WIRKSAM,
  ],
  sample: { name: "Marlene Hartenstein", ressort: "Verkehr", wirksam: "2026-11-01" },
  blocks: (fields) => [
    { kind: "text", text: "Der Gouverneur ernennt" },
    { kind: "name", text: or(fields.name, "Name des Ernannten") },
    { kind: "text", text: `mit Wirkung vom ${or(formatDate(fields.wirksam), "…")} zum` },
    { kind: "office", text: `Minister für ${or(fields.ressort, "…")}` },
    { kind: "text", text: "Der Minister dient dem Gesetz und dem Volk von Kamora. Die Ernennung wird mit dem Diensteid wirksam." },
  ],
};

const gnade: Template = {
  ...governor,
  id: "gnadenentscheid",
  group: "Beschlüsse",
  label: "Gnadenentscheid",
  description: "Der Gouverneur entscheidet auf Vorschlag des Justizministers über Gnade (KV 5, JO 13).",
  title: "Gnadenentscheid",
  legalBasis: "Art. 5 der Verfassung und § 13 der Justizordnung",
  fields: [
    NAME("Name des Antragstellers"),
    { name: "tat", label: "Verurteilt wegen", type: "text", required: true, maxLength: 80, placeholder: "z. B. Raub (§ 30 KStGB)" },
    { name: "entscheidung", label: "Entscheidung", type: "select", required: true, options: ["gewährt", "abgelehnt"] },
  ],
  sample: { name: "Jonas Brandt", tat: "Raub (§ 30 KStGB)", entscheidung: "gewährt" },
  blocks: (fields) => [
    { kind: "text", text: "Über das Gnadengesuch von" },
    { kind: "name", text: or(fields.name, "Name des Antragstellers") },
    { kind: "text", text: `wegen ${or(fields.tat, "…")} entscheidet der Gouverneur auf Vorschlag des Justizministers: Die Gnade wird` },
    { kind: "office", text: or(fields.entscheidung, "…") },
    { kind: "text", text: "Ein Gnadengesuch hemmt die Vollstreckung bis zur Entscheidung (§ 13 JO)." },
  ],
};

const court: Pick<Template, "formula" | "issuer" | "seal" | "roles"> = {
  formula: FORMULA,
  issuer: "Das Gericht",
  seal: "gericht",
  roles: ["richter", "ogh_richter", "oberster_richter"],
};

const haftbefehlRichter: Template = {
  ...court,
  id: "haftbefehl-richter",
  group: "Beschlüsse",
  label: "Haftbefehl des Gerichts",
  description: "Ein Richter erlässt den Haftbefehl (§ 9 JO).",
  title: "Haftbefehl",
  legalBasis: "§ 9 der Justizordnung und § 7 des Polizeigesetzes",
  fields: [
    NAME("Name des Beschuldigten"),
    { name: "tat", label: "Tatvorwurf", type: "text", required: true, maxLength: 80, placeholder: "z. B. Mord (§ 10 KStGB)" },
    { name: "datum", label: "Erlassen am", type: "date", required: true },
  ],
  sample: { name: "Jonas Brandt", tat: "Mord (§ 10 KStGB)", datum: "2026-11-01" },
  blocks: (fields) => [
    { kind: "text", text: `Am ${or(formatDate(fields.datum), "…")} ordnet das Gericht die Festnahme von` },
    { kind: "name", text: or(fields.name, "Name des Beschuldigten") },
    { kind: "text", text: `wegen des dringenden Verdachts auf ${or(fields.tat, "…")} an.` },
    { kind: "text", text: "Das KPD vollstreckt; die Belehrung folgt sofort und vollständig (§ 7 PolG). Vernehmung binnen 30 Minuten (§ 10 JO)." },
  ],
};

const durchsuchungRichter: Template = {
  ...court,
  id: "durchsuchungsbeschluss-richter",
  group: "Beschlüsse",
  label: "Durchsuchungsbeschluss des Gerichts",
  description: "Wohnung oder Firma darf nur mit Beschluss durchsucht werden (§ 6 PolG, JO 9).",
  title: "Durchsuchungsbeschluss",
  legalBasis: "§ 9 der Justizordnung und § 6 des Polizeigesetzes",
  fields: [
    { name: "objekt", label: "Wohnung oder Firma", type: "text", required: true, maxLength: 80, placeholder: "Adresse oder Name" },
    { name: "verdacht", label: "Verdacht", type: "text", required: true, maxLength: 80, placeholder: "z. B. Waffenhandel (§ 52 KStGB)" },
    { name: "datum", label: "Erlassen am", type: "date", required: true },
  ],
  sample: { objekt: "Hafenstraße 12", verdacht: "Waffenhandel (§ 52 KStGB)", datum: "2026-11-01" },
  blocks: (fields) => [
    { kind: "text", text: `Am ${or(formatDate(fields.datum), "…")} ordnet das Gericht die Durchsuchung von` },
    { kind: "name", text: or(fields.objekt, "Wohnung oder Firma") },
    { kind: "text", text: `wegen des Verdachts auf ${or(fields.verdacht, "…")} an.` },
    { kind: "text", text: "Das KPD führt aus. Funde werden dokumentiert und in die Asservatenkammer gebracht (§ 10 PolG)." },
  ],
};

const sonderermittler: Template = {
  formula: FORMULA,
  issuer: "Der Oberste Gerichtshof",
  seal: "gericht",
  roles: ["oberster_richter"],
  id: "sonderermittler",
  group: "Beschlüsse",
  label: "Einsetzung eines Sonderermittlers",
  description: "Der OGH setzt ihn binnen 24 Stunden ein, wenn der Verdacht das FJD oder die Spitze des Staates betrifft (§ 6 JO).",
  title: "Einsetzungsurkunde",
  legalBasis: "§ 6 der Justizordnung",
  fields: [
    NAME("Name des Sonderermittlers"),
    {
      name: "anlass",
      label: "Verdacht gegen",
      type: "select",
      required: true,
      options: [
        "Angehörige des FJD",
        "den Staatssekretär",
        "den Justizminister",
        "den Generalstaatsanwalt",
        "den Gouverneur",
        "die Leitung des KPD",
      ],
    },
    { name: "datum", label: "Eingesetzt am", type: "date", required: true },
  ],
  sample: { name: "Helena Vorwerk", anlass: "den Staatssekretär", datum: "2026-11-01" },
  blocks: (fields) => [
    { kind: "text", text: `Am ${or(formatDate(fields.datum), "…")} setzt der Oberste Gerichtshof` },
    { kind: "name", text: or(fields.name, "Name des Sonderermittlers") },
    { kind: "text", text: `als Sonderermittler ein, wegen des Verdachts gegen ${or(fields.anlass, "…")}.` },
    { kind: "text", text: "Bis zum Eintreffen sichert das KPD Spuren und Beweise. Anklage und Weisungsrecht des FJD ruhen in dieser Sache (§ 6 JO, § 8 FJDS)." },
  ],
};

export const officeTemplates: Template[] = [
  ernennungGstA,
  ernennungRichter,
  ernennungChief,
  ernennungMinister,
  gnade,
  haftbefehlRichter,
  durchsuchungRichter,
  sonderermittler,
];
