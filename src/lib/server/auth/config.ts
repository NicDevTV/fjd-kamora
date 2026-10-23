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
  // Preview deployments of other branches fall back to their branch URL, which Vercel sets.
  const branchUrl = process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined;
  const url = process.env.FJD_APP_URL ?? branchUrl;
  if (!url) throw new Error("FJD_APP_URL fehlt (z. B. http://localhost:3000).");
  return url.replace(/\/$/, "");
}

export function discordConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri: `${appUrl()}/auth/discord/callback` };
}

// Local shortcut that signs in a test official with all roles, without Discord. Only in development and
// only when explicitly switched on; a production build can never enable it.
export function devLoginEnabled() {
  return !isProduction && process.env.FJD_DEV_LOGIN === "1";
}
