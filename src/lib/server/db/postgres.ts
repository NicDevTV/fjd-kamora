import "server-only";
import postgres from "postgres";
import { ROLES, type DocumentRecord, type Role, type Store, type User } from "./types";

// Staging and production database: Supabase Postgres, reached through the transaction pooler.
// The login role sees only its own schema (fjd_prod or fjd_staging, set as its search_path),
// so the queries use plain table names and can never reach the other environment.

type UserRow = {
  id: string;
  discord_id: string;
  discord_name: string;
  avatar_url: string | null;
  service_name: string | null;
  created_at: Date;
};

type DocumentRow = {
  id: string;
  number: string;
  template: string;
  fields: Record<string, string>;
  signer_name: string;
  signer_title: string;
  signature_seed: number;
  issued_by: string;
  issued_at: Date;
};

const toUser = (row: UserRow): User => ({
  id: row.id,
  discordId: row.discord_id,
  discordName: row.discord_name,
  avatarUrl: row.avatar_url,
  serviceName: row.service_name,
  createdAt: row.created_at.toISOString(),
});

const toDocument = (row: DocumentRow): DocumentRecord => ({
  id: row.id,
  number: row.number,
  template: row.template,
  fields: row.fields,
  signerName: row.signer_name,
  signerTitle: row.signer_title,
  signatureSeed: row.signature_seed,
  issuedBy: row.issued_by,
  issuedAt: row.issued_at.toISOString(),
});

export function createPostgresStore(url: string): Store {
  // The pooler runs in transaction mode: no prepared statements, few connections per instance.
  const sql = postgres(url, { ssl: "require", prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 });

  return {
    async upsertDiscordUser({ discordId, discordName, avatarUrl }) {
      const [row] = await sql<UserRow[]>`
        insert into users (discord_id, discord_name, avatar_url)
        values (${discordId}, ${discordName}, ${avatarUrl})
        on conflict (discord_id) do update set
          discord_name = excluded.discord_name,
          avatar_url = excluded.avatar_url,
          last_login_at = now()
        returning *`;
      return toUser(row);
    },

    async getUser(id) {
      const [row] = await sql<UserRow[]>`select * from users where id = ${id}`;
      return row ? toUser(row) : null;
    },

    async setServiceName(userId, serviceName) {
      await sql`update users set service_name = ${serviceName} where id = ${userId}`;
    },

    async listRoles(userId) {
      const rows = await sql<{ role: string }[]>`select role from roles where user_id = ${userId}`;
      return rows.map((row) => row.role).filter((role): role is Role => (ROLES as readonly string[]).includes(role));
    },

    async grantRole(userId, role, grantedBy) {
      await sql`insert into roles (user_id, role, granted_by) values (${userId}, ${role}, ${grantedBy}) on conflict do nothing`;
    },

    async createSession(tokenHash, userId, expiresAt) {
      await sql`insert into sessions (token_hash, user_id, expires_at) values (${tokenHash}, ${userId}, ${expiresAt})`;
    },

    async getSession(tokenHash) {
      const [row] = await sql<{ user_id: string; expires_at: Date }[]>`
        select user_id, expires_at from sessions where token_hash = ${tokenHash}`;
      return row ? { userId: row.user_id, expiresAt: row.expires_at.toISOString() } : null;
    },

    async deleteSession(tokenHash) {
      await sql`delete from sessions where token_hash = ${tokenHash}`;
    },

    async deleteExpiredSessions() {
      await sql`delete from sessions where expires_at < now()`;
    },

    async createDocument(input) {
      // One issuer at a time per year: the advisory lock makes the number gapless and unique.
      return sql.begin(async (tx) => {
        const year = new Date().getUTCFullYear();
        await tx`select pg_advisory_xact_lock(hashtext('fjd_documents'), ${year})`;
        const [{ next }] = await tx<{ next: number }[]>`
          select coalesce(max(sequence), 0) + 1 as next from documents where year = ${year}`;
        const [row] = await tx<DocumentRow[]>`
          insert into documents (number, year, sequence, template, fields, signer_name, signer_title, signature_seed, issued_by)
          values (${`AB-${year}-${String(next).padStart(4, "0")}`}, ${year}, ${next}, ${input.template},
                  ${tx.json(input.fields)}, ${input.signerName}, ${input.signerTitle}, ${input.signatureSeed}, ${input.issuedBy})
          returning *`;
        return toDocument(row);
      });
    },

    async listDocuments(limit) {
      const rows = await sql<DocumentRow[]>`select * from documents order by issued_at desc limit ${limit}`;
      return rows.map(toDocument);
    },

    async getDocument(id) {
      // Ids are UUIDs; anything else cannot exist and must not reach the database as a cast error.
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const [row] = await sql<DocumentRow[]>`select * from documents where id = ${id}`;
      return row ? toDocument(row) : null;
    },
  };
}
