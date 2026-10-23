import { hashString, seededRandom } from "./random";
import { SIGNATURE_ADVANCES } from "./signature-metrics";
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
  { key: "hand", family: "Signature", size: 31, base: 0.286 },
  { key: "delafield", family: "SignatureDelafield", size: 34, base: 0.356 },
  { key: "doulaise", family: "SignatureDoulaise", size: 32, base: 0.233 },
  { key: "haviland", family: "SignatureHaviland", size: 31, base: 0.283 },
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

type Point = [number, number];
type Segment = [string, ...Point[]];

function drawPath(segments: Segment[], pivot: Point, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const turn = ([x, y]: Point) => {
    const dx = x - pivot[0];
    const dy = y - pivot[1];
    return `${(pivot[0] + dx * cos - dy * sin).toFixed(2)} ${(pivot[1] + dx * sin + dy * cos).toFixed(2)}`;
  };
  return segments.map(([command, ...points]) => `${command} ${points.map(turn).join(" ")}`).join(" ");
}

// The flourish hugs the written name: it spans the name's width and runs just under its baseline,
// turned a little with the writing.
function flourishPath(hand: SignatureHand, random: () => number, x0: number, x1: number, y: number, degrees: number) {
  const j = (range: number) => (random() - 0.5) * range;
  const w = x1 - x0;
  const at = (u: number, v: number): Point => [x0 + u * w, y + v];
  const pivot: Point = [(x0 + x1) / 2, y];
  switch (hand.flourish) {
    case 1:
      // One long swash under the name, rising a little towards the end.
      return drawPath(
        [["M", at(0, j(2))], ["C", at(0.3, -3 + j(3)), at(0.65, 2 + j(3)), at(1, -5 + j(3))]],
        pivot,
        degrees,
      );
    case 2: {
      // A sweep that ends in a small loop at the right.
      const end: Point = [x1 + 2, y + 1 + j(1.5)];
      return drawPath(
        [
          ["M", at(0, j(2))],
          ["C", at(0.35, 2 + j(2)), at(0.7, 1 + j(2)), [end[0] - 12, end[1]]],
          ["C", [end[0] - 5, end[1] - 1], [end[0] + 3, end[1] - 5], [end[0] - 1, end[1] - 8]],
          ["C", [end[0] - 6, end[1] - 10], [end[0] - 9, end[1] - 3], [end[0] + 4, end[1] + 1]],
        ],
        pivot,
        degrees,
      );
    }
    default:
      // A rising dash with a short tick below it.
      return drawPath(
        [
          ["M", at(0.05, 1)],
          ["Q", at(0.5, -4 + j(2)), at(0.95, -8 + j(2))],
          ["M", at(0.6, 2)],
          ["L", at(0.92, -1 + j(2))],
        ],
        pivot,
        degrees,
      );
  }
}

// Width of a name in points, without kerning.
function nameWidth(name: string, font: SignatureHand["font"], size: number, stretch: number, spacing: number) {
  const table = SIGNATURE_ADVANCES[font.key];
  let em = 0;
  for (const char of name) em += table.widths[char] ?? table.fallback;
  return em * size * stretch + spacing * name.length;
}

// One document's version of the official's hand. The same seed always gives the same result,
// so the preview, the stored document and the PDF agree. The name always fits the box.
export function signatureStyle(name: string, seed: number, hand: SignatureHand) {
  const random = seededRandom(seed ^ 0x51a9);
  const wobble = (range: number) => (random() - 0.5) * range;
  const stretch = hand.stretch * (1 + wobble(0.05));
  const spacing = hand.spacing + wobble(0.5);
  const wanted = hand.font.size * hand.scale * (1 + wobble(0.08));

  // Largest size that keeps the name inside the box with room for the flourish.
  const maxWidth = SIGNATURE_BOX.width - 36;
  const unit = nameWidth(name, hand.font, 1, stretch, 0);
  const size = Math.max(16, Math.min(wanted, (maxWidth - spacing * name.length) / Math.max(unit, 1)));
  const width = nameWidth(name, hand.font, size, stretch, spacing);

  const room = Math.max(0, (SIGNATURE_BOX.width - 16 - width) / 2);
  const shift = (random() * 2 - 1) * Math.min(10, room);
  const drop = 6 + random() * 5;
  const rotate = hand.tilt + wobble(3.2);

  const centre = SIGNATURE_BOX.width / 2 + shift;
  const baseline = SIGNATURE_BOX.height - drop - hand.font.base * size;
  const flourishY = Math.min(SIGNATURE_BOX.height - 2, baseline + 0.12 * size + 2);
  const x0 = Math.max(6, centre - width / 2 - 2);
  const x1 = Math.min(SIGNATURE_BOX.width - 10, centre + width / 2 + 4);

  return {
    family: hand.font.family,
    key: hand.font.key,
    ink: hand.ink,
    size,
    letterSpacing: spacing,
    shift,
    drop,
    rotate,
    skew: hand.slant + wobble(4),
    stretch,
    flourish: hand.flourish ? flourishPath(hand, random, x0, x1, flourishY, rotate * 0.8) : null,
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
