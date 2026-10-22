import { NextResponse } from "next/server";
import { appUrl, devLoginEnabled } from "@/lib/server/auth/config";
import { startSession } from "@/lib/server/auth/session";
import { setFlash } from "@/lib/server/flash";
import { getStore } from "@/lib/server/db";

// Development only: signs in a test Justizminister without a Discord app, so the internal area
// can be tried locally. Answers 404 unless FJD_DEV_LOGIN=1 in a non-production build.
export async function POST() {
  if (!devLoginEnabled()) return new NextResponse(null, { status: 404 });

  const store = await getStore();
  const user = await store.upsertDiscordUser({ discordId: "0000000000000001", discordName: "Testzugang", avatarUrl: null });
  await store.grantRole(user.id, "justizminister", null);

  const response = NextResponse.redirect(`${appUrl()}/intern`, { status: 303 });
  await startSession(response, user.id);
  setFlash(response.cookies, { tone: "success", title: "Angemeldet", description: "Lokaler Testzugang als Justizminister." });
  return response;
}
