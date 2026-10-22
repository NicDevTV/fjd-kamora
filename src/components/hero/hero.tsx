"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { FjdLogo } from "@/components/fjd-logo";
import type { PointerPosition } from "@/components/hero/hero-scene";

// WebGL only exists in the browser. Until the scene is ready, the flat emblem sits on the same background.
const HeroScene = dynamic(() => import("@/components/hero/hero-scene"), { ssr: false });

function StaticEmblem() {
  return (
    <div className="absolute inset-0 flex items-start justify-center pt-[18svh] md:items-center md:justify-end md:pr-[12%] md:pt-0">
      <FjdLogo className="h-[34svh] w-auto text-white/15 md:h-[52svh]" />
    </div>
  );
}

// If WebGL fails, the flat emblem stays instead of an empty area.
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <StaticEmblem /> : this.props.children;
  }
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const pointer = useRef<PointerPosition>({ x: 0, y: 0 });
  const reduced = useReducedMotion() ?? false;

  // Pointer position in -1..1 across the viewport (up is +1, as in three.js), read by the 3D scene every frame.
  useEffect(() => {
    function onMove(event: PointerEvent) {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = 1 - (event.clientY / window.innerHeight) * 2;
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  const [ready, setReady] = useState(false);
  const [covered, setCovered] = useState(false);
  const [mountScene, setMountScene] = useState(false);

  // The 3D scene loads only once the page is idle, so it never competes with the first paint and
  // the intro. With data saver or very little memory the flat emblem stays.
  useEffect(() => {
    const device = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (device.connection?.saveData || (device.deviceMemory ?? 8) <= 2) return;

    const intro = !document.documentElement.classList.contains("fjd-intro-skip");
    let idle = 0;
    const timer = window.setTimeout(() => {
      const start = () => setMountScene(true);
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(start, { timeout: 1500 });
      else start();
    }, intro ? Math.max(0, 900 - performance.now()) : 0);

    return () => {
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, []);

  // The hero is sticky, so its own position is useless as a measure.
  // Progress = page scroll divided by hero height: 0 at the top, 1 once the glass sheet covers it.
  const { scrollY } = useScroll();
  const scrollYProgress = useTransform(scrollY, (value) => {
    const height = ref.current?.offsetHeight ?? 1;
    return Math.min(1, Math.max(0, value / height));
  });
  useMotionValueEvent(scrollYProgress, "change", (value) => setCovered(value > 0.995));

  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -140]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const shade = useTransform(scrollYProgress, [0, 1], [0, 0.55]);

  return (
    <section
      ref={ref}
      aria-labelledby="hero-titel"
      className="sticky top-0 h-[100svh] min-h-[620px] overflow-hidden bg-navy text-white"
    >
      <div className="hero-light absolute inset-0">
        {!ready && <StaticEmblem />}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}>
          {mountScene && (
          <SceneBoundary>
            <HeroScene
              progress={scrollYProgress}
              pointer={pointer}
              active={!covered}
              reduced={reduced}
              onReady={() => setReady(true)}
            />
          </SceneBoundary>
          )}
        </div>
      </div>

      {/* Gradient towards the bottom left so the text stays readable over any part of the background. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(22_38_58/0.75),rgb(22_38_58/0.15)_60%,transparent)] max-md:bg-[linear-gradient(0deg,rgb(22_38_58/0.9),rgb(22_38_58/0.2)_55%,transparent)]" />
      <motion.div style={{ opacity: shade }} className="pointer-events-none absolute inset-0 bg-[#0b1420]" />

      <motion.div
        style={{ y: copyY, opacity: copyOpacity }}
        className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pb-20 sm:px-8 md:justify-center md:pb-0"
      >
        <div className="max-w-xl">
          <h1
            id="hero-titel"
            lang="la"
            className="font-serif text-[clamp(3.25rem,9vw,6.5rem)] font-medium leading-[0.98] tracking-tight"
          >
            Lex supra omnes.
          </h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-white/80">
            Das Gesetz steht über jedem Amt. Das Federal Justice Department von Kamora führt die
            Anklage, schützt die Gerichte und kontrolliert Polizei und eigene Reihen.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/rechtskodex"
              transitionTypes={["nav-forward"]}
              className="liquid inline-flex items-center rounded-full px-6 py-3.5 text-sm font-medium"
            >
              <span className="relative z-10">Rechtskodex öffnen</span>
            </Link>
            <a
              href="#verfahrensweg"
              className="inline-flex items-center rounded-full px-6 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Verfahrensweg ansehen
            </a>
          </div>
        </div>
      </motion.div>

      <motion.div
        style={{ opacity: copyOpacity }}
        aria-hidden="true"
        className="absolute bottom-20 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-xs text-white/50 md:flex"
      >
        <span>Scrollen</span>
        <span className="scroll-cue relative block h-10 w-px overflow-hidden bg-white/20" />
      </motion.div>
    </section>
  );
}
