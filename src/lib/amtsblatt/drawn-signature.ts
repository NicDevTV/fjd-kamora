export type SignaturePoint = [number, number];
export type DrawnSignature = { version: 1; height: number; strokes: SignaturePoint[][] };

export const SIGNATURE_PAD = { width: 1000, height: 300, ink: "#1d2b66", weight: 4.2 };
export const SIGNATURE_LIMITS = { strokes: 64, points: 8000, bytes: 180000 };

// Accept only bounded numeric pen strokes, never SVG markup or user-supplied paths.
export function parseSignature(raw: unknown): DrawnSignature | null {
  try {
    if (typeof raw === "string" && raw.length > SIGNATURE_LIMITS.bytes) return null;
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!value || value.version !== 1 || !Array.isArray(value.strokes) || !value.strokes.length || value.strokes.length > SIGNATURE_LIMITS.strokes) return null;
    const height = value.height ?? SIGNATURE_PAD.height;
    if (typeof height !== "number" || !Number.isFinite(height) || height < 180 || height > 1000) return null;
    let count = 0;
    let length = 0;
    const strokes: SignaturePoint[][] = [];
    for (const stroke of value.strokes) {
      if (!Array.isArray(stroke) || stroke.length < 2) return null;
      count += stroke.length;
      if (count > SIGNATURE_LIMITS.points) return null;
      const clean: SignaturePoint[] = [];
      for (const point of stroke) {
        if (!Array.isArray(point) || point.length !== 2) return null;
        const [x, y] = point;
        if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > SIGNATURE_PAD.width || y < 0 || y > height) return null;
        const rounded: SignaturePoint = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
        const before = clean.at(-1);
        if (before) length += Math.hypot(rounded[0] - before[0], rounded[1] - before[1]);
        clean.push(rounded);
      }
      strokes.push(clean);
    }
    return length >= 35 ? { version: 1, height, strokes } : null;
  } catch {
    return null;
  }
}

// Midpoint curves smooth the sampled pen movement without changing the handwriting.
export function strokePath(points: SignaturePoint[]) {
  if (points.length < 2) return "";
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    path += ` Q ${current[0]} ${current[1]} ${(current[0] + next[0]) / 2} ${(current[1] + next[1]) / 2}`;
  }
  const end = points.at(-1)!;
  return `${path} L ${end[0]} ${end[1]}`;
}

export function signatureGeometry(signature: DrawnSignature, width = 240, height = 54) {
  const points = signature.strokes.flat();
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const left = Math.min(...xs) - 12;
  const top = Math.min(...ys) - 10;
  const boxWidth = Math.max(...xs) - left + 12;
  const boxHeight = Math.max(...ys) - top + 10;
  const scale = Math.min((width - 12) / boxWidth, (height - 6) / boxHeight);
  return {
    paths: signature.strokes.map(strokePath),
    transform: `translate(${(width - boxWidth * scale) / 2 - left * scale} ${(height - boxHeight * scale) / 2 - top * scale}) scale(${scale})`,
  };
}
