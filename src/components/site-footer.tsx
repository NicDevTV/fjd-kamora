import Link from "next/link";
import { FjdLogo } from "@/components/fjd-logo";

export function SiteFooter() {
  return (
    <footer className="px-3 pb-4 pt-10 sm:px-6 sm:pb-6">
      <div className="glass-dark is-solid mx-auto grid max-w-6xl gap-8 rounded-[2rem] px-6 py-9 text-white sm:px-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <div className="flex items-center gap-3">
            <FjdLogo className="h-10 w-auto text-white" />
            <p className="font-serif text-lg font-medium">Federal Justice Department</p>
          </div>
          <p className="mt-5 max-w-xl text-xs leading-relaxed text-white/60">
            Fiktives Rollenspiel-Projekt für Kamora-V. Das Federal Justice Department ist eine
            erfundene Behörde und steht in keiner Verbindung zu einer realen Regierung,
            Justizbehörde oder Institution.
          </p>
        </div>

        <nav aria-label="Fußzeile" className="flex gap-2 text-sm">
          <Link
            href="/"
            transitionTypes={["nav-back"]}
            className="rounded-full px-4 py-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            Startseite
          </Link>
          <Link
            href="/rechtskodex"
            transitionTypes={["nav-forward"]}
            className="rounded-full px-4 py-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            Rechtskodex
          </Link>
        </nav>
      </div>
    </footer>
  );
}
