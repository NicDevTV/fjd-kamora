"use client";

import Link from "next/link";
import { useRef, type PointerEvent } from "react";
import { motion } from "motion/react";
import { withAbbreviations } from "@/components/abbr";

type Amt = {
  id: string;
  name: string;
  summary: string;
  norm: string;
  href: string;
};

// Glass card that tilts towards the pointer. The light spot comes from glass-pointer.tsx, as for all glass.
function TiltCard({ amt, index }: { amt: Amt; index: number }) {
  const ref = useRef<HTMLAnchorElement>(null);

  function onMove(event: PointerEvent<HTMLAnchorElement>) {
    const card = ref.current;
    if (!card || event.pointerType !== "mouse") return;
    // Measure the untilted list item, otherwise the tilt changes its own measurement.
    const rect = (card.parentElement ?? card).getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.style.setProperty("--rx", `${(0.5 - y) * 9}deg`);
    card.style.setProperty("--ry", `${(x - 0.5) * 11}deg`);
  }

  function onLeave() {
    const card = ref.current;
    if (!card) return;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  }

  return (
    <motion.li
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.8, delay: index * 0.12, ease: [0.2, 0.7, 0.2, 1] }}
      className="[perspective:1200px]"
    >
      <Link
        ref={ref}
        href={amt.href}
        transitionTypes={["nav-forward"]}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="tilt-card glass-panel group flex h-full flex-col p-7"
      >
        <h3 className="font-serif text-2xl font-medium leading-tight">{withAbbreviations(amt.name)}</h3>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink/75">{withAbbreviations(amt.summary)}</p>
        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          <span className="text-xs text-muted">{withAbbreviations(amt.norm)}</span>
          <span className="text-sm font-medium text-accent underline-offset-4 group-hover:underline">
            Im Kodex
          </span>
        </div>
      </Link>
    </motion.li>
  );
}

export function AemterCards({ aemter }: { aemter: Amt[] }) {
  return (
    <ul className="grid gap-5 md:grid-cols-3">
      {aemter.map((amt, index) => (
        <TiltCard key={amt.id} amt={amt} index={index} />
      ))}
    </ul>
  );
}
