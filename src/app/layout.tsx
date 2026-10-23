import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import { AbbrTooltip } from "@/components/abbr-tooltip";
import { GlassPointer } from "@/components/glass-pointer";
import { IntroScreen } from "@/components/intro-screen";
import { NavProgress } from "@/components/nav-progress";
import { Toaster } from "@/components/toaster";
import "./globals.css";

const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Federal Justice Department (FJD) | Kamora",
  description:
    "Fiktives Federal Justice Department des Rollenspielstaats Kamora. Keine Verbindung zu einer realen Behörde.",
};

// Runs before the first paint: the intro plays once per tab session, later full loads skip it.
// Storage can be blocked (private mode), then the intro simply plays again.
const introOnce = `try{if(sessionStorage.getItem("fjd-intro"))document.documentElement.classList.add("fjd-intro-skip");else sessionStorage.setItem("fjd-intro","1")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      data-scroll-behavior="smooth"
      className={`${plexSerif.variable} ${plexSans.variable} h-full antialiased`}
      // The inline script below may add a class before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: introOnce }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* The curtain lives in the layout so it only runs on a real page load, not on in-app navigation. */}
        <a
          href="#inhalt"
          className="sr-only z-[60] rounded-full bg-navy px-5 py-3 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Zum Inhalt springen
        </a>
        <IntroScreen />
        <NavProgress />
        <GlassPointer />
        <AbbrTooltip />
        <Toaster />
        {children}
      </body>
    </html>
  );
}
