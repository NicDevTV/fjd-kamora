import { seededRandom } from "./random";
import type { SealKind } from "./templates";

// Shapes shared by the PDF (pdf.tsx) and the live preview (certificate-preview.tsx). Both draw
// from the same document seed in the same order, so the preview is the certificate.

export const PAGE = { width: 595.28, height: 841.89 };

export const COLORS = {
  paper: "#efe3c6",
  ink: "#2b2116",
  sepia: "#6b5032",
  signature: "#1d2b66",
  wax: { light: "#c8404f", base: "#9a1e2e", deep: "#5c0c18", rim: "#4a0712", shine: "#ffd9dc" },
  ribbon: { light: "#2f4a72", base: "#1d3152", deep: "#101d33" },
};

export const SEAL_TEXT: Record<SealKind, string> = {
  foederation: "FÖDERATIONSRAT · FÖDERATION · ",
  fjd: "JUSTIZDEPARTEMENT · KAMORA · ",
};

export const SHIELD_PATH = "M48 4L90 17V58C90 84 72 100 48 109C24 100 6 84 6 58V17Z";
export const LETTER_PATH = "M33 34H63V45H44V58H57V68H44V84H33Z";

export function star(cx: number, cy: number, outer: number, inner: number, points: number) {
  const path: string[] = [];
  for (let index = 0; index < points * 2; index++) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI / points) * index - Math.PI / 2;
    path.push(`${index === 0 ? "M" : "L"} ${(cx + Math.cos(angle) * radius).toFixed(2)} ${(cy + Math.sin(angle) * radius).toFixed(2)}`);
  }
  return `${path.join(" ")} Z`;
}

// Poured wax: a circle whose radius wobbles a little, with a few drops that ran out before the
// stamp came down. Smoothed with quadratic curves through the midpoints.
function waxOutline(c: number, radius: number, random: () => number) {
  const steps = 36;
  const drops = Array.from({ length: 3 }, () => ({ at: random() * Math.PI * 2, size: 4 + random() * 7 }));
  const points = Array.from({ length: steps }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2;
    let r = radius + (random() - 0.5) * 3.2;
    for (const drop of drops) {
      const distance = Math.abs(Math.atan2(Math.sin(angle - drop.at), Math.cos(angle - drop.at)));
      if (distance < 0.28) r += drop.size * Math.cos((distance / 0.28) * (Math.PI / 2));
    }
    return [c + Math.cos(angle) * r, c + Math.sin(angle) * r] as const;
  });
  const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(points[steps - 1], points[0]);
  let d = `M ${start[0].toFixed(2)} ${start[1].toFixed(2)}`;
  points.forEach((point, index) => {
    const next = mid(point, points[(index + 1) % steps]);
    d += ` Q ${point[0].toFixed(2)} ${point[1].toFixed(2)} ${next[0].toFixed(2)} ${next[1].toFixed(2)}`;
  });
  return `${d} Z`;
}

// A ribbon tail with a swallowtail notch, hanging from the seal's centre at the given angle.
function ribbon(c: number, angle: number, length: number, width: number) {
  const rad = (angle * Math.PI) / 180;
  const along = [Math.sin(rad), Math.cos(rad)];
  const across = [Math.cos(rad), -Math.sin(rad)];
  const p = (s: number, t: number) =>
    `${(c + along[0] * s + across[0] * t).toFixed(2)} ${(c + along[1] * s + across[1] * t).toFixed(2)}`;
  return `M ${p(0, -width / 2)} L ${p(length, -width / 2)} L ${p(length - width * 0.55, 0)} L ${p(length, width / 2)} L ${p(0, width / 2)} Z`;
}

export const SEAL_SIZE = 168;

export function sealShape(kind: SealKind, seed: number) {
  const random = seededRandom(seed ^ 0x5ea1);
  const c = SEAL_SIZE / 2;
  const rotation = -18 + random() * 36;
  const outline = waxOutline(c, 50, random);
  const ribbonAngle = 18 + random() * 10;
  return {
    c,
    rotation,
    outline,
    ribbons: [ribbon(c, ribbonAngle, 74, 17), ribbon(c, -ribbonAngle - 4, 70, 17)],
    letters: Array.from(SEAL_TEXT[kind]),
    starPath: star(c, c, 19, 8, 8),
  };
}

// The handwritten signature varies a little per document: size, angle, spacing and position.
export function signatureStyle(name: string, seed: number) {
  const random = seededRandom(seed ^ 0x51a9);
  const fit = Math.min(1, 20 / Math.max(name.length, 1));
  return {
    size: (32 + random() * 5) * Math.max(fit, 0.62),
    letterSpacing: -0.3 + random() * 0.6,
    shift: -14 + random() * 28,
    drop: -10 + random() * 4,
    rotate: -7 + random() * 5,
  };
}

// Guilloche band: two interlaced waves running round the frame, the security print of
// banknotes and old certificates. Returns one closed path per strand.
export function guillocheStrands(inset: number, band: number) {
  const left = inset;
  const top = inset;
  const right = PAGE.width - inset;
  const bottom = PAGE.height - inset;
  const perimeter = 2 * (right - left + bottom - top);
  const waves = Math.round(perimeter / 9);

  // Walks the rectangle's centre line and returns the point and inward normal at distance s.
  function at(s: number): [number, number, number, number] {
    const w = right - left;
    const h = bottom - top;
    if (s < w) return [left + s, top, 0, 1];
    if (s < w + h) return [right, top + (s - w), -1, 0];
    if (s < 2 * w + h) return [right - (s - w - h), bottom, 0, -1];
    return [left, bottom - (s - 2 * w - h), 1, 0];
  }

  return [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((phase) => {
    const steps = waves * 8;
    const parts: string[] = [];
    for (let index = 0; index <= steps; index++) {
      const s = (index / steps) * perimeter;
      const [x, y, nx, ny] = at(s % perimeter);
      const offset = Math.sin((s / perimeter) * waves * Math.PI * 2 + phase) * (band / 2);
      parts.push(`${index === 0 ? "M" : "L"} ${(x + nx * offset).toFixed(2)} ${(y + ny * offset).toFixed(2)}`);
    }
    return parts.join(" ");
  });
}
