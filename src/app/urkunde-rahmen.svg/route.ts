import { COLORS, PAGE, guillocheStrands } from "@/lib/amtsblatt/geometry";

// The certificate's printed frame (guilloche band between two rules) as one static SVG, so the
// HTML previews share a single cached file instead of inlining thousands of path points each.
// Contains nothing secret; prerendered at build time.
export function GET() {
  const outer = 28;
  const inner = 42;
  const strands = guillocheStrands(35, 9)
    .map((d) => `<path d="${d}" fill="none" stroke="${COLORS.sepia}" stroke-width="0.35" stroke-opacity="0.75"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE.width} ${PAGE.height}">
<rect x="${outer}" y="${outer}" width="${PAGE.width - outer * 2}" height="${PAGE.height - outer * 2}" fill="none" stroke="${COLORS.sepia}" stroke-width="1.1"/>
${strands}
<rect x="${inner}" y="${inner}" width="${PAGE.width - inner * 2}" height="${PAGE.height - inner * 2}" fill="none" stroke="${COLORS.sepia}" stroke-width="0.6"/>
</svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
