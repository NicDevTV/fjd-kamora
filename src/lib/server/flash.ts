import "server-only";
import { FLASH_COOKIE, type Flash } from "@/lib/toast";

type CookieTarget = {
  set(name: string, value: string, options: { path: string; maxAge: number; sameSite: "lax"; secure: boolean }): unknown;
};

// Leaves a toast for the next page the browser shows (after a redirect). Readable by the page
// on purpose: it holds only the message, nothing secret, and lives one minute at most.
export function setFlash(cookies: CookieTarget, flash: Flash) {
  cookies.set(FLASH_COOKIE, encodeURIComponent(JSON.stringify(flash)), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
