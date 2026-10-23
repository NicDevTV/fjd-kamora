// Storage contract of the internal area. Local development runs on SQLite (sqlite.ts),
// staging and production on Supabase Postgres (postgres.ts), behind the same interface.
// Every method is async so both backends fit behind it unchanged.

// "sicherheitsrat" is the higher order (KV Art. 12), the server leadership in character:
// it appoints and dismisses the Justizminister and grants roles.
export const ROLES = ["justizminister", "sicherheitsrat"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  justizminister: "Justizminister",
  sicherheitsrat: "Sicherheitsrat",
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
  issuedBy: string;
  issuedAt: string;
};

export type NewDocument = Omit<DocumentRecord, "id" | "number" | "issuedAt">;

export interface Store {
  upsertDiscordUser(input: { discordId: string; discordName: string; avatarUrl: string | null }): Promise<User>;
  getUser(id: string): Promise<User | null>;
  setServiceName(userId: string, serviceName: string, honorific: string | null): Promise<void>;

  listRoles(userId: string): Promise<Role[]>;
  grantRole(userId: string, role: Role, grantedBy: string | null): Promise<void>;

  createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;
  getSession(tokenHash: string): Promise<Session | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;

  // Assigns the next number of the year (AB-2026-0001) inside the same transaction.
  createDocument(input: NewDocument): Promise<DocumentRecord>;
  listDocuments(limit: number): Promise<DocumentRecord[]>;
  getDocument(id: string): Promise<DocumentRecord | null>;
}
