import { requireUser } from "@/lib/server/auth/dal";
import { getStore } from "@/lib/server/db";
import { fullName, ROLE_LABEL, ROLES } from "@/lib/server/db/types";
import { fetchGuildRoles, guildConfig, type GuildRole } from "@/lib/server/discord/guild";
import { saveRoleMap, syncNow } from "./actions";

// Depends on the signed-in user: rendered per request (see intern/layout.tsx).
export const instant = false;

const select =
  "rounded-full border border-ink/15 bg-white/85 px-4 py-2 text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/25";

export default async function RollenPage() {
  await requireUser("sicherheitsrat");
  const store = await getStore();
  const [users, map] = await Promise.all([store.listUsers(), store.listRoleMap()]);

  // The guild roles come live from Discord; if that fails the page still works for manual roles.
  let guildRoles: GuildRole[] = [];
  let guildError: string | null = null;
  if (guildConfig()) {
    try {
      guildRoles = await fetchGuildRoles();
    } catch (error) {
      guildError = error instanceof Error ? error.message : "Discord nicht erreichbar.";
    }
  }
  const chosen = new Map(map.map((entry) => [entry.discordRoleId, entry.role]));

  return (
    <div className="space-y-8">
      <section className="glass-panel p-8 sm:p-10">
        <h1 className="font-serif text-4xl font-medium leading-tight">Rollen</h1>
        <p className="mt-3 max-w-prose text-[1.0625rem] leading-relaxed text-ink/75">
          Wer sich anmeldet, bekommt seine Rollen allein aus dem Discord-Server. Hier legst du fest, welche Discord-Rolle für welches Amt im
          Dashboard steht. Alle paar Minuten und bei jeder Anmeldung wird neu abgeglichen.
        </p>
      </section>

      <section className="glass-panel p-8 sm:p-10">
        <h2 className="font-serif text-2xl font-medium">Discord-Rollen zuordnen</h2>
        {!guildConfig() ? (
          <p className="mt-4 max-w-prose rounded-2xl bg-white/70 px-4 py-3 text-[0.9375rem] leading-relaxed">
            Der Bot ist hier noch nicht eingerichtet. Es fehlen <code>DISCORD_BOT_TOKEN</code> und <code>DISCORD_GUILD_ID</code> für diese
            Umgebung.
          </p>
        ) : guildError ? (
          <p className="mt-4 max-w-prose rounded-2xl bg-accent/5 px-4 py-3 text-[0.9375rem] leading-relaxed text-accent">{guildError}</p>
        ) : (
          <form action={saveRoleMap} className="mt-5">
            <ul className="divide-y divide-ink/10">
              {guildRoles.map((guildRole) => (
                <li key={guildRole.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="size-3 rounded-full border border-ink/15"
                      style={{ background: guildRole.color ? `#${guildRole.color.toString(16).padStart(6, "0")}` : "transparent" }}
                    />
                    {guildRole.name}
                  </span>
                  <select name={`map:${guildRole.id}`} defaultValue={chosen.get(guildRole.id) ?? ""} className={select} aria-label={`Rolle für ${guildRole.name}`}>
                    <option value="">kein Amt</option>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="submit" className="liquid-solid rounded-full px-6 py-3 text-sm font-medium text-white">
                Zuordnung speichern
              </button>
              <button
                type="submit"
                formAction={syncNow}
                className="rounded-full border border-ink/15 px-6 py-3 text-sm font-medium text-ink/80 transition-colors hover:bg-white/70"
              >
                Alle jetzt abgleichen
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="glass-panel p-8 sm:p-10">
        <h2 className="font-serif text-2xl font-medium">Konten</h2>
        <ul className="mt-5 divide-y divide-ink/10">
          {users.map((user) => (
            <li key={user.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{user.serviceName ? fullName(user.honorific, user.serviceName) : user.discordName}</p>
                <p className="text-xs text-muted">{user.discordName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {user.roles.length === 0 && <span className="text-sm text-muted">keine Rolle</span>}
                {user.roles.map((role) => (
                  <span key={role} className="rounded-full bg-navy/8 px-3 py-1 text-xs font-medium text-navy">
                    {ROLE_LABEL[role]}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
