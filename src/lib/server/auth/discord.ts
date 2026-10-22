import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Discord OAuth2 (authorization code with PKCE). Only the "identify" scope is requested:
// the app needs the Discord ID, the display name and the avatar, nothing else.

export function createOAuthState() {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function authorizeUrl(input: { clientId: string; redirectUri: string; state: string; challenge: string }) {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: input.clientId,
    scope: "identify",
    redirect_uri: input.redirectUri,
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
    prompt: "none",
  }).toString();
  return url.toString();
}

export function sameState(expected: string, received: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

type DiscordUser = { id: string; username: string; global_name: string | null; avatar: string | null };

export async function fetchDiscordUser(input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  verifier: string;
}) {
  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.verifier,
    }),
    cache: "no-store",
  });
  if (!tokenResponse.ok) throw new Error(`Discord-Token abgelehnt (${tokenResponse.status})`);
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: string };
  if (!accessToken) throw new Error("Discord hat kein Token geliefert");

  const userResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!userResponse.ok) throw new Error(`Discord-Profil nicht abrufbar (${userResponse.status})`);
  const user = (await userResponse.json()) as DiscordUser;
  if (!/^\d{5,25}$/.test(user.id)) throw new Error("Unerwartete Discord-ID");

  return {
    discordId: user.id,
    discordName: (user.global_name || user.username).slice(0, 64),
    avatarUrl: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=96` : null,
  };
}
