"use client";

import { useEffect } from "react";

// Every glass surface on the page reacts to the pointer: a light spot follows it (globals.css,
// class is-lit) and glass buttons lean slightly towards it. One listener for the whole page,
// evaluated at most once per frame.
// The 3D plates of the hierarchy are left out on purpose: their light spot cannot be placed correctly in 2D.
const GLASS = ".glass-panel, .glass-inset, .glass-dark, .glass-glow, .liquid, .liquid-solid";
const MAGNETIC = ".liquid, .liquid-solid";

// Measures the surface without its own movement. Otherwise magnet and tilt feed back:
// the element moves, the measurement changes, the element moves again.
function restingRect(glass: HTMLElement) {
  if (glass.matches(".tilt-card") && glass.parentElement) {
    return glass.parentElement.getBoundingClientRect();
  }
  const rect = glass.getBoundingClientRect();
  const translate = getComputedStyle(glass).translate;
  if (!translate || translate === "none") return rect;
  const [tx = 0, ty = 0] = translate.split(" ").map((value) => parseFloat(value) || 0);
  return new DOMRect(rect.left - tx, rect.top - ty, rect.width, rect.height);
}

export function GlassPointer() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const magnetic = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let x = -1;
    let y = -1;
    let lit = new Set<HTMLElement>();

    function release(element: HTMLElement) {
      element.classList.remove("is-lit");
      element.style.removeProperty("--tx");
      element.style.removeProperty("--ty");
    }

    function apply() {
      frame = 0;
      const hit = x < 0 ? null : document.elementFromPoint(x, y);

      // Every glass surface from the hit outwards, so nested glass lights up too.
      const chain = new Set<HTMLElement>();
      let element = hit?.closest<HTMLElement>(GLASS) ?? null;
      while (element) {
        chain.add(element);
        element = element.parentElement?.closest<HTMLElement>(GLASS) ?? null;
      }

      for (const glass of chain) {
        const rect = restingRect(glass);
        const localX = x - rect.left;
        const localY = y - rect.top;
        glass.style.setProperty("--gx", `${localX}px`);
        glass.style.setProperty("--gy", `${localY}px`);
        glass.classList.add("is-lit");

        // A barely noticeable pull, in the spirit of Apple's buttons: a few pixels at most.
        if (magnetic && glass.matches(MAGNETIC)) {
          const pullX = ((localX - rect.width / 2) / rect.width) * 3;
          const pullY = ((localY - rect.height / 2) / rect.height) * 2;
          glass.style.setProperty("--tx", `${pullX.toFixed(2)}px`);
          glass.style.setProperty("--ty", `${pullY.toFixed(2)}px`);
        }
      }

      for (const glass of lit) if (!chain.has(glass)) release(glass);
      lit = chain;
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(apply);
    }

    function onMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      x = event.clientX;
      y = event.clientY;
      schedule();
    }

    function onLeave() {
      x = -1;
      schedule();
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    // While scrolling, the surface under a resting pointer keeps changing.
    window.addEventListener("scroll", schedule, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", schedule);
      lit.forEach(release);
    };
  }, []);

  return null;
}
