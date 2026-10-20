"use client";

import { useEffect } from "react";

// Marks every element with data-reveal or data-draw once it scrolls into view.
// The initial states live in globals.css under .js-reveal; without JavaScript everything stays visible.
export function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js-reveal");

    const targets = document.querySelectorAll<HTMLElement>("[data-reveal], [data-draw]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
    );

    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);

  return null;
}
