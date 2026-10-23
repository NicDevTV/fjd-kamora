"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth/dal";
import { getStore } from "@/lib/server/db";
import { ROLES, type Role, type RoleMapEntry } from "@/lib/server/db/types";
import { fetchGuildRoles } from "@/lib/server/discord/guild";
import { setFlash } from "@/lib/server/flash";
import { syncAllUsers } from "@/lib/server/roles-sync";

// Role administration. Roles come only from the Discord roles of the guild; the Sicherheitsrat decides which
// Discord role stands for which office. Every action checks the role itself: a Server Action is a public endpoint, the page that shows the form is no protection.

const BACK = "/intern/rollen";
const isRole = (value: string): value is Role => (ROLES as readonly string[]).includes(value);

async function done(tone: "success" | "error", title: string, description?: string): Promise<never> {
  setFlash(await cookies(), { tone, title, description });
  redirect(BACK);
}

// Saves which Discord role of the guild stands for which dashboard role, then applies it to everyone.
export async function saveRoleMap(formData: FormData) {
  await requireUser("sicherheitsrat");
  let guildRoles;
  try {
    guildRoles = await fetchGuildRoles();
  } catch (error) {
    return done("error", "Discord nicht erreichbar", error instanceof Error ? error.message : undefined);
  }

  const entries: RoleMapEntry[] = [];
  for (const guildRole of guildRoles) {
    const chosen = String(formData.get(`map:${guildRole.id}`) ?? "");
    if (!chosen) continue;
    if (!isRole(chosen)) return done("error", "Unbekannte Rolle", "Die Zuordnung wurde nicht gespeichert.");
    entries.push({ discordRoleId: guildRole.id, discordRoleName: guildRole.name, role: chosen });
  }

  // Without a Sicherheitsrat the mapping could never be changed again.
  if (!entries.some((entry) => entry.role === "sicherheitsrat")) {
    return done("error", "Nicht gespeichert", "Mindestens eine Discord-Rolle muss für den Sicherheitsrat stehen.");
  }

  const store = await getStore();
  await store.replaceRoleMap(entries);
  const result = await syncAllUsers(store);
  return done("success", "Zuordnung gespeichert", `${entries.length} Discord-Rollen verknüpft, ${result.changed} von ${result.users} Konten angepasst.`);
}

export async function syncNow() {
  await requireUser("sicherheitsrat");
  const result = await syncAllUsers(await getStore());
  return done("success", "Abgleich fertig", `${result.changed} von ${result.users} Konten angepasst${result.skipped ? `, ${result.skipped} übersprungen` : ""}.`);
}
