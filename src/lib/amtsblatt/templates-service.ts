import { allFjdRanks, branchOf, HEADS_APPOINTED_BY_JM, promotionProblem, STAATSSEKRETAER, fjdOffices } from "./ranks";
import { formatDate, or, type Template } from "./template-kit";

// Templates of the Justizminister for the service of the FJD: appointments, swearing-in, promotion,
// discipline, weapons and orders. Every template names its legal basis and feeds the same certificate
// layout as the others (certificate-preview.tsx, pdf.tsx).

const COMMON: Pick<Template, "formula" | "issuer" | "seal" | "roles"> = {
  formula: "Im Namen des Staates Kamora",
  issuer: "Der Justizminister",
  seal: "fjd",
  // The Staatssekretär acts for the Justizminister (KV 13).
  roles: ["justizminister", "staatssekretaer"],
};

const NAME = (label: string) =>
  ({ name: "name", label, type: "text", required: true, maxLength: 60, placeholder: "Vor- und Nachname" }) as const;

function addDays(value: string | undefined, days: number) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const ernennungStaatssekretaer: Template = {
  ...COMMON,
  id: "ernennung-staatssekretaer",
  roles: ["justizminister"],
  group: "Ernennung",
  label: "Ernennung des Staatssekretärs",
  description: "Der Justizminister ernennt seinen Vertreter mit Zustimmung des Gouverneurs (§ 1 FJDS).",
  title: "Ernennungsurkunde",
  legalBasis: "§ 1 des FJD-Statuts und Art. 13 der Verfassung",
  fields: [
    NAME("Name des Ernannten"),
    { name: "wirksam", label: "Wirksam ab", type: "date", required: true },
  ],
  sample: { name: "Theodor Meisner", wirksam: "2026-11-01" },
  countersigns: () => [{ roles: ["gouverneur"], label: "Zustimmung des Gouverneurs", decisions: ["zugestimmt", "verweigert"] }],
  blocks: (fields) => [
    { kind: "text", text: "Mit Zustimmung des Gouverneurs ernennt der Justizminister" },
    { kind: "name", text: or(fields.name, "Name des Ernannten") },
    { kind: "text", text: `mit Wirkung vom ${or(formatDate(fields.wirksam), "…")} zum` },
    { kind: "office", text: STAATSSEKRETAER },
    {
      kind: "text",
      text: "Der Staatssekretär vertritt den Justizminister bei Abwesenheit und Befangenheit und führt die Amtsgeschäfte, solange das Amt unbesetzt ist (Art. 13 der Verfassung).",
    },
  ],
};

const ernennungAmtsleiter: Template = {
  ...COMMON,
  id: "ernennung-amtsleiter",
  roles: ["justizminister"],
  group: "Ernennung",
  label: "Ernennung einer Amtsleitung",
  description: "Chief Marshal und Leiter der Inneren Revision ernennt der Justizminister (§ 11 FJDS).",
  title: "Ernennungsurkunde",
  legalBasis: "§§ 2 und 11 des FJD-Statuts",
  fields: [
    NAME("Name des Ernannten"),
    { name: "amt", label: "Amt", type: "select", required: true, options: HEADS_APPOINTED_BY_JM },
    { name: "wirksam", label: "Wirksam ab", type: "date", required: true },
  ],
  sample: { name: "Jonas Brandt", amt: "Chief Marshal", wirksam: "2026-11-01" },
  countersigns: (values) =>
    values.amt === "Leiter der Inneren Revision"
      ? [{ roles: ["senatspraesident"], label: "Zustimmung des Senats", decisions: ["zugestimmt", "verweigert"] }]
      : [],
  blocks: (fields) => [
    {
      kind: "text",
      text:
        fields.amt === "Leiter der Inneren Revision"
          ? "Mit Zustimmung des Senats ernennt der Justizminister"
          : "Im Föderalen Justizdepartement ernennt der Justizminister",
    },
    { kind: "name", text: or(fields.name, "Name des Ernannten") },
    { kind: "text", text: `mit Wirkung vom ${or(formatDate(fields.wirksam), "…")} zum` },
    { kind: "office", text: or(fields.amt, "Amt") },
    {
      kind: "text",
      text:
        fields.amt === "Leiter der Inneren Revision"
          ? "Die Innere Revision berichtet direkt an den Senat. Ihre Leitung kann nur mit Zustimmung des Senats abberufen werden (§ 2 FJDS)."
          : "Die Ernennung wird mit dem Diensteid wirksam (§ 2 BeamtG). Der Amtsleiter führt den Dienst nach dem FJD-Statut.",
    },
  ],
};

