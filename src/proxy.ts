import { NextResponse, type NextRequest } from "next/server";

// First, cheap filter for the internal area: without a session cookie the browser goes straight
// to the login. It only checks that a cookie exists; whether the session is valid and the user
// holds a role is decided on the server for every page and action (lib/server/auth/dal.ts).
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("__Host-fjd_session") || request.cookies.has("fjd_session");
  if (!hasSession) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/intern/:path*"],
};
