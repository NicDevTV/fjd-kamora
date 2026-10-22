import { useId } from "react";
import { COLORS, LETTER_PATH, SEAL_SIZE, SHIELD_PATH, sealShape } from "@/lib/amtsblatt/geometry";
import type { SealKind } from "@/lib/amtsblatt/templates";

// The wax seal of the certificate for the browser, drawn from the same seed and geometry as
// the PDF (pdf.tsx), so preview and document match. Gradient ids are unique per instance,
// because several seals can share one page (gallery thumbnails).
export function WaxSeal({ kind, seed, className }: { kind: SealKind; seed: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const shape = sealShape(kind, seed);
  const { c, letters } = shape;
  const { wax, ribbon } = COLORS;

  const ring = (dx: number, dy: number, color: string, opacity: number) => (
    <g transform={`translate(${dx} ${dy})`} opacity={opacity}>
      <circle cx={c} cy={c} r={39} fill="none" stroke={color} strokeWidth={1.6} />
      <circle cx={c} cy={c} r={26} fill="none" stroke={color} strokeWidth={0.9} />
      {letters.map((letter, index) => (
        <text
          key={index}
          x={c}
          y={c - 29}
          fill={color}
          textAnchor="middle"
          transform={`rotate(${((360 / letters.length) * index).toFixed(2)} ${c} ${c})`}
          style={{ fontFamily: "var(--font-cert-fell)", fontSize: 7.4 }}
        >
          {letter}
        </text>
      ))}
    </g>
  );

  const emblem = (fill: string, dx = 0, dy = 0) =>
    kind === "foederation" ? (
      <g transform={`translate(${dx} ${dy})`}>
        <path d={shape.starPath} fill={fill} />
        <circle cx={c} cy={c} r={4.6} fill="none" stroke={fill} strokeWidth={1.4} />
      </g>
    ) : (
      <g transform={`translate(${c - 15 + dx} ${c - 18 + dy}) scale(0.32)`}>
        <path d={SHIELD_PATH} fill="none" stroke={fill} strokeWidth={7} />
        <path d={LETTER_PATH} fill={fill} />
      </g>
    );

  return (
    <svg viewBox={`0 0 ${SEAL_SIZE} ${SEAL_SIZE}`} aria-hidden="true" className={className}>
      <defs>
        <radialGradient id={`${id}wax`} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor={wax.light} />
          <stop offset="55%" stopColor={wax.base} />
          <stop offset="100%" stopColor={wax.deep} />
        </radialGradient>
        <radialGradient id={`${id}press`} cx="56%" cy="60%" r="60%">
          <stop offset="0%" stopColor={wax.base} />
          <stop offset="85%" stopColor={wax.deep} />
          <stop offset="100%" stopColor={wax.rim} />
        </radialGradient>
        <radialGradient id={`${id}ribbon`} cx="50%" cy="20%" r="90%">
          <stop offset="0%" stopColor={ribbon.light} />
          <stop offset="70%" stopColor={ribbon.base} />
          <stop offset="100%" stopColor={ribbon.deep} />
        </radialGradient>
      </defs>
      {shape.ribbons.map((d) => (
        <g key={d}>
          <path d={d} fill={`url(#${id}ribbon)`} />
          <path d={d} fill="none" stroke={ribbon.light} strokeWidth={0.6} strokeOpacity={0.6} />
        </g>
      ))}
      <g transform={`rotate(${shape.rotation.toFixed(1)} ${c} ${c})`}>
        <path d={shape.outline} fill="#2a0a0e" fillOpacity={0.28} transform="translate(2.2 3)" />
        <path d={shape.outline} fill={`url(#${id}wax)`} />
        <path d={shape.outline} fill="none" stroke={wax.shine} strokeWidth={0.8} strokeOpacity={0.35} transform="translate(-0.6 -0.8)" />
        <circle cx={c} cy={c} r={43.5} fill={`url(#${id}press)`} />
        <circle cx={c + 0.9} cy={c + 1.1} r={43.5} fill="none" stroke={wax.rim} strokeWidth={1.6} strokeOpacity={0.8} />
        <circle cx={c - 0.7} cy={c - 0.8} r={44.6} fill="none" stroke={wax.shine} strokeWidth={0.9} strokeOpacity={0.4} />
        {ring(0.8, 0.9, wax.rim, 0.85)}
        {ring(-0.55, -0.6, wax.shine, 0.45)}
        {ring(0, 0, wax.light, 1)}
        {emblem(wax.rim, 0.9, 1)}
        {emblem(wax.shine, -0.6, -0.7)}
        {emblem(wax.light)}
      </g>
      <path
        d={`M ${c - 36} ${c - 14} Q ${c - 30} ${c - 36} ${c - 8} ${c - 41}`}
        fill="none"
        stroke={wax.shine}
        strokeWidth={2.6}
        strokeOpacity={0.28}
        strokeLinecap="round"
      />
      <circle cx={c - 27} cy={c - 30} r={2.4} fill={wax.shine} fillOpacity={0.35} />
    </svg>
  );
}