const vereidigung: Template = {
  ...COMMON,
  id: "vereidigung",
  group: "Dienstrecht",
  label: "Vereidigung",
  description: "Der Justizminister nimmt den Diensteid ab; erst damit wird die Ernennung wirksam (§ 2 BeamtG).",
  title: "Vereidigungsurkunde",
  legalBasis: "§ 2 des Beamtengesetzes",
  fields: [
    NAME("Name des Vereidigten"),
    { name: "amt", label: "Amt", type: "select", required: true, options: allFjdRanks },
    { name: "datum", label: "Vereidigt am", type: "date", required: true },
  ],
  sample: { name: "Jonas Brandt", amt: "Staatsanwalt", datum: "2026-11-01" },
  blocks: (fields) => [
    { kind: "text", text: "Vor der Flagge von Kamora und dem Justizminister hat" },
    { kind: "name", text: or(fields.name, "Name des Vereidigten") },
    { kind: "text", text: `am ${or(formatDate(fields.datum), "…")} den Diensteid geleistet und ist damit in das Amt` },
    { kind: "office", text: or(fields.amt, "Amt") },
    { kind: "text", text: "eingeführt. Der Dienstausweis ist ausgehändigt. Lex supra omnes." },
  ],
};

const befoerderung: Template = {
  ...COMMON,
  id: "befoerderung",
  group: "Dienstrecht",
  label: "Beförderung",
  description: "Beförderung in den nächsthöheren Rang desselben Amtes (§ 3 FJDS).",
  title: "Beförderungsurkunde",
  legalBasis: "§§ 3 und 11 des FJD-Statuts",
  fields: [
    NAME("Name des Beförderten"),
    { name: "von", label: "Bisheriger Rang", type: "select", required: true, options: fjdOffices },
    { name: "nach", label: "Neuer Rang", type: "select", required: true, options: fjdOffices },
    { name: "wirksam", label: "Wirksam ab", type: "date", required: true },
  ],
  sample: { name: "Jonas Brandt", von: "Staatsanwalt", nach: "Oberstaatsanwalt", wirksam: "2026-12-01" },
  check: (values) => promotionProblem(values.von, values.nach),
  blocks: (fields) => [
    { kind: "text", text: "Im Föderalen Justizdepartement wird" },
    { kind: "name", text: or(fields.name, "Name des Beförderten") },
    { kind: "text", text: `mit Wirkung vom ${or(formatDate(fields.wirksam), "…")} vom Rang ${or(fields.von, "…")} befördert zum` },
    { kind: "office", text: or(fields.nach, "Neuer Rang") },
    { kind: "text", text: "Für die geleisteten Dienste wird gedankt. Die Pflichten des neuen Ranges gelten ab dem genannten Tag." },
  ],
};

const DISCIPLINE_DATE = { name: "beschluss", label: "Beschluss der Disziplinarkammer vom", type: "date", required: true } as const;

const suspendierung: Template = {
  ...COMMON,
  id: "suspendierung",
  group: "Dienstrecht",
  label: "Suspendierung",
  description: "Vorläufige Dienstenthebung bis zu 7 Tage nach Beschluss der Disziplinarkammer (§ 6 BeamtG).",
  title: "Suspendierungsbescheid",
  legalBasis: "§ 6 des Beamtengesetzes und § 2 des Waffengesetzes",
  fields: [
    NAME("Name des Suspendierten"),
    { name: "amt", label: "Amt", type: "select", required: true, options: allFjdRanks },
    DISCIPLINE_DATE,
    { name: "beginn", label: "Beginn", type: "date", required: true },
    { name: "tage", label: "Dauer in Tagen", type: "select", required: true, options: ["1", "2", "3", "4", "5", "6", "7"] },
  ],
  sample: { name: "Jonas Brandt", amt: "Staatsanwalt", beschluss: "2026-11-02", beginn: "2026-11-03", tage: "3" },
  blocks: (fields) => [
    { kind: "text", text: `Auf Beschluss der Disziplinarkammer vom ${or(formatDate(fields.beschluss), "…")} wird` },
    { kind: "name", text: or(fields.name, "Name des Suspendierten") },
    {
      kind: "text",
      text: `ab ${or(formatDate(fields.beginn), "…")} für ${or(fields.tage, "…")} ${fields.tage === "1" ? "Tag" : "Tage"} vom Dienst suspendiert. Amt:`,
    },
    { kind: "office", text: or(fields.amt, "Amt") },
    { kind: "text", text: "Dienstausweis und Dienstwaffen sind für die Dauer abzugeben. Gegen den Beschluss ist das Rechtsmittel zum OGH offen." },
  ],
};

