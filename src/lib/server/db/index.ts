import "server-only";
import type { Store } from "./types";

// Picks the storage backend. Local development uses SQLite; production uses
// Supabase Postgres (FJD_DATABASE_URL, isolated schema fjd_prod). A deployment without a
// database fails loudly instead of silently writing to a file that would vanish on Vercel.
const globalStore = globalThis as typeof globalThis & { __fjdStore?: Store };

// Hard separation of local and production data. Only production may use the fjd_prod role;
// a local machine or preview deployment never touches the production database.
function assertSeparation(url: string) {
  const role = decodeURIComponent(new URL(url).username).split(".")[0];
  const production = process.env.VERCEL_ENV === "production";
  if (production && role !== "fjd_prod_app") {
    throw new Error("Datenbank-Trennung verletzt: Produktion darf nur fjd_prod_app verwenden.");
  }
  if (!production && role === "fjd_prod_app") {
    throw new Error("Datenbank-Trennung verletzt: außerhalb der Produktion ist die Produktionsdatenbank gesperrt.");
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
