import { formatDate, or, type Countersign, type Template } from "./template-kit";

// The issuing judge supplies signature 1. The two approvals below must be from
// two other OGH members; a rejection prevents the document becoming valid.
const JUDGES: Countersign[] = [2, 3].map((number) => ({
  key: `ogh-judge-${number}`,
  roles: ["ogh_richter", "oberster_richter"],
  label: `OGH-Richter ${number} von 3`,
  decisions: ["zugestimmt", "abgelehnt"],
  note: "Andere Person als Ausfertiger und bisherige Unterzeichner",
}));

const COURT = {
  formula: "Im Namen des Staates Kamora",
  issuer: "Der Oberste Gerichtshof",
  seal: "gericht",
  roles: ["ogh_richter", "oberster_richter"],
  group: "Beschlüsse",
  judicialQuorum: 3,
} as const;

const parteiverbot: Template = {
  ...COURT,
  roles: [...COURT.roles],
  id: "parteiverbot",
  label: "Parteiverbot durch den OGH",
  description: "Nur einstimmig mit drei OGH-Richtern. Keine Notfallvertretung (Art. 16 KV, § 1 JO).",
  title: "Parteiverbotsbeschluss",
  legalBasis: "Art. 16 der Verfassung und § 1 der Justizordnung",
  fields: [
    { name: "name", label: "Partei", type: "text", required: true, maxLength: 60 },
    { name: "antrag", label: "Antrag durch", type: "select", required: true, options: ["den Justizminister", "ein Drittel des Senats"] },
    { name: "grund", label: "Verbotsgrund", type: "select", required: true, options: ["Einsatz oder Planung von Gewalt", "Abschaffung geschützter Artikel aus Art. 14 KV"] },
    { name: "wahlfrist", label: "Wahlsperrfrist geprüft", type: "select", required: true, options: ["Außerhalb der Sperrfrist nach Art. 16 KV"] },
    { name: "datum", label: "Beschluss vom", type: "date", required: true },
  ],
  sample: { name: "Beispielpartei", antrag: "ein Drittel des Senats", grund: "Einsatz oder Planung von Gewalt", wahlfrist: "Außerhalb der Sperrfrist nach Art. 16 KV", datum: "2026-11-01" },
  countersigns: () => JUDGES,
  blocks: (fields) => [
    { kind: "text", text: `Auf Antrag durch ${or(fields.antrag, "…")} entscheidet der Oberste Gerichtshof über` },
    { kind: "name", text: or(fields.name, "Name der Partei") },
    { kind: "text", text: `Beschluss vom ${or(formatDate(fields.datum), "…")}. Verbotsgrund: ${or(fields.grund, "…")}.` },
    { kind: "office", text: "Verbot erst nach drei einstimmigen richterlichen Unterschriften" },
    { kind: "text", text: "Keine Notfallvertretung. Die Wahlsperrfristen nach Art. 16 KV müssen außerhalb dieses Dokuments geprüft sein. Mitglieder bleiben ohne eigene Verurteilung wählbar." },
  ],
};

const todesurteil: Template = {
  ...COURT,
  roles: [...COURT.roles],
  id: "hochverrat-todesurteil",
  label: "OGH-Urteil bei Hochverrat",
  description: "Drei einstimmige OGH-Richter und gesonderte Freigabe des Sicherheitsrats (§ 9 KStGB, Art. 12 KV).",
  title: "Urteil bei Hochverrat",
  legalBasis: "§ 9 KStGB, § 1 und § 13 JO sowie Art. 4 und Art. 12 KV",
  fields: [
    { name: "name", label: "Name des Angeklagten", type: "text", required: true, maxLength: 60 },
    { name: "aktenzeichen", label: "Aktenzeichen des Verfahrens", type: "text", required: true, maxLength: 40 },
    { name: "datum", label: "Urteil vom", type: "date", required: true },
  ],
  sample: { name: "Jonas Brandt", aktenzeichen: "OGH-2026-001", datum: "2026-11-01" },
  countersigns: () => [...JUDGES, {
    key: "security-council-release",
    afterPrevious: true,
    roles: ["sicherheitsrat"],
    label: "Freigabe des Sicherheitsrats",
    decisions: ["freigegeben", "verweigert"],
    note: "Erst nach einstimmiger Entscheidung aller drei OGH-Richter",
  }],
  blocks: (fields) => [
    { kind: "text", text: `Im Verfahren ${or(fields.aktenzeichen, "…")} wegen Hochverrats (§ 9 KStGB) gegen` },
    { kind: "name", text: or(fields.name, "Name des Angeklagten") },
    { kind: "text", text: `Urteil vom ${or(formatDate(fields.datum), "…")}. Die Todesstrafe bedarf dreier einstimmiger richterlicher Unterschriften und der Freigabe des Sicherheitsrats.` },
    { kind: "office", text: "Ohne vollständige Zustimmung keine Freigabe" },
    { kind: "text", text: "Frühestens 48 Stunden nach dem Urteil; ein Gnadengesuch hemmt die Vollstreckung bis zur Entscheidung (§ 13 JO). Dieses Dokument ersetzt weder Fristenprüfung noch Verfahrensakte." },
  ],
};

