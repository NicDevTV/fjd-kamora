import { NextResponse, connection, type NextRequest } from "next/server";
import {
  OAUTH_COOKIE,
  SECURE_COOKIES,
  appUrl,
  discordConfig,
} from "@/lib/server/auth/config";
import { fetchDiscordUser, sameState } from "@/lib/server/auth/discord";
import { startSession } from "@/lib/server/auth/session";
import { setFlash } from "@/lib/server/flash";
import { getStore } from "@/lib/server/db";

function fail(reason: string) {
  const response = NextResponse.redirect(`${appUrl()}/login?fehler=${reason}`);
  response.cookies.set(OAUTH_COOKIE, "", { httpOnly: true, secure: SECURE_COOKIES, path: "/", maxAge: 0 });
  return response;
}

// Discord sends the browser back here. The state must match the cookie set at the start,
// otherwise the request did not begin on this site and is rejected.
export async function GET(request: NextRequest) {
  await connection();
  const config = discordConfig();
  if (!config) return fail("nicht-eingerichtet");

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return fail("abgebrochen");

  const code = params.get("code");
  const state = params.get("state");
  const [expectedState, verifier] = (request.cookies.get(OAUTH_COOKIE)?.value ?? "").split(".");
  if (!code || !state || !expectedState || !verifier || !sameState(expectedState, state)) {
    return fail("ungueltig");
  }

  let profile;
  try {
    profile = await fetchDiscordUser({ ...config, code, verifier });
  } catch (error) {
    console.error("Discord-Login fehlgeschlagen:", error instanceof Error ? error.message : error);
    return fail("discord");
  }

  const store = await getStore();
  const user = await store.upsertDiscordUser(profile);
  // Roles are granted in the database by the Sicherheitsrat. Without one there is no session at
  // all: the account exists (so it can be granted later), but cannot enter.
  if ((await store.listRoles(user.id)).length === 0) return fail("keine-rolle");

  const response = NextResponse.redirect(`${appUrl()}/intern`);
  response.cookies.set(OAUTH_COOKIE, "", { httpOnly: true, secure: SECURE_COOKIES, path: "/", maxAge: 0 });
  await startSession(response, user.id);
  setFlash(response.cookies, { tone: "success", title: "Angemeldet", description: `Willkommen, ${user.serviceName ?? user.discordName}.` });
  return response;
}
