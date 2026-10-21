"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Tip = { text: string; x: number; y: number; below: boolean };

const GAP = 8;
const EDGE = 8;

// One shared tooltip for every abbreviation (.fjd-abbr, see abbr.tsx). It lives at the top
// of <body> with position: fixed, so scrolling tables, clipped cards or 3D transforms can no
// longer cut it off, and it is shifted to stay fully inside the viewport.
export function AbbrTooltip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [visible, setVisible] = useState(false);
  const bubble = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let hideTimer = 0;
    let frame = 0;

    function place(target: HTMLElement) {
      const text = target.dataset.full;
      if (!text) return false;
      const rect = target.getBoundingClientRect();
      // Above by default, below when there is no room under the floating header.
      const below = rect.top < 96;
      setTip({ text, x: rect.left + rect.width / 2, y: below ? rect.bottom + GAP : rect.top - GAP, below });
      return true;
    }

    function show(target: HTMLElement) {
      window.clearTimeout(hideTimer);
      if (!place(target)) return;
      anchor.current = target;
      setVisible(true);
    }

    function hide() {
      anchor.current = null;
      setVisible(false);
    }

    const abbrOf = (event: Event) => (event.target as Element | null)?.closest?.<HTMLElement>(".fjd-abbr") ?? null;

    function onOver(event: PointerEvent) {
      if (event.pointerType === "touch") return;
      const target = abbrOf(event);
      if (target) show(target);
    }

    function onOut(event: PointerEvent) {
      const target = abbrOf(event);
      if (!target || target.contains(event.relatedTarget as Node | null)) return;
      hideTimer = window.setTimeout(hide, 60);
    }

    // On touch screens a tap shows the full form for a moment, unless the abbreviation is a link.
    function onClick(event: MouseEvent) {
      const target = abbrOf(event);
      if (!target || target.closest("a")) return;
      show(target);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hide, 2500);
    }

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("click", onClick);
    // Scrolling anywhere (page, table, the self-scrolling table of contents) moves the tooltip
    // along with its abbreviation instead of closing it.
    function follow() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = anchor.current;
        if (!target) return;
        if (target.isConnected) place(target);
        else hide();
      });
    }

    window.addEventListener("scroll", follow, { passive: true, capture: true });
    window.addEventListener("resize", follow);
    return () => {
      window.clearTimeout(hideTimer);
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", follow, { capture: true });
      window.removeEventListener("resize", follow);
    };
  }, []);

  // Clamp horizontally once the bubble's width is known, before the browser paints.
  useLayoutEffect(() => {
    const node = bubble.current;
    if (!node || !tip) return;
    const width = node.offsetWidth;
    const left = Math.min(Math.max(tip.x - width / 2, EDGE), window.innerWidth - width - EDGE);
    node.style.left = `${left}px`;
  }, [tip]);

  return (
    <div
      ref={bubble}
      aria-hidden="true"
      className="fjd-abbr-tip"
      data-visible={visible && tip !== null}
      data-below={tip?.below ?? false}
      style={{ top: tip?.y ?? 0, left: tip ? tip.x : 0 }}
    >
      {tip?.text}
    </div>
  );
}
