import type { Metadata } from "next";
import { FjdLogo } from "@/components/fjd-logo";
import { GlassBackdrop } from "@/components/glass-backdrop";
import { devLoginEnabled } from "@/lib/server/auth/config";

export const metadata: Metadata = {
  title: "Anmelden | Federal Justice Department (FJD)",
  robots: { index: false },
};

// The page reads the URL for error messages, so it renders per request.
export const instant = false;

const MESSAGES: Record<string, string> = {
  "keine-rolle": "Dein Discord-Konto ist bekannt, hat aber noch keine Rolle. Der Justizminister muss dich freischalten.",
  abgebrochen: "Die Anmeldung bei Discord wurde abgebrochen.",
  ungueltig: "Die Anmeldung ist abgelaufen oder ungültig. Bitte versuch es noch einmal.",
  discord: "Discord hat die Anmeldung nicht bestätigt. Bitte versuch es gleich noch einmal.",
  "nicht-eingerichtet": "Der Discord-Login ist auf diesem Server noch nicht eingerichtet.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const error = typeof params.fehler === "string" ? MESSAGES[params.fehler] : undefined;
  const signedOut = params.abgemeldet === "1";

  return (
    <main id="inhalt" className="relative isolate flex min-h-screen items-center justify-center overflow-clip bg-paper px-4 py-16">
      <GlassBackdrop />
      <div className="glass-panel w-full max-w-md p-8 sm:p-10">
        <FjdLogo className="h-14 w-auto text-navy" />
        <h1 className="mt-8 font-serif text-4xl font-medium leading-tight">Interner Bereich</h1>
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink/75">
          Für Amtsträger des Föderalen Justizdepartements. Du meldest dich mit deinem Discord-Konto an.
        </p>

        {error && (
          <p role="alert" className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm leading-relaxed text-accent">
            {error}
          </p>
        )}
        {signedOut && !error && (
          <p role="status" className="mt-6 rounded-2xl bg-white/60 px-4 py-3 text-sm text-ink/75">
            Du bist abgemeldet.
          </p>
        )}

        {/* A plain link, not next/link: the login must never be prefetched. */}
        <a
          href="/auth/discord"
          className="liquid-solid mt-8 flex items-center justify-center gap-3 rounded-full px-6 py-3.5 font-medium text-white"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
            <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.5 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4a12.8 12.8 0 0 1-2 1l1.3 2a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.7ZM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
          </svg>
          Mit Discord anmelden
        </a>

        {devLoginEnabled() && (
          <form action="/auth/dev" method="post" className="mt-3">
            <button type="submit" className="w-full rounded-full border border-dashed border-ink/30 px-6 py-3 text-sm text-ink/70 transition-colors hover:bg-white/60">
              Lokaler Testzugang als Justizminister
            </button>
          </form>
        )}

        <p className="mt-8 text-xs leading-relaxed text-muted">
          Gespeichert werden nur deine Discord-ID, dein Anzeigename und dein Profilbild. Ohne zugewiesene Rolle wird keine
          Sitzung angelegt.
        </p>
      </div>
    </main>
  );
}