const degradierung: Template = {
  ...COMMON,
  id: "degradierung",
  group: "Dienstrecht",
  label: "Degradierung",
  description: "Rückstufung nach Beschluss der Disziplinarkammer (§ 6 BeamtG).",
  title: "Degradierungsbescheid",
  legalBasis: "§ 6 des Beamtengesetzes und § 3 des FJD-Statuts",
  fields: [
    NAME("Name des Degradierten"),
    { name: "von", label: "Bisheriger Rang", type: "select", required: true, options: fjdOffices },
    { name: "nach", label: "Neuer Rang", type: "select", required: true, options: fjdOffices },
    DISCIPLINE_DATE,
    { name: "wirksam", label: "Wirksam ab", type: "date", required: true },
  ],
  sample: { name: "Jonas Brandt", von: "Oberstaatsanwalt", nach: "Staatsanwalt", beschluss: "2026-11-02", wirksam: "2026-11-03" },
  check: (values) => {
    if (!values.von || !values.nach) return null;
    const branch = branchOf(values.von);
    if (!branch || branch !== branchOf(values.nach)) return "Eine Degradierung bleibt innerhalb desselben Amtes.";
    return branch.ranks.indexOf(values.nach) <= branch.ranks.indexOf(values.von)
      ? "Der neue Rang muss niedriger sein als der bisherige."
      : null;
  },
  blocks: (fields) => [
    { kind: "text", text: `Auf Beschluss der Disziplinarkammer vom ${or(formatDate(fields.beschluss), "…")} wird` },
    { kind: "name", text: or(fields.name, "Name des Degradierten") },
    { kind: "text", text: `mit Wirkung vom ${or(formatDate(fields.wirksam), "…")} vom Rang ${or(fields.von, "…")} herabgestuft zum` },
    { kind: "office", text: or(fields.nach, "Neuer Rang") },
    { kind: "text", text: "Befugnisse des höheren Ranges erlöschen. Gegen den Beschluss ist das Rechtsmittel zum OGH offen." },
  ],
};

const CLASSES = ["A (Kurzwaffen)", "B (Langwaffen)", "C (Taser, Reizgas, Schlagstock, Kampfmesser)"];

const waffenschein: Template = {
  ...COMMON,
  id: "waffenschein",
  group: "Waffen",
  label: "Waffenschein",
  description: "Erlaubnis für Besitz und Führen von Waffen der Klasse A, B oder C (§ 4 WaffG).",
  title: "Waffenschein",
  legalBasis: "§ 4 des Waffengesetzes",
  fields: [
    NAME("Name des Inhabers"),
    { name: "klasse", label: "Klasse", type: "select", required: true, options: CLASSES },
    { name: "grund", label: "Grund", type: "select", required: true, options: ["Schutz", "Beruf", "Jagd", "Sport"] },
    { name: "beginn", label: "Gültig ab", type: "date", required: true },
  ],
  sample: { name: "Marlene Hartenstein", klasse: CLASSES[0], grund: "Schutz", beginn: "2026-11-01" },
  blocks: (fields) => [
    { kind: "text", text: "Der Justizminister erteilt" },
    { kind: "name", text: or(fields.name, "Name des Inhabers") },
    { kind: "text", text: `für den Grund ${or(fields.grund, "…")} den Waffenschein der Klasse` },
    { kind: "office", text: or(fields.klasse, "Klasse") },
    {
      kind: "text",
      text: `Gültig vom ${or(formatDate(fields.beginn), "…")} bis ${or(formatDate(addDays(fields.beginn, 180)), "…")}. Der Schein ist mitzuführen und bei Kontrollen mit Anlass vorzuzeigen. Waffen der Klasse D bleiben ausgeschlossen.`,
    },
  ],
};

