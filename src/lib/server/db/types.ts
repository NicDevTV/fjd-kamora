// Storage contract of the internal area. Local development runs on SQLite (sqlite.ts);
// staging and production will get a Supabase implementation of the same interface.
// Every method is async so both backends fit behind it unchanged.

export const ROLES = ["justizminister"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  justizminister: "Justizminister",
};

export type User = {
  id: string;
  discordId: string;
  discordName: string;
  avatarUrl: string | null;
  // Name of the character in service; documents are signed with it.
  serviceName: string | null;
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
  setServiceName(userId: string, serviceName: string): Promise<void>;

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