// Ordinary OGH decisions have a three-judge panel, with the explicit emergency
// exception from JO § 1. The exception never covers party bans or death sentences.
function ordinaryDecision(emergency: boolean): Template {
  return {
    ...COURT,
    roles: emergency ? ["oberster_richter"] : [...COURT.roles],
    judicialQuorum: emergency ? undefined : 3,
    id: emergency ? "ogh-beschluss-eil" : "ogh-beschluss",
    label: emergency ? "OGH-Beschluss in Notfallvertretung" : "Beschluss der OGH-Dreierkammer",
    description: emergency ? "Der Oberste Richter entscheidet im Notfall allein (§ 1 JO). Nicht für Parteiverbote oder Todesurteile." : "Reguläre Kammerentscheidung mit drei unterschiedlichen OGH-Richtern (§ 1 JO).",
    title: "Beschluss des OGH",
    legalBasis: "§ 1 und § 2 der Justizordnung",
    fields: [
      { name: "name", label: "Person oder Sache", type: "text", required: true, maxLength: 60 },
      { name: "verfahren", label: "Verfahren", type: "select", required: true, options: ["Berufung", "Verfassungsprüfung", "Wahleinspruch", "Prüfung einer Aktenlöschung"] },
      { name: "aktenzeichen", label: "Aktenzeichen", type: "text", required: true, maxLength: 40 },
      { name: "entscheidung", label: "Beschlussformel", type: "text", required: true, maxLength: 100 },
      { name: "datum", label: "Beschluss vom", type: "date", required: true },
      ...(emergency ? [{ name: "notfall", label: "Grund der Notfallvertretung", type: "text" as const, required: true, maxLength: 100 }] : []),
    ],
    sample: { name: "Jonas Brandt", verfahren: "Berufung", aktenzeichen: "OGH-2026-001", entscheidung: "Die Sache wird zur erneuten Verhandlung zurückverwiesen.", datum: "2026-11-01", ...(emergency ? { notfall: "Die übrige Kammer ist nicht erreichbar; die Entscheidung ist unaufschiebbar." } : {}) },
    countersigns: emergency ? undefined : () => JUDGES,
    blocks: (fields) => [
      { kind: "text", text: `${or(fields.verfahren, "Verfahren")} · ${or(fields.aktenzeichen, "Aktenzeichen")} · ${or(formatDate(fields.datum), "…")}` },
      { kind: "name", text: or(fields.name, "Person oder Sache") },
      { kind: "text", text: or(fields.entscheidung, "Beschlussformel") },
      { kind: "office", text: emergency ? "Notfallvertretung durch den Obersten Richter" : "Beschluss der Dreierkammer" },
      { kind: "text", text: emergency ? `Notfallgrund: ${or(fields.notfall, "…")}. Diese Ausnahme gilt nicht für Art. 16 KV oder § 9 KStGB.` : "Der Ausfertiger und zwei weitere OGH-Richter unterzeichnen persönlich. Wer in erster Instanz entschieden hat oder befangen ist, wirkt nicht mit (§§ 1–2 JO)." },
    ],
  };
}

export const judicialTemplates: Template[] = [ordinaryDecision(false), ordinaryDecision(true), parteiverbot, todesurteil];
