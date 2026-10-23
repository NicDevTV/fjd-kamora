"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Instant feedback for page changes. The codex is large and takes a moment to build on phones;
// during that time React is busy, so the feedback is switched on directly in the DOM at the tap
// and animated by CSS on the compositor. It ends as soon as the new path is rendered.
export function NavProgress() {
  const pathname = usePathname();
  const shown = useRef(pathname);

  useEffect(() => {
    shown.current = pathname;
    const root = document.documentElement;
    root.removeAttribute("data-navigating");
    document.querySelectorAll("a[data-pending]").forEach((link) => link.removeAttribute("data-pending"));
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    let timer: number | undefined;

    function start(link?: HTMLAnchorElement) {
      root.setAttribute("data-navigating", "");
      link?.setAttribute("data-pending", "");
      // Never leave the bar hanging if a navigation is cancelled.
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        root.removeAttribute("data-navigating");
        link?.removeAttribute("data-pending");
      }, 10000);
    }

    // Capture phase: Next's Link cancels the native click before it bubbles, so listen first.
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      start(link);
    }

    // Back and forward: only when the page itself changes, not for a jump to an anchor.
    function onPopState() {
      if (location.pathname !== shown.current) start();
    }

    window.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return <div aria-hidden="true" className="nav-progress" />;
}
