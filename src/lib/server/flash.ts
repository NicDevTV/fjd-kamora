import "server-only";
import { randomUUID } from "node:crypto";
import { FLASH_COOKIE, type Flash } from "@/lib/toast";

type CookieTarget = {
  set(name: string, value: string, options: { path: string; maxAge: number; sameSite: "lax"; secure: boolean }): unknown;
};

// Leaves a toast for the next page the browser shows (after a redirect). Readable by the page
// on purpose: it holds only the message, nothing secret, and lives one minute at most.
// Base64url, because cookie libraries percent-encode values on their own and would otherwise
// encode the JSON a second time.
export function setFlash(cookies: CookieTarget, flash: Flash) {
  // Identical consecutive results must also retrigger the client's effect.
  cookies.set(FLASH_COOKIE, Buffer.from(JSON.stringify({ ...flash, id: randomUUID() }), "utf8").toString("base64url"), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