const waffenscheinEntzug: Template = {
  ...COMMON,
  id: "waffenschein-entzug",
  group: "Waffen",
  label: "Entzug eines Waffenscheins",
  description: "Der Justizminister entzieht einen Schein; der OGH kann den Entzug aufheben (§ 6 WaffG).",
  title: "Entzugsbescheid",
  legalBasis: "§ 6 des Waffengesetzes",
  fields: [
    NAME("Name des Inhabers"),
    { name: "klasse", label: "Klasse", type: "select", required: true, options: CLASSES },
    {
      name: "grund",
      label: "Grund",
      type: "select",
      required: true,
      options: ["Verstoß gegen Auflagen", "Verurteilung wegen Waffen- oder Gewalttaten", "Wegfall der Voraussetzungen"],
    },
    { name: "wirksam", label: "Wirksam ab", type: "date", required: true },
  ],
  sample: { name: "Marlene Hartenstein", klasse: CLASSES[0], grund: "Verstoß gegen Auflagen", wirksam: "2026-12-01" },
  blocks: (fields) => [
    { kind: "text", text: `Dem Inhaber` },
    { kind: "name", text: or(fields.name, "Name des Inhabers") },
    { kind: "text", text: `wird der Waffenschein der Klasse ${or(fields.klasse, "…")} mit Wirkung vom ${or(formatDate(fields.wirksam), "…")} entzogen. Grund:` },
    { kind: "office", text: or(fields.grund, "Grund") },
    { kind: "text", text: "Waffen sind unverzüglich abzugeben. Gegen den Entzug ist die Beschwerde zum OGH offen (§ 6 WaffG)." },
  ],
};

const handelslizenz: Template = {
  ...COMMON,
  id: "handelslizenz",
  roles: ["justizminister"],
  group: "Waffen",
  label: "Handelslizenz für Waffen",
  description: "Herstellung und Handel brauchen die Lizenz des Justizministers mit Zustimmung des Gouverneurs (§ 7 WaffG).",
  title: "Handelslizenz",
  legalBasis: "§ 7 des Waffengesetzes",
  fields: [
    NAME("Name des Lizenznehmers"),
    { name: "beginn", label: "Gültig ab", type: "date", required: true },
    { name: "ende", label: "Gültig bis", type: "date", required: true },
  ],
  sample: { name: "Marlene Hartenstein", beginn: "2026-11-01", ende: "2027-04-30" },
  countersigns: () => [{ roles: ["gouverneur"], label: "Zustimmung des Gouverneurs", decisions: ["zugestimmt", "verweigert"] }],
  check: (values) => (values.beginn && values.ende && values.ende <= values.beginn ? "Das Ende muss nach dem Beginn liegen." : null),
  blocks: (fields) => [
    { kind: "text", text: "Mit Zustimmung des Gouverneurs erteilt der Justizminister" },
    { kind: "name", text: or(fields.name, "Name des Lizenznehmers") },
    { kind: "text", text: "die befristete Lizenz zur Herstellung und zum Handel mit Waffen. Gültig vom" },
    { kind: "office", text: `${or(formatDate(fields.beginn), "…")} bis ${or(formatDate(fields.ende), "…")}` },
    { kind: "text", text: "Verkauft wird nur an Inhaber eines Waffenscheins der passenden Klasse. Jeder Verkauf kommt ins Verkaufsbuch, das Staatsanwaltschaft und Innere Revision einsehen." },
  ],
};

const ermaechtigung: Template = {
  ...COMMON,
  id: "ermaechtigung",
  roles: ["justizminister"],
  group: "Beschlüsse",
  label: "Ermächtigung nach KStGB 9",
  description: "Hochverrat und Landesverrat werden nur mit Ermächtigung des Justizministers verfolgt.",
  title: "Ermächtigung",
  legalBasis: "§ 9 des Strafgesetzbuchs und § 8 des FJD-Statuts",
  fields: [
    NAME("Name des Beschuldigten"),
    { name: "tat", label: "Tatvorwurf", type: "select", required: true, options: ["Hochverrat (§ 80 KStGB)", "Landesverrat (§ 81 KStGB)"] },
    { name: "entscheidung", label: "Entscheidung", type: "select", required: true, options: ["erteilt", "versagt"] },
    { name: "begruendung", label: "Begründung (bei Versagung)", type: "text", required: false, maxLength: 140 },
  ],
  sample: { name: "Jonas Brandt", tat: "Hochverrat (§ 80 KStGB)", entscheidung: "erteilt", begruendung: "" },
  check: (values) => (values.entscheidung === "versagt" && !values.begruendung ? "Eine Versagung braucht eine Begründung (§ 9 KStGB)." : null),
  blocks: (fields) => [
    { kind: "text", text: `Die Ermächtigung zur Verfolgung von` },
    { kind: "name", text: or(fields.name, "Name des Beschuldigten") },
    { kind: "text", text: `wegen ${or(fields.tat, "…")} wird ${or(fields.entscheidung, "…")}.${fields.entscheidung === "versagt" && fields.begruendung ? ` Begründung: ${fields.begruendung.replace(/[.\s]+$/, "")}.` : ""}` },
    { kind: "text", text: "Die Entscheidung steht im Weisungsregister, das Senat und OGH jederzeit einsehen. Gefahrenabwehr, Festnahme und Beweissicherung bleiben bis dahin erlaubt." },
  ],
};

