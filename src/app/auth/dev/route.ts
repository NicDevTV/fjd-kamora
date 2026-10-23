import { NextResponse } from "next/server";
import { appUrl, devLoginEnabled } from "@/lib/server/auth/config";
import { startSession } from "@/lib/server/auth/session";
import { setFlash } from "@/lib/server/flash";
import { getStore } from "@/lib/server/db";
import { ROLES } from "@/lib/server/db/types";

// Development only: signs in a test Justizminister without a Discord app, so the internal area
// can be tried locally. Answers 404 unless FJD_DEV_LOGIN=1 in a non-production build.
export async function POST(request: Request) {
  if (!devLoginEnabled()) return new NextResponse(null, { status: 404 });

  const store = await getStore();
  const user = await store.upsertDiscordUser({ discordId: "0000000000000001", discordName: "Testzugang", avatarUrl: null });
  // The test account holds every office, so every template can be tried.
  for (const role of ROLES) await store.grantRole(user.id, role, null);

  // A second account lets a document be countersigned by someone else (nobody stamps their own).
  const second = await store.upsertDiscordUser({ discordId: "0000000000000002", discordName: "Testzugang 2", avatarUrl: null });
  if (!second.serviceName) await store.setServiceName(second.id, "Helena Vorwerk", null);
  for (const role of ["gouverneur", "senatspraesident", "richter", "oberster_richter", "chief_of_police"] as const) {
    await store.grantRole(second.id, role, null);
  }

  const form = await request.formData().catch(() => null);
  const asSecond = form?.get("who") === "2";
  const response = NextResponse.redirect(`${appUrl()}/intern`, { status: 303 });
  await startSession(response, asSecond ? second.id : user.id);
  setFlash(response.cookies, {
    tone: "success",
    title: "Angemeldet",
    description: asSecond ? "Testzugang 2: Gouverneur, Senat, Gericht, Polizei." : "Lokaler Testzugang mit allen Rollen.",
  });
  return response;
}
