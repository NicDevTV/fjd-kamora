"use client";

import { useEffect } from "react";
import { flashTarget } from "@/lib/flash-target";

// Handles every jump target in the codex: on load with an anchor (e.g. coming from the home page)
// and on every in-page anchor click (table of contents, cross-references), even when it is the same
// anchor as before. Instead of the browser's jump to the top edge, the target is centered and
// highlighted. The search calls flashTarget directly.
export function TargetFlash() {
  useEffect(() => {
    // On load the page jumps instantly; a smooth scroll would be interrupted by loading.
    const initial = window.location.hash.slice(1);
    const timer = initial ? window.setTimeout(() => flashTarget(initial, { instant: true }), 400) : 0;

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      const id = link?.getAttribute("href")?.slice(1);
      if (!id || !document.getElementById(decodeURIComponent(id))) return;

      event.preventDefault();
      window.history.pushState(null, "", `#${id}`);
      flashTarget(id);
    }

    document.addEventListener("click", onClick);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}
