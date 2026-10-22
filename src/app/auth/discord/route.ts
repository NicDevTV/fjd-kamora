import { NextResponse, connection } from "next/server";
import { OAUTH_COOKIE, SECURE_COOKIES, appUrl, discordConfig } from "@/lib/server/auth/config";
import { authorizeUrl, createOAuthState } from "@/lib/server/auth/discord";

// Starts the Discord login: remembers state and PKCE verifier in a short-lived cookie,
// then sends the browser to Discord.
export async function GET() {
  // Fresh state for every visitor: never let this response be prerendered at build time.
  await connection();
  const config = discordConfig();
  if (!config) return NextResponse.redirect(`${appUrl()}/login?fehler=nicht-eingerichtet`);

  const { state, verifier, challenge } = createOAuthState();
  const response = NextResponse.redirect(authorizeUrl({ ...config, state, challenge }));
  response.cookies.set(OAUTH_COOKIE, `${state}.${verifier}`, {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
