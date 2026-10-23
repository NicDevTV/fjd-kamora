import "server-only";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  ROLES,
  type DocumentRecord,
  type NewDocument,
  type NewStamp,
  type Role,
  type RoleMapEntry,
  type StampRecord,
  type Store,
  type User,
} from "./types";

// Local development database: one file under .data/ (gitignored), created on first use.
// The schema mirrors supabase/init.sql so both backends hold the same data.
const SCHEMA = `
  create table if not exists users (
    id text primary key,
    discord_id text not null unique,
    discord_name text not null,
    avatar_url text,
    service_name text,
    honorific text,
    created_at text not null,
    last_login_at text not null
  );
  create table if not exists roles (
    user_id text not null references users(id) on delete cascade,
    role text not null,
    granted_by text references users(id),
    granted_at text not null,
    primary key (user_id, role)
  );
  create table if not exists discord_role_map (
    discord_role_id text primary key,
    discord_role_name text not null,
    role text not null
  );
  create table if not exists sessions (
    token_hash text primary key,
    user_id text not null references users(id) on delete cascade,
    created_at text not null,
    expires_at text not null
  );
  create index if not exists sessions_user on sessions(user_id);
  create table if not exists documents (
    id text primary key,
    number text not null unique,
    year integer not null,
    sequence integer not null,
    template text not null,
    fields text not null,
    signer_name text not null,
    signer_honorific text,
    signer_title text not null,
    signature_seed integer not null,
    issued_by text not null references users(id),
    issued_at text not null,
    unique (year, sequence)
  );
  create table if not exists document_stamps (
    id text primary key,
    document_id text not null references documents(id) on delete cascade,
    role text not null,
    stamped_by text not null references users(id),
    decision text not null,
    signer_name text not null,
    signer_honorific text,
    signer_title text not null,
    signature_seed integer not null,
    stamped_at text not null,
    unique (document_id, role)
  );
`;

type Row = Record<string, string | number | null>;

function toUser(row: Row): User {
  return {
    id: String(row.id),
    discordId: String(row.discord_id),
    discordName: String(row.discord_name),
    avatarUrl: row.avatar_url === null ? null : String(row.avatar_url),
    serviceName: row.service_name === null ? null : String(row.service_name),
    honorific: row.honorific == null ? null : String(row.honorific),
    createdAt: String(row.created_at),
  };
}

function toDocument(row: Row): DocumentRecord {
  return {
    id: String(row.id),
    number: String(row.number),
    template: String(row.template),
    fields: JSON.parse(String(row.fields)) as Record<string, string>,
    signerName: String(row.signer_name),
    signerHonorific: row.signer_honorific == null ? null : String(row.signer_honorific),
    signerTitle: String(row.signer_title),
    signatureSeed: Number(row.signature_seed),
    issuedBy: String(row.issued_by),
    issuedAt: String(row.issued_at),
  };
}

function addColumn(db: DatabaseSync, table: string, column: string, type: string) {
  const columns = db.prepare(`pragma table_info(${table})`).all() as Row[];
  if (!columns.some((entry) => entry.name === column)) db.exec(`alter table ${table} add column ${column} ${type}`);
}

function toStamp(row: Row): StampRecord {
  return {
    id: String(row.id),
    documentId: String(row.document_id),
    role: String(row.role) as Role,
    stampedBy: String(row.stamped_by),
    decision: String(row.decision),
    signerName: String(row.signer_name),
    signerHonorific: row.signer_honorific == null ? null : String(row.signer_honorific),
    signerTitle: String(row.signer_title),
    signatureSeed: Number(row.signature_seed),
    stampedAt: String(row.stamped_at),
  };
}

function open(file: string) {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("pragma journal_mode = wal; pragma foreign_keys = on;");
  db.exec(SCHEMA);
  // Columns added after the first release: older local files get them on the next start.
  addColumn(db, "users", "honorific", "text");
  addColumn(db, "documents", "signer_honorific", "text");
  return db;
}

