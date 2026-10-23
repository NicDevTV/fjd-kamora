import { hashString, seededRandom } from "./random";
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
  foederation: "SICHERHEITSRAT · FÖDERATION · ",
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

// Every official gets a personal hand when they first sign: which script, how it leans, how wide
// and large it runs, the ink and the flourish under the name. It is derived from the user's id, so
// it is random per person, never changes and needs no storage. Each document then varies that
// hand a little, the way nobody signs twice exactly the same.
export const SIGNATURE_FONTS = [
  { key: "hand", family: "Signature", size: 31 },
  { key: "delafield", family: "SignatureDelafield", size: 34 },
  { key: "doulaise", family: "SignatureDoulaise", size: 32 },
  { key: "haviland", family: "SignatureHaviland", size: 31 },
] as const;

const INKS = ["#1d2b66", "#1a2754", "#232c5a", "#2a2f55", "#17306b"];

export type SignatureHand = {
  font: (typeof SIGNATURE_FONTS)[number];
  slant: number;
  stretch: number;
  scale: number;
  spacing: number;
  tilt: number;
  ink: string;
  flourish: 0 | 1 | 2 | 3;
  weight: number;
  seed: number;
};

export function signatureHand(key: string): SignatureHand {
  const seed = hashString(`hand:${key}`);
  const random = seededRandom(seed);
  return {
    font: SIGNATURE_FONTS[Math.floor(random() * SIGNATURE_FONTS.length)],
    slant: -16 + random() * 18,
    stretch: 0.88 + random() * 0.27,
    scale: 0.9 + random() * 0.22,
    spacing: -0.5 + random() * 1,
    tilt: -6 + random() * 5,
    ink: INKS[Math.floor(random() * INKS.length)],
    // Roughly one in five signs without a flourish at all.
    flourish: random() < 0.2 ? 0 : ((1 + Math.floor(random() * 3)) as 1 | 2 | 3),
    weight: 0.9 + random() * 0.8,
    seed,
  };
}

// The signature box is 240 x 54 pt; the flourish is drawn in the same space under the name.
export const SIGNATURE_BOX = { width: 240, height: 54 };

function flourishPath(hand: SignatureHand, random: () => number) {
  const j = (range: number) => (random() - 0.5) * range;
  // Below the name: the text baseline sits around y 44, the signature line just under the box.
  const y = 51 + j(2);
  switch (hand.flourish) {
    case 1:
      // One long swash under the name, rising a little towards the end.
      return `M ${22 + j(10)} ${y} C ${80 + j(20)} ${y - 4 + j(3)} ${150 + j(20)} ${y + 2 + j(3)} ${222 + j(8)} ${y - 6 + j(3)}`;
    case 2:
      // A sweep that ends in a small loop.
      return `M ${26 + j(10)} ${y} C ${90 + j(20)} ${y + 2} ${165 + j(15)} ${y + 1} ${208 + j(8)} ${y - 3} C ${228 + j(6)} ${y - 7} ${234} ${y - 17 + j(3)} ${224 + j(3)} ${y - 19 + j(2)} C ${214} ${y - 21} ${210 + j(4)} ${y - 8} ${230 + j(5)} ${y - 3}`;
    default:
      // A rising dash with a short tick below it.
      return `M ${44 + j(14)} ${y} Q ${120 + j(20)} ${y - 4} ${208 + j(10)} ${y - 9 + j(2)} M ${182 + j(10)} ${y + 1} L ${216 + j(8)} ${y - 2 + j(2)}`;
  }
}

// One document's version of the official's hand. The same seed always gives the same result,
// so the preview, the stored document and the PDF agree.
export function signatureStyle(name: string, seed: number, hand: SignatureHand) {
  const random = seededRandom(seed ^ 0x51a9);
  const wobble = (range: number) => (random() - 0.5) * range;
  const fit = Math.min(1, 20 / Math.max(name.length, 1));
  return {
    family: hand.font.family,
    key: hand.font.key,
    ink: hand.ink,
    size: hand.font.size * hand.scale * (1 + wobble(0.08)) * Math.max(fit, 0.62),
    letterSpacing: hand.spacing + wobble(0.5),
    shift: -12 + random() * 24,
    drop: 7 + random() * 5,
    rotate: hand.tilt + wobble(3.2),
    skew: hand.slant + wobble(4),
    stretch: hand.stretch * (1 + wobble(0.05)),
    flourish: hand.flourish ? flourishPath(hand, random) : null,
    weight: hand.weight * (1 + wobble(0.25)),
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
