"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { withAbbreviations } from "@/components/abbr";

type Level = {
  id: string;
  title: string;
  body: string;
  href: string;
};

type PlateProps = {
  level: Level;
  index: number;
  count: number;
  spread: MotionValue<number>;
  highlighted: boolean;
};

// One glass plate in the stack. The top level sits highest; scrolling fans the stack out.
function Plate({ level, index, count, spread, highlighted }: PlateProps) {
  // Fan out around the stage centre, so the top plate stays below the heading.
  const z = useTransform(spread, (value) => ((count - 1) / 2 - index) * value);
  const top = index === 0;

  return (
    <motion.div style={{ z }} className="absolute inset-0 [transform-style:preserve-3d]">
      <div
        className={`plate absolute inset-0 flex flex-col justify-end rounded-[1.75rem] p-6 transition-[border-color,box-shadow] duration-300 ${
          top ? "plate-top text-white" : "text-ink"
        } ${highlighted ? "plate-highlighted" : ""}`}
      >
        <span className="font-serif text-sm opacity-70 tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        {/* On phones the tilted labels overlap; the numbered list next to the stack names every level. */}
        <p className="mt-1 font-serif text-2xl font-medium leading-tight max-sm:hidden">{level.title}</p>
      </div>
    </motion.div>
  );
}

export function Rangfolge({ levels }: { levels: Level[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const [hovered, setHovered] = useState<number | null>(null);

  const { scrollYProgress } = useScroll({ target: stage, offset: ["start end", "end start"] });
  const spread = useTransform(scrollYProgress, [0.12, 0.5], reduced ? [76, 76] : [10, 84]);
  const turn = useTransform(scrollYProgress, [0, 1], reduced ? [-30, -30] : [-44, -18]);
  const tilt = useTransform(scrollYProgress, [0, 1], reduced ? [56, 56] : [62, 50]);

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
      <div
        ref={stage}
        aria-hidden="true"
        className="relative h-[24rem] [perspective:1600px] sm:h-[30rem]"
      >
        <motion.div
          style={{ rotateX: tilt, rotateZ: turn }}
          className="absolute left-1/2 top-1/2 -ml-[8rem] -mt-[8rem] size-[16rem] [transform-style:preserve-3d] sm:-ml-[9.5rem] sm:-mt-[9.5rem] sm:size-[19rem]"
        >
          {levels.map((level, index) => (
            <Plate
              key={level.id}
              level={level}
              index={index}
              count={levels.length}
              spread={spread}
              highlighted={hovered === index}
            />
          ))}
        </motion.div>
      </div>

      <ol className="space-y-2">
        {levels.map((level, index) => (
          <li key={level.id}>
            <Link
              href={level.href}
              transitionTypes={["nav-forward"]}
              onPointerEnter={() => setHovered(index)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              className="group grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 rounded-[1.5rem] p-5 transition-colors hover:bg-white/70 focus-visible:bg-white/70"
            >
              <span className="font-serif text-xl text-accent/70 tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="block font-serif text-2xl font-medium leading-tight">
                  {withAbbreviations(level.title)}
                </span>
                <span className="mt-1.5 block text-[0.9375rem] leading-relaxed text-ink/70">
                  {withAbbreviations(level.body)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