export function createSqliteStore(file = path.join(process.cwd(), ".data", "fjd.sqlite")): Store {
  const db = open(file);
  const now = () => new Date().toISOString();

  return {
    async upsertDiscordUser({ discordId, discordName, avatarUrl }) {
      const at = now();
      db.prepare(
        `insert into users (id, discord_id, discord_name, avatar_url, created_at, last_login_at)
         values (?, ?, ?, ?, ?, ?)
         on conflict (discord_id) do update set
           discord_name = excluded.discord_name,
           avatar_url = excluded.avatar_url,
           last_login_at = excluded.last_login_at`,
      ).run(randomUUID(), discordId, discordName, avatarUrl, at, at);
      return toUser(db.prepare("select * from users where discord_id = ?").get(discordId) as Row);
    },

    async getUser(id) {
      const row = db.prepare("select * from users where id = ?").get(id) as Row | undefined;
      return row ? toUser(row) : null;
    },

    async setServiceName(userId, serviceName, honorific) {
      db.prepare("update users set service_name = ?, honorific = ? where id = ?").run(serviceName, honorific, userId);
    },

    async listRoles(userId) {
      const rows = db.prepare("select role from roles where user_id = ?").all(userId) as Row[];
      // Unknown roles in the table are ignored rather than trusted.
      return rows.map((row) => String(row.role)).filter((role): role is Role => (ROLES as readonly string[]).includes(role));
    },

    async grantRole(userId, role, grantedBy) {
      db.prepare(
        "insert into roles (user_id, role, granted_by, granted_at) values (?, ?, ?, ?) on conflict do nothing",
      ).run(userId, role, grantedBy, now());
    },

    async revokeRole(userId, role) {
      db.prepare("delete from roles where user_id = ? and role = ?").run(userId, role);
    },

    async listUsers() {
      const users = db.prepare("select * from users order by created_at").all() as Row[];
      const roles = db.prepare("select user_id, role from roles").all() as Row[];
      return users.map((row) => ({
        ...toUser(row),
        roles: roles
          .filter((entry) => entry.user_id === row.id)
          .map((entry) => String(entry.role))
          .filter((role): role is Role => (ROLES as readonly string[]).includes(role)),
      }));
    },

    async listRoleMap() {
      const rows = db.prepare("select * from discord_role_map order by discord_role_name").all() as Row[];
      return rows
        .filter((row) => (ROLES as readonly string[]).includes(String(row.role)))
        .map((row) => ({ discordRoleId: String(row.discord_role_id), discordRoleName: String(row.discord_role_name), role: String(row.role) as Role }));
    },

    async replaceRoleMap(entries: RoleMapEntry[]) {
      db.exec("begin");
      try {
        db.exec("delete from discord_role_map");
        const insert = db.prepare("insert into discord_role_map (discord_role_id, discord_role_name, role) values (?, ?, ?)");
        for (const entry of entries) insert.run(entry.discordRoleId, entry.discordRoleName, entry.role);
        db.exec("commit");
      } catch (error) {
        db.exec("rollback");
        throw error;
      }
    },

    async setRoles(userId, roles) {
      db.exec("begin");
      try {
        const keep = roles.map(() => "?").join(", ");
        db.prepare(`delete from roles where user_id = ?${roles.length ? ` and role not in (${keep})` : ""}`).run(userId, ...roles);
        const insert = db.prepare("insert into roles (user_id, role, granted_by, granted_at) values (?, ?, null, ?) on conflict do nothing");
        for (const role of roles) insert.run(userId, role, now());
        db.exec("commit");
      } catch (error) {
        db.exec("rollback");
        throw error;
      }
    },

    async createSession(tokenHash, userId, expiresAt) {
      db.prepare("insert into sessions (token_hash, user_id, created_at, expires_at) values (?, ?, ?, ?)").run(
        tokenHash,
        userId,
        now(),
        expiresAt.toISOString(),
      );
    },

    async getSession(tokenHash) {
      const row = db.prepare("select user_id, expires_at from sessions where token_hash = ?").get(tokenHash) as
        | Row
        | undefined;
      return row ? { userId: String(row.user_id), expiresAt: String(row.expires_at) } : null;
    },

    async deleteSession(tokenHash) {
      db.prepare("delete from sessions where token_hash = ?").run(tokenHash);
    },

    async deleteExpiredSessions() {
      db.prepare("delete from sessions where expires_at < ?").run(now());
    },

    async createDocument(input: NewDocument) {
      const issuedAt = now();
      const year = new Date(issuedAt).getUTCFullYear();
      const id = randomUUID();
      db.exec("begin immediate");
      try {
        const last = db.prepare("select max(sequence) as seq from documents where year = ?").get(year) as Row;
        const sequence = Number(last.seq ?? 0) + 1;
        const number = `AB-${year}-${String(sequence).padStart(4, "0")}`;
        db.prepare(
          `insert into documents (id, number, year, sequence, template, fields, signer_name, signer_honorific,
             signer_title, signature_seed, issued_by, issued_at)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          number,
          year,
          sequence,
          input.template,
          JSON.stringify(input.fields),
          input.signerName,
          input.signerHonorific,
          input.signerTitle,
          input.signatureSeed,
          input.issuedBy,
          issuedAt,
        );
        db.exec("commit");
      } catch (error) {
        db.exec("rollback");
        throw error;
      }
      return toDocument(db.prepare("select * from documents where id = ?").get(id) as Row);
    },

    async addStamp(input: NewStamp) {
      const id = randomUUID();
      db.prepare(
        `insert into document_stamps (id, document_id, role, stamped_by, decision, signer_name, signer_honorific,
           signer_title, signature_seed, stamped_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        input.documentId,
        input.role,
        input.stampedBy,
        input.decision,
        input.signerName,
        input.signerHonorific,
        input.signerTitle,
        input.signatureSeed,
        now(),
      );
      return toStamp(db.prepare("select * from document_stamps where id = ?").get(id) as Row);
    },

    async listStamps(documentIds) {
      if (documentIds.length === 0) return [];
      const marks = documentIds.map(() => "?").join(", ");
      const rows = db
        .prepare(`select * from document_stamps where document_id in (${marks}) order by stamped_at`)
        .all(...documentIds) as Row[];
      return rows.map(toStamp);
    },

    async listDocuments(limit) {
      const rows = db.prepare("select * from documents order by issued_at desc limit ?").all(limit) as Row[];
      return rows.map(toDocument);
    },

    async getDocument(id) {
      const row = db.prepare("select * from documents where id = ?").get(id) as Row | undefined;
      return row ? toDocument(row) : null;
    },
  };
}
