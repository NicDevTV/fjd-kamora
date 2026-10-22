import "server-only";
import type { Store } from "./types";

// Picks the storage backend. Local development uses SQLite; staging and production use
// Supabase Postgres (FJD_DATABASE_URL, one isolated schema each). A deployment without a
// database fails loudly instead of silently writing to a file that would vanish on Vercel.
const globalStore = globalThis as typeof globalThis & { __fjdStore?: Store };

export async function getStore(): Promise<Store> {
  if (globalStore.__fjdStore) return globalStore.__fjdStore;

  const driver = process.env.FJD_DB ?? (process.env.NODE_ENV === "production" ? "postgres" : "sqlite");
  if (driver === "sqlite") {
    if (process.env.VERCEL) throw new Error("SQLite ist nur für die lokale Entwicklung gedacht.");
    const { createSqliteStore } = await import("./sqlite");
    globalStore.__fjdStore = createSqliteStore();
    return globalStore.__fjdStore;
  }

  if (driver === "postgres") {
    const url = process.env.FJD_DATABASE_URL;
    if (!url) throw new Error("FJD_DATABASE_URL fehlt.");
    const { createPostgresStore } = await import("./postgres");
    globalStore.__fjdStore = createPostgresStore(url);
    return globalStore.__fjdStore;
  }

  throw new Error(`Unbekannter Datenbank-Treiber "${driver}".`);
}
