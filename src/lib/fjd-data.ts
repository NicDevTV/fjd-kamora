import { slugify } from "@/lib/slugify";

// Data layer of the department. Cases and notices will come from Supabase later;
// until then there is deliberately no sample data, only empty states.
// Offices, procedure path and hierarchy come from the legal codex and link back to it.

export type CaseStatus = "offen" | "in_bearbeitung" | "vertagt" | "abgeschlossen";

export type Case = {
  id: string;
  title: string;
  department: string;
  status: CaseStatus;
  updatedAt: string;
};

export type Notice = {
  id: string;
  title: string;
  date: string;
  body: string;
};

// Builds a link to a passage in the codex, using the same anchors as the codex page.
function codex(sectionTitle: string, heading?: string) {
  const section = slugify(sectionTitle);
  return `/rechtskodex#${heading ? `${section}--${slugify(heading)}` : section}`;
}

const KV = "Teil 01 · Verfassung (KV)";
const KSTGB = "Teil 02 · Strafgesetzbuch (KStGB)";
const JO = "Teil 03 · Justizordnung (JO)";
const FJDS = "Teil 06 · FJD-Statut (FJDS)";

export const aemter = [
  {
    id: "staatsanwaltschaft",
    name: "Staatsanwaltschaft",
    summary:
      "Anklage und Ermittlungen unter dem GStA, auch organisierte Kriminalität, Korruption und Staatsschutz.",
    norm: "FJDS § 2 · JO 4–5",
    href: codex(FJDS, "§ 2 Ämter"),
  },
  {
    id: "justizmarschalldienst",
    name: "Justizmarschalldienst",
    summary: "Personen- und Gerichtsschutz, Haftbefehle, Transport und Gefängnis.",
    norm: "FJDS § 2 · ImmG 6",
    href: codex(FJDS, "§ 2 Ämter"),
  },
  {
    id: "innere-revision",
    name: "Innere Revision (AIR)",
    summary:
      "Kontrolle von KPD und FJD, Beschwerden und Schusswaffengebrauch. Berichtet direkt an den Senat.",
    norm: "FJDS § 2 · PolG 8, 12",
    href: codex(FJDS, "§ 2 Ämter"),
  },
];

export const verfahrensweg = [
  {
    id: "kpd",
    instance: "KPD",
    range: "bis 30 HE",
    title: "Ticket und Strafbefehl",
    body: "Tickets bis $10.000. Ab Sergeant ein Strafbefehl bis 30 HE und $25.000, bei Geständnis oder klarer Beweislage.",
    href: codex(JO, "Verfahrenswege"),
  },
  {
    id: "sta",
    instance: "StA",
    range: "31–60 HE",
    title: "Schnellverfahren",
    body: "Die StA führt das Schnellverfahren, wenn sie binnen 15 Minuten erreichbar ist. Sonst übernimmt ein KPD-Beamter ab Lieutenant.",
    href: codex(JO, "§ 5 Ersatzanklage"),
  },
  {
    id: "bezirksgericht",
    instance: "Bezirksgericht",
    range: "61–180 HE",
    title: "Hauptverfahren",
    body: "Ein Einzelrichter entscheidet über alles über 60 HE. Pflicht bei Amtsträgern und Kapitalverbrechen.",
    href: codex(JO, "§ 7 Hauptverfahren"),
  },
  {
    id: "ogh",
    instance: "OGH",
    range: "Letzte Instanz",
    title: "Berufung und Verfassung",
    body: "Berufung binnen 48 Stunden. Der OGH entscheidet über Verfassung, Immunität und Amtsenthebung, und zwar endgültig.",
    href: codex(JO, "§ 11 Rechtsmittel"),
  },
];

export const rangfolge = [
  {
    id: "verfassung",
    title: "Verfassung",
    body: "Ihr Kern ist unabänderlich, auch einstimmig nicht zu ändern.",
    href: codex(KV, "Art. 14 Ewigkeitsklausel"),
  },
  {
    id: "gesetze",
    title: "Gesetze",
    body: "KStGB, JO, PolG, BeamtG und ImmG: Strafrecht, Verfahren, Polizei, Beamte und Immunität.",
    href: codex(KSTGB),
  },
  {
    id: "statut",
    title: "FJD-Statut und Verordnungen",
    body: "Verordnungen gelten nur im Rahmen der Gesetze. Der OGH kann sie aufheben.",
    href: codex(FJDS, "§ 6 Verordnungen"),
  },
  {
    id: "dienstanweisungen",
    title: "Dienstanweisungen",
    body: "Regeln für den Dienstalltag, gebunden an alles darüber.",
    href: codex("Übersicht"),
  },
];

export async function getCases(): Promise<Case[]> {
  return [];
}

export async function getNotices(): Promise<Notice[]> {
  return [];
}
