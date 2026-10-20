// Abbreviations used across the site, mirroring the „Kürzel“ table and the part titles of the codex.
// Keep this in sync with content/rechtskodex-kamora-v1.md when the codex changes.
export const ABBREVIATIONS: Record<string, string> = {
  HE: "Hafteinheit (1 Min.)",
  JM: "Justizminister",
  OGH: "Oberster Gerichtshof",
  FJD: "Föderales Justizdepartement",
  KPD: "Polizei",
  StA: "Staatsanwaltschaft",
  GStA: "Generalstaatsanwalt",
  AIR: "Innere Revision",
  KV: "Verfassung",
  KStGB: "Strafgesetzbuch",
  JO: "Justizordnung",
  PolG: "Polizeigesetz",
  BeamtG: "Beamtengesetz",
  ImmG: "Immunitäts- und Diplomatengesetz",
  FJDS: "FJD-Statut",
  BtM: "Betäubungsmittel",
};

// Longest first, so „GStA“ wins over „StA“ and „FJDS“ over „FJD“. An abbreviation only counts
// as a whole word: no letter or digit directly before or after it.
const keys = Object.keys(ABBREVIATIONS).sort((a, b) => b.length - a.length);
export const ABBREVIATION_PATTERN = new RegExp(
  `(?<![\\p{L}\\d])(${keys.join("|")})(?![\\p{L}\\d])`,
  "u",
);
