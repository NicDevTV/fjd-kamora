import type { DrawnSignature } from "@/lib/amtsblatt/drawn-signature";

// Storage contract of the internal area. Local development runs on SQLite (sqlite.ts),
// production on Supabase Postgres (postgres.ts), behind the same interface.
// Every method is async so both backends fit behind it unchanged.

// Every office that signs or countersigns has its own role. "sicherheitsrat" is the server leadership
// in character (KV Art. 12): it appoints and dismisses the Justizminister and grants roles.
export const ROLES = [
  "sicherheitsrat",
  "gouverneur",
  "senatspraesident",
  "justizminister",
  "staatssekretaer",
  "generalstaatsanwalt",
  "richter",
  "ogh_richter",
  "oberster_richter",
  "chief_of_police",
  "revisionsleiter",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  sicherheitsrat: "Sicherheitsrat",
  gouverneur: "Gouverneur",
  senatspraesident: "Senatspräsident",
  justizminister: "Justizminister",
  staatssekretaer: "Staatssekretär",
  generalstaatsanwalt: "Generalstaatsanwalt",
  richter: "Richter",
  ogh_richter: "OGH-Richter",
  oberster_richter: "Oberster Richter",
  chief_of_police: "Chief of Police",
  revisionsleiter: "Leiter der Inneren Revision",
};

// The line under a signature, by office. A user may only choose among the titles of the roles they hold.
export const ROLE_TITLES: Record<Role, string[]> = {
  sicherheitsrat: ["Vorsitzender des Sicherheitsrats", "Mitglied des Sicherheitsrats"],
  gouverneur: ["Gouverneur von Kamora"],
  senatspraesident: ["Präsident des Senats"],
  justizminister: ["Justizminister des Staates Kamora"],
  staatssekretaer: ["Staatssekretär im Föderalen Justizdepartement"],
  generalstaatsanwalt: ["Generalstaatsanwalt von Kamora"],
  richter: ["Richter am Bezirksgericht"],
  ogh_richter: ["Richter am Obersten Gerichtshof"],
  oberster_richter: ["Oberster Richter von Kamora"],
  chief_of_police: ["Chief of Police"],
  revisionsleiter: ["Leiter der Inneren Revision"],
};

// Text on the ring of a stamp.
export const ROLE_STAMP: Record<Role, string> = {
  sicherheitsrat: "SICHERHEITSRAT",
  gouverneur: "GOUVERNEUR",
  senatspraesident: "SENAT",
  justizminister: "JUSTIZMINISTER",
  staatssekretaer: "STAATSSEKRETÄR",
  generalstaatsanwalt: "STAATSANWALTSCHAFT",
  richter: "BEZIRKSGERICHT",
  ogh_richter: "OBERSTER GERICHTSHOF",
  oberster_richter: "OBERSTER GERICHTSHOF",
  chief_of_police: "POLIZEI",
  revisionsleiter: "INNERE REVISION",
};

// Titles an official may set in the profile. The title is printed before the name under the
// signature of a document; the handwritten signature itself never carries it.
export const HONORIFICS = ["Dr.", "Prof.", "Prof. Dr.", "Dr. jur.", "Dr. med.", "Dr. Dr."] as const;

export const fullName = (honorific: string | null | undefined, name: string) => (honorific ? `${honorific} ${name}` : name);

export type User = {
  id: string;
  discordId: string;
  discordName: string;
  avatarUrl: string | null;
  // Name of the character in service; documents are signed with it.
  serviceName: string | null;
  // Optional title, one of HONORIFICS.
  honorific: string | null;
  signature: DrawnSignature | null;
  createdAt: string;
};

export type Session = {
  userId: string;
  expiresAt: string;
};

export type DocumentRecord = {
  id: string;
  number: string;
  template: string;
  fields: Record<string, string>;
  signerName: string;
  // The title the signer had when the document was issued.
  signerHonorific: string | null;
  signerTitle: string;
  // Varies the handwritten signature slightly from document to document.
  signatureSeed: number;
  signerSignature: DrawnSignature | null;
  issuedBy: string;
  issuedAt: string;
};

// A countersignature: another office stamps a document after it was issued (consent, review, objection).
export type StampRecord = {
  id: string;
  documentId: string;
  // The approval position, independent of the role (several OGH judges share it).
  slot: string;
  role: Role;
  stampedBy: string;
  // What the stamp says, e.g. "zugestimmt", "bestätigt" or "aufgehoben".
  decision: string;
  signerName: string;
  signerHonorific: string | null;
  signerTitle: string;
  signatureSeed: number;
  signerSignature: DrawnSignature | null;
  stampedAt: string;
};

export type NewStamp = Omit<StampRecord, "id" | "stampedAt">;

export type UserWithRoles = User & { roles: Role[] };

// Which Discord role of the guild stands for which role of the dashboard.
export type RoleMapEntry = { discordRoleId: string; discordRoleName: string; role: Role };

export type NewDocument = Omit<DocumentRecord, "id" | "number" | "issuedAt">;

export interface Store {
  upsertDiscordUser(input: { discordId: string; discordName: string; avatarUrl: string | null }): Promise<User>;
  getUser(id: string): Promise<User | null>;
  setServiceName(userId: string, serviceName: string, honorific: string | null): Promise<void>;
  setSignature(userId: string, signature: DrawnSignature): Promise<void>;

  listRoles(userId: string): Promise<Role[]>;
  grantRole(userId: string, role: Role, grantedBy: string | null): Promise<void>;
  revokeRole(userId: string, role: Role): Promise<void>;
  listUsers(): Promise<UserWithRoles[]>;

  listRoleMap(): Promise<RoleMapEntry[]>;
  replaceRoleMap(entries: RoleMapEntry[]): Promise<void>;
  // Makes the roles of a user exactly this set. Roles only ever come from the Discord role mapping.
  setRoles(userId: string, roles: Role[]): Promise<void>;

  createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;
  getSession(tokenHash: string): Promise<Session | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;

  // Assigns the next number of the year (AB-2026-0001) inside the same transaction.
  createDocument(input: NewDocument): Promise<DocumentRecord>;
  listDocuments(limit: number): Promise<DocumentRecord[]>;
  getDocument(id: string): Promise<DocumentRecord | null>;

  // One stamp per approval position and per person; races are rejected by the database.
  addStamp(input: NewStamp): Promise<StampRecord>;
  listStamps(documentIds: string[]): Promise<StampRecord[]>;
  // Atomic claim keeps concurrent final signatures from announcing twice.
  claimAnnouncement(documentId: string): Promise<boolean>;
  releaseAnnouncement(documentId: string): Promise<void>;
}
