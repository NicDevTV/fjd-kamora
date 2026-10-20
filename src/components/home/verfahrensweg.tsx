"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { withAbbreviations } from "@/components/abbr";

type Step = {
  id: string;
  instance: string;
  range: string;
  title: string;
  body: string;
  href: string;
};

// Distance from card to card in the track; must match h-[17rem] plus gap-8 (2rem).
const STEP_PX = 304;

function StepCard({ step, index, active }: { step: Step; index: number; active?: boolean }) {
  return (
    <article
      className={`glass-panel flex flex-col p-7 transition-[opacity,transform,filter] duration-500 ${
        active === undefined
          ? ""
          : active
            ? "h-[17rem] opacity-100"
            : "h-[17rem] scale-[0.94] opacity-40 blur-[1.5px]"
      }`}
      aria-current={active ? "step" : undefined}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-serif text-4xl font-medium leading-none text-accent/70 tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="glass-inset rounded-full px-3 py-1 text-xs font-medium text-ink/80">
          {withAbbreviations(step.range)}
        </span>
      </div>
      <p className="mt-4 text-sm text-muted">{withAbbreviations(step.instance)}</p>
      <h3 className="mt-0.5 font-serif text-2xl font-medium leading-tight">{step.title}</h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/80">{withAbbreviations(step.body)}</p>
      <Link
        href={step.href}
        transitionTypes={["nav-forward"]}
        className="mt-auto self-start pt-3 text-sm font-medium text-accent underline-offset-4 hover:underline"
      >
        Im Kodex nachlesen
      </Link>
    </article>
  );
}

function Intro() {
  return (
    <>
      <h2 className="font-serif text-[clamp(2.25rem,4.5vw,3.5rem)] font-medium leading-[1.05] tracking-tight">
        Vom Ticket bis zum Obersten Gerichtshof.
      </h2>
      <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-ink/75">
        Wie schwer eine Tat wiegt, entscheidet, wer zuständig ist. Gemessen wird in
        Hafteinheiten; eine HE ist eine Minute.
      </p>
    </>
  );
}

export function Verfahrensweg({ steps }: { steps: Step[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({ target: stage, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setActive(Math.min(steps.length - 1, Math.max(0, Math.floor(value * steps.length))));
  });

  const half = 0.5 / steps.length;
  const trackY = useTransform(smooth, [half, 1 - half], [0, -(steps.length - 1) * STEP_PX]);
  const railFill = useTransform(smooth, [0, 1], ["0%", "100%"]);

  return (
    <section id="verfahrensweg" aria-labelledby="verfahrensweg-titel" className="scroll-mt-20">
      {/* Phone and tablet: a plain list, each card slides in as it enters. */}
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8 lg:hidden">
        <div id="verfahrensweg-titel">
          <Intro />
        </div>
        <ol className="mt-12 space-y-5">
          {steps.map((step, index) => (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-8%" }}
              transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <StepCard step={step} index={index} />
            </motion.li>
          ))}
        </ol>
      </div>

      {/* Desktop: the stage stays pinned while the instances scroll through. */}
      <div
        ref={stage}
        className="relative hidden lg:block"
        style={{ height: `${steps.length * 90 + 30}svh` }}
      >
        <div className="sticky top-0 flex h-[100svh] items-center">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-center gap-16 px-8">
            <div>
              <Intro />
              <ol className="relative mt-12 space-y-1 pl-8">
                <span aria-hidden="true" className="absolute bottom-3 left-[0.4375rem] top-3 w-px bg-ink/15" />
                <motion.span
                  aria-hidden="true"
                  style={{ height: railFill }}
                  className="absolute left-[0.4375rem] top-3 w-px origin-top bg-accent"
                />
                {steps.map((step, index) => (
                  <li key={step.id} className="relative py-2.5">
                    <span
                      aria-hidden="true"
                      className={`absolute -left-8 top-1/2 size-[0.9375rem] -translate-y-1/2 rounded-full border-2 transition-colors duration-300 ${
                        index <= active ? "border-accent bg-accent" : "border-ink/25 bg-paper"
                      }`}
                    />
                    <span
                      className={`flex items-baseline justify-between gap-6 transition-colors duration-300 ${
                        index === active ? "text-ink" : "text-ink/45"
                      }`}
                    >
                      <span className="font-serif text-xl font-medium">{withAbbreviations(step.instance)}</span>
                      <span className="text-sm tabular-nums">{withAbbreviations(step.range)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="relative h-[min(30rem,70svh)] overflow-hidden [mask-image:linear-gradient(transparent,black_16%,black_84%,transparent)]">
              <motion.ol
                style={{ y: trackY }}
                className="flex flex-col gap-8 pt-[calc((min(30rem,70svh)-17rem)/2)]"
              >
                {steps.map((step, index) => (
                  <li key={step.id}>
                    <StepCard step={step} index={index} active={index === active} />
                  </li>
                ))}
              </motion.ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