const haftbefehl: Template = {
  ...COMMON,
  id: "haftbefehl",
  group: "Beschlüsse",
  label: "Haftbefehl des Justizministers",
  description: "Beschluss nach JO 9. Er gilt sofort; ein Richter prüft ihn binnen 24 Stunden.",
  title: "Haftbefehl",
  legalBasis: "§ 9 der Justizordnung und § 7 des Polizeigesetzes",
  fields: [
    NAME("Name des Beschuldigten"),
    { name: "tat", label: "Tatvorwurf", type: "text", required: true, maxLength: 80, placeholder: "z. B. Mord (§ 10 KStGB)" },
    { name: "datum", label: "Erlassen am", type: "date", required: true },
  ],
  sample: { name: "Jonas Brandt", tat: "Mord (§ 10 KStGB)", datum: "2026-11-01" },
  countersigns: () => [
    {
      roles: ["richter", "oberster_richter"],
      label: "Richterliche Prüfung",
      decisions: ["bestätigt", "aufgehoben"],
      note: "binnen 24 Stunden (§ 9 JO)",
    },
  ],
  blocks: (fields) => [
    { kind: "text", text: `Am ${or(formatDate(fields.datum), "…")} ordnet der Justizminister die Festnahme von` },
    { kind: "name", text: or(fields.name, "Name des Beschuldigten") },
    { kind: "text", text: `wegen des dringenden Verdachts auf ${or(fields.tat, "…")} an.` },
    { kind: "text", text: "Der Beschluss gilt sofort. Ein Richter prüft ihn binnen 24 Stunden und kann ihn aufheben. Das KPD vollstreckt; die Belehrung folgt sofort (§ 7 PolG)." },
  ],
};

const durchsuchungsbeschluss: Template = {
  ...COMMON,
  id: "durchsuchungsbeschluss",
  group: "Beschlüsse",
  label: "Durchsuchungsbeschluss des Justizministers",
  description: "Wohnung oder Firma darf nur mit Beschluss durchsucht werden (§ 6 PolG, JO 9).",
  title: "Durchsuchungsbeschluss",
  legalBasis: "§ 9 der Justizordnung und § 6 des Polizeigesetzes",
  fields: [
    { name: "objekt", label: "Wohnung oder Firma", type: "text", required: true, maxLength: 80, placeholder: "Adresse oder Name" },
    { name: "verdacht", label: "Verdacht", type: "text", required: true, maxLength: 80, placeholder: "z. B. Waffenhandel (§ 52 KStGB)" },
    { name: "datum", label: "Erlassen am", type: "date", required: true },
  ],
  sample: { objekt: "Hafenstraße 12", verdacht: "Waffenhandel (§ 52 KStGB)", datum: "2026-11-01" },
  countersigns: () => [
    {
      roles: ["richter", "oberster_richter"],
      label: "Richterliche Prüfung",
      decisions: ["bestätigt", "aufgehoben"],
      note: "binnen 24 Stunden (§ 9 JO)",
    },
  ],
  blocks: (fields) => [
    { kind: "text", text: `Am ${or(formatDate(fields.datum), "…")} ordnet der Justizminister die Durchsuchung von` },
    { kind: "name", text: or(fields.objekt, "Wohnung oder Firma") },
    { kind: "text", text: `wegen des Verdachts auf ${or(fields.verdacht, "…")} an.` },
    { kind: "text", text: "Der Beschluss gilt sofort. Ein Richter prüft ihn binnen 24 Stunden und kann ihn aufheben. Das KPD führt aus; Funde werden dokumentiert (§ 10 PolG)." },
  ],
};

export const serviceTemplates: Template[] = [
  ernennungStaatssekretaer,
  ernennungAmtsleiter,
  vereidigung,
  befoerderung,
  suspendierung,
  degradierung,
  waffenschein,
  waffenscheinEntzug,
  handelslizenz,
  ermaechtigung,
  haftbefehl,
  durchsuchungsbeschluss,
];
