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

async function done(tone: "success" | "error" | "info", title: string, description?: string): Promise<never> {
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

  let store;
  try {
    store = await getStore();
    await store.replaceRoleMap(entries);
  } catch (error) {
    console.error("[roles] saving role mapping failed:", error);
    return done("error", "Nicht gespeichert", "Die Zuordnung konnte nicht gespeichert werden. Bitte versuche es erneut.");
  }
  let result;
  try {
    result = await syncAllUsers(store);
  } catch (error) {
    console.error("[roles] sync after saving failed:", error);
    return done("info", "Zuordnung gespeichert", "Der anschließende Abgleich ist fehlgeschlagen. Bitte starte „Alle jetzt abgleichen“ erneut.");
  }
  return done(result.skipped ? "info" : "success", "Zuordnung gespeichert", `${entries.length} Discord-Rollen verknüpft, ${result.changed} von ${result.users} Konten angepasst${result.skipped ? `, ${result.skipped} nicht abgeglichen. Bitte erneut abgleichen` : ""}.`);
}

export async function syncNow() {
  await requireUser("sicherheitsrat");
  let result;
  try {
    result = await syncAllUsers(await getStore());
  } catch (error) {
    console.error("[roles] sync failed:", error);
    return done("error", "Abgleich fehlgeschlagen", "Die Konten konnten nicht vollständig abgeglichen werden. Bitte versuche es erneut.");
  }
  return done(result.skipped ? "info" : "success", result.skipped ? "Abgleich unvollständig" : "Abgleich fertig", `${result.changed} von ${result.users} Konten angepasst${result.skipped ? `, ${result.skipped} nicht abgeglichen. Bitte erneut versuchen` : ""}.`);
}
