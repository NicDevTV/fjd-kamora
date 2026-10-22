import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";
import { getStore } from "@/lib/server/db";
import { SECURE_COOKIES, SESSION_COOKIE, SESSION_DAYS } from "./config";

// Sessions are random tokens. The browser holds the token, the database only its SHA-256 hash,
// so a leaked database cannot be replayed as a login.
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export async function startSession(response: NextResponse, userId: string) {
  const store = await getStore();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await store.createSession(hashToken(token), userId, expiresAt);
  await store.deleteExpiredSessions();

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(response: NextResponse, token: string | undefined) {
  if (token) await (await getStore()).deleteSession(hashToken(token));
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
