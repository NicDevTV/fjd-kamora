import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getStore } from "@/lib/server/db";
import type { Role, User } from "@/lib/server/db/types";
import { SESSION_COOKIE } from "./config";
import { syncIfStale } from "@/lib/server/roles-sync";
import { hashToken } from "./session";

// Data access layer: the only place that turns the session cookie into a user. Pages, Server
// Actions and Route Handlers all call it, so every request is checked on the server, close to
// the data, never only in the proxy or the UI.

export type CurrentUser = User & { roles: Role[] };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Session checks compare against the current time: always per request, never prerendered.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const store = await getStore();
  const session = await store.getSession(hashToken(token));
  if (!session || new Date(session.expiresAt) <= new Date()) return null;

  const user = await store.getUser(session.userId);
  if (!user) return null;
  // Roles come from the Discord guild too: re-read them every few minutes so a removed role does not outlive the session.
  if (await syncIfStale(store, user)) return { ...user, roles: await store.listRoles(user.id) };
  return { ...user, roles: await store.listRoles(user.id) };
});

// Access to the internal area: signed in and holding at least one role (or the given one).
export async function requireUser(role?: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.roles.length === 0) redirect("/login?fehler=keine-rolle");
  if (role && !user.roles.includes(role)) redirect("/intern?fehler=keine-berechtigung");
  return user;
}
