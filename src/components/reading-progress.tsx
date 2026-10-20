"use client";

import { useEffect } from "react";

// Hairline along the top edge that shows reading progress while scrolling.
export function ReadingProgress() {
  useEffect(() => {
    const bar = document.getElementById("rk-progress");
    if (!bar) return;

    function update() {
      const root = document.documentElement;
      const max = root.scrollHeight - root.clientHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      bar!.style.transform = `scaleX(${progress})`;
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5">
      <div id="rk-progress" className="h-full origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}
