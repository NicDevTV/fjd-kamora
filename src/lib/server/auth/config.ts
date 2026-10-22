import "server-only";

const isProduction = process.env.NODE_ENV === "production";

// Session cookie. In production the __Host- prefix makes the browser reject the cookie unless it
// is Secure, set for the whole site and bound to this exact host (no Domain attribute).
export const SESSION_COOKIE = isProduction ? "__Host-fjd_session" : "fjd_session";
export const OAUTH_COOKIE = isProduction ? "__Host-fjd_oauth" : "fjd_oauth";
export const SESSION_DAYS = 7;
export const SECURE_COOKIES = isProduction;

// The public base URL, used for the OAuth redirect. Never derived from request headers,
// so a forged Host header cannot redirect the login elsewhere.
export function appUrl() {
  const url = process.env.FJD_APP_URL;
  if (!url) throw new Error("FJD_APP_URL fehlt (z. B. http://localhost:3000).");
  return url.replace(/\/$/, "");
}

export function discordConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri: `${appUrl()}/auth/discord/callback` };
}

// Local shortcut that signs in a test Justizminister without Discord. Only in development and
// only when explicitly switched on; a production build can never enable it.
export function devLoginEnabled() {
  return !isProduction && process.env.FJD_DEV_LOGIN === "1";
}

// Discord IDs that receive the Justizminister role on their first sign-in. Lets the first
// minister in without database access; later grants happen inside the app.
export function bootstrapMinisterIds(): Set<string> {
  return new Set(
    (process.env.FJD_BOOTSTRAP_JM ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => /^\d{5,25}$/.test(id)),
  );
}
