import type { Metadata } from "next";
import Link from "next/link";
import { FjdLogo } from "@/components/fjd-logo";
import { GlassBackdrop } from "@/components/glass-backdrop";
import { requireUser } from "@/lib/server/auth/dal";
import { ROLE_LABEL } from "@/lib/server/db/types";

export const metadata: Metadata = {
  title: "Intern | Federal Justice Department (FJD)",
  robots: { index: false },
};

// Every page here depends on the signed-in user, so the segment renders per request.
export const instant = false;

const NAV = [
  { href: "/intern", label: "Übersicht" },
  { href: "/intern/amtsblatt", label: "Amtsblatt" },
  { href: "/intern/profil", label: "Profil" },
  { href: "/", label: "Hauptseite" },
];

export default async function InternLayout({ children }: LayoutProps<"/intern">) {
  const user = await requireUser();

  return (
    <div className="relative isolate min-h-screen overflow-clip bg-paper">
      <GlassBackdrop />
      <header className="px-3 pt-3 sm:pt-4">
        <div className="glass-dark is-solid mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-[1.75rem] px-3 py-2 text-white">
          <Link href="/" className="flex items-center gap-2.5 rounded-full py-1 pl-1.5 pr-3">
            <FjdLogo className="h-9 w-auto text-white" />
            <span className="font-serif text-[0.9375rem] font-medium leading-tight">FJD Intern</span>
          </Link>
          <nav aria-label="Intern" className="order-3 w-full sm:order-none sm:w-auto">
            <ul className="flex gap-1 text-sm">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="block rounded-full px-4 py-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs leading-tight sm:block">
              <p className="font-medium text-white">{user.serviceName ?? user.discordName}</p>
              <p className="text-white/60">{user.roles.map((role) => ROLE_LABEL[role]).join(", ")}</p>
            </div>
            <form action="/auth/logout" method="post">
              <button type="submit" className="rounded-full bg-white/10 px-4 py-2.5 text-sm transition-colors hover:bg-white/15">
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>
      {/* Headings break long German compounds at syllables rather than overflowing their card. */}
      <main id="inhalt" className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-8 [&_h1]:hyphens-auto [&_h1]:[overflow-wrap:anywhere]">
        {children}
      </main>
    </div>
  );
}
