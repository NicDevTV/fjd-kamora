import { FjdLogo } from "@/components/fjd-logo";

// Intro on every full page load. The logo draws itself, then the curtain
// lifts away. Pure CSS, so it also runs without JavaScript.
export function IntroScreen() {
  return (
    <div
      role="status"
      aria-label="Seite wird geladen"
      className="fjd-intro fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-navy text-white"
    >
      <FjdLogo animated className="h-28 w-auto text-white" />
      <p className="fjd-wordmark font-serif text-lg tracking-wide">
        Federal Justice Department
      </p>
      <div className="h-px w-44 overflow-hidden bg-white/20">
        <div className="fjd-progress h-full w-full bg-white" />
      </div>
    </div>
  );
}
