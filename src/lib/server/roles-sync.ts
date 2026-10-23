import "server-only";
import { fetchMemberRoles, guildConfig } from "@/lib/server/discord/guild";
import type { Role, Store, User } from "@/lib/server/db/types";

// The dashboard roles ARE the Discord roles of the guild, following the mapping the Sicherheitsrat maintains.
// There are no roles granted by hand.
//
// Fail-safe: if Discord cannot be reached, or no mapping exists, nobody loses a role.

export function syncAvailable() {
  return guildConfig() !== null;
}

// Returns the synced roles, or null if nothing was changed.
export async function syncUserRoles(store: Store, user: Pick<User, "id" | "discordId">): Promise<Role[] | null> {
  if (!guildConfig()) return null;
  const map = await store.listRoleMap();
  if (map.length === 0) return null;

  let memberRoles: string[] | null;
  try {
    memberRoles = await fetchMemberRoles(user.discordId);
  } catch (error) {
    console.error("[discord] role sync failed:", error instanceof Error ? error.message : "unknown");
    return null;
  }

  // Not in the guild (any more): the roles end here.
  const roles = memberRoles === null ? [] : [...new Set(map.filter((entry) => memberRoles.includes(entry.discordRoleId)).map((entry) => entry.role))];
  await store.setRoles(user.id, roles);
  return roles;
}

export async function syncAllUsers(store: Store) {
  const users = await store.listUsers();
  let changed = 0;
  let skipped = 0;
  for (const user of users) {
    const before = user.roles.slice().sort().join(",");
    const after = await syncUserRoles(store, user);
    if (after === null) skipped += 1;
    else if (after.slice().sort().join(",") !== before) changed += 1;
  }
  return { users: users.length, changed, skipped };
}

// Re-reads a signed-in user's roles from Discord at most every few minutes, so a role removed in the guild
// does not stay valid for the whole session. Per server instance; the login always syncs.
const lastSync = new Map<string, number>();
const SYNC_EVERY_MS = 5 * 60 * 1000;

export async function syncIfStale(store: Store, user: Pick<User, "id" | "discordId">) {
  const now = Date.now();
  if (now - (lastSync.get(user.id) ?? 0) < SYNC_EVERY_MS) return false;
  lastSync.set(user.id, now);
  return (await syncUserRoles(store, user)) !== null;
}
