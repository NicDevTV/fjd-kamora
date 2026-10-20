import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import { GlassPointer } from "@/components/glass-pointer";
import { IntroScreen } from "@/components/intro-screen";
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
  title: "Dashboard | Federal Justice Department (FJD)",
  description:
    "Fiktives Rollenspiel-Dashboard des Federal Justice Department. Keine Verbindung zu einer realen Behörde.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      data-scroll-behavior="smooth"
      className={`${plexSerif.variable} ${plexSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* The curtain lives in the layout so it only runs on a real page load, not on in-app navigation. */}
        <IntroScreen />
        <GlassPointer />
        {children}
      </body>
    </html>
  );
}
