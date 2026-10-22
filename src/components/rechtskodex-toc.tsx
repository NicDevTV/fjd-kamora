"use client";

import { useEffect, useRef, useState } from "react";

export type TocItem = {
  href: string;
  label: string;
  level: number;
};

// Headings above this line count as already read. It sits slightly below the middle of the
// screen, where jump targets are centered and where the eye rests while reading.
const READING_LINE = 0.55;

// Marks the passage currently being read: the last heading that has crossed the reading line.
// Measuring positions on scroll is more reliable here than an IntersectionObserver, which keeps
// stale entries when a long card scrolls past without its heading being in view.
export function RechtskodexToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const ids = items.map((item) => item.href.slice(1));
    let frame = 0;

    function update() {
      frame = 0;
      const line = window.innerHeight * READING_LINE;
      let current: string | null = null;
      for (const id of ids) {
        const target = document.getElementById(id);
        if (!target) continue;
        if (target.getBoundingClientRect().top <= line) current = id;
        else break;
      }
      setActiveId(current);
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [items]);

  // Keep the active entry visible inside the scrollable list, without scrolling the page itself.
  useEffect(() => {
    const list = listRef.current;
    const scroller = list?.closest<HTMLElement>(".rk-scroll");
    const link = list?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!scroller || !link || scroller.clientHeight === 0) return;

    const top = link.offsetTop - list!.offsetTop;
    const bottom = top + link.offsetHeight;
    if (top < scroller.scrollTop + 24) {
      scroller.scrollTo({ top: Math.max(0, top - 24), behavior: "smooth" });
    } else if (bottom > scroller.scrollTop + scroller.clientHeight - 24) {
      scroller.scrollTo({ top: bottom - scroller.clientHeight + 24, behavior: "smooth" });
    }
  }, [activeId]);

  return (
    <nav aria-label="Inhaltsverzeichnis" className="text-sm">
      <ul ref={listRef} className="relative space-y-0.5">
        {items.map((item) => {
          const isActive = item.href.slice(1) === activeId;
          return (
            <li key={item.href}>
              <a
                href={item.href}
                aria-current={isActive ? "location" : undefined}
                onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}
                className={`relative block border-l py-2.5 pr-2 transition-colors lg:py-1 ${
                  item.level === 2 ? "mt-4 pl-4 font-medium first:mt-0" : item.level === 3 ? "pl-4 text-[0.8125rem]" : "pl-8 text-xs"
                } ${
                  isActive
                    ? "border-accent text-ink"
                    : "border-rule text-muted hover:border-ink hover:text-ink"
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
