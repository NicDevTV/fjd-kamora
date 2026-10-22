import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, appUrl } from "@/lib/server/auth/config";
import { endSession } from "@/lib/server/auth/session";
import { setFlash } from "@/lib/server/flash";

// Sign-out only by POST from this site: a link or image on another page cannot log anyone out.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(appUrl()).origin) {
    return new NextResponse("Ungültige Herkunft", { status: 403 });
  }

  const response = NextResponse.redirect(`${appUrl()}/login`, { status: 303 });
  await endSession(response, request.cookies.get(SESSION_COOKIE)?.value);
  setFlash(response.cookies, { tone: "info", title: "Abgemeldet", description: "Deine Sitzung ist beendet." });
  return response;
}
