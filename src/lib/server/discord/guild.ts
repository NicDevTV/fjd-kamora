import "server-only";

// Reads the roles of the Discord server (guild) with the bot, so the Sicherheitsrat can say which Discord
// role stands for which role of the dashboard. The bot only needs to be a member of the guild; it needs no
// permissions and no privileged intent, because members are fetched one by one through the REST API.
//
// Per environment (Vercel production / preview, .env.local) two values: DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.
// Without them every function here reports "not configured" and the dashboard keeps its manual roles.

const API = "https://discord.com/api/v10";

export type GuildRole = { id: string; name: string; position: number; color: number };

export function guildConfig() {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!token || !guildId || !/^\d{5,25}$/.test(guildId)) return null;
  return { token, guildId };
}

async function call(path: string, token: string) {
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bot ${token}`, "User-Agent": "DiscordBot (https://fjd-kamora.vercel.app, 1.0)" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
}

// Roles of the guild, highest first, without the @everyone role.
export async function fetchGuildRoles(): Promise<GuildRole[]> {
  const config = guildConfig();
  if (!config) throw new Error("Discord-Bot nicht eingerichtet.");
  const response = await call(`/guilds/${config.guildId}/roles`, config.token);
  if (!response.ok) throw new Error(`Discord antwortet mit ${response.status} (Bot im Server? Token richtig?).`);
  const roles = (await response.json()) as GuildRole[];
  return roles.filter((role) => role.id !== config.guildId).sort((a, b) => b.position - a.position);
}

// The role ids of one member, or null if the person is not (or no longer) in the guild.
export async function fetchMemberRoles(discordId: string): Promise<string[] | null> {
  const config = guildConfig();
  if (!config) throw new Error("Discord-Bot nicht eingerichtet.");
  if (!/^\d{5,25}$/.test(discordId)) return null;
  const response = await call(`/guilds/${config.guildId}/members/${discordId}`, config.token);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Discord antwortet mit ${response.status}.`);
  const member = (await response.json()) as { roles?: string[] };
  return Array.isArray(member.roles) ? member.roles : [];
}
