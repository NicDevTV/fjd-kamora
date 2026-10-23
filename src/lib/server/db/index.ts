import "server-only";
import type { Store } from "./types";

// Picks the storage backend. Local development uses SQLite; staging and production use
// Supabase Postgres (FJD_DATABASE_URL, one isolated schema each). A deployment without a
// database fails loudly instead of silently writing to a file that would vanish on Vercel.
const globalStore = globalThis as typeof globalThis & { __fjdStore?: Store };

// Hard separation of the three databases. Each environment may only use its own login role:
// production the fjd_prod role, previews (staging) the fjd_staging role, and a local machine
// never the production role. A mixed-up variable stops the app instead of touching the wrong data.
function assertSeparation(url: string) {
  const role = decodeURIComponent(new URL(url).username).split(".")[0];
  const environment = process.env.VERCEL_ENV;
  const expected = environment === "production" ? "fjd_prod_app" : environment === "preview" ? "fjd_staging_app" : null;
  if (expected && role !== expected) {
    throw new Error(`Datenbank-Trennung verletzt: ${environment} darf nur ${expected} verwenden.`);
  }
  if (!expected && role === "fjd_prod_app") {
    throw new Error("Datenbank-Trennung verletzt: lokal ist die Produktionsdatenbank gesperrt.");
  }
}

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
    assertSeparation(url);
    const { createPostgresStore } = await import("./postgres");
    globalStore.__fjdStore = createPostgresStore(url);
    return globalStore.__fjdStore;
  }

  throw new Error(`Unbekannter Datenbank-Treiber "${driver}".`);
}
