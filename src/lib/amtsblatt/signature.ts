import { hashString, seededRandom } from "./random";

// A handwritten-looking signature drawn as one SVG path. Its overall shape comes from the name,
// so the same official always signs recognisably alike; the document seed adds the small
// tremors and differences of a real hand, so no two signatures are identical.

const TALL = new Set("bdfhklt");
const DEEP = new Set("gjpqy");

type Point = [number, number];

export function signaturePath(name: string, documentSeed: number, width = 230, height = 80) {
  const shape = seededRandom(hashString(name.toLowerCase()));
  const hand = seededRandom(documentSeed);
  const jitter = (amount: number) => (hand() - 0.5) * 2 * amount;

  const baseline = height * 0.62;
  const slant = 0.28 + shape() * 0.12;
  // Leaning letters: the higher a point, the further right.
  const lean = ([x, y]: Point): Point => [x + (baseline - y) * slant, y];
  const fmt = ([x, y]: Point) => `${x.toFixed(1)} ${y.toFixed(1)}`;

  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 3);
  // The last name is written out more, first names shrink to a flourish of their initial.
  const letterBudget = Math.max(4, Math.min(9, words.at(-1)?.length ?? 5));

  let x = 6 + jitter(2);
  const parts: string[] = [];

  words.forEach((word, wordIndex) => {
    const last = wordIndex === words.length - 1;
    const capitalHeight = height * (0.5 + shape() * 0.18);
    const top = baseline - capitalHeight + jitter(3);

    // Capital: a tall loop that starts below the baseline and closes back into it.
    const start = lean([x, baseline + 4 + jitter(2)]);
    const peak = lean([x + 6 + jitter(2), top]);
    const back = lean([x - 4 + jitter(2), baseline - capitalHeight * 0.45]);
    const land = lean([x + 10 + jitter(2), baseline + jitter(1.5)]);
    parts.push(
      `M ${fmt(start)}`,
      `C ${fmt(lean([x - 6, baseline - capitalHeight * 0.3]))} ${fmt(lean([x - 2, top - 2]))} ${fmt(peak)}`,
      `C ${fmt(lean([x + 16, top + 4]))} ${fmt(lean([x + 12, baseline - capitalHeight * 0.55]))} ${fmt(back)}`,
      `C ${fmt(lean([x + 2, baseline - capitalHeight * 0.3]))} ${fmt(lean([x + 4, baseline + 2]))} ${fmt(land)}`,
    );
    x += 14 + jitter(1.5);

    const letters = last ? word.slice(1, letterBudget).toLowerCase() : word.slice(1, 2).toLowerCase();
    for (const letter of letters) {
      const tall = TALL.has(letter);
      const deep = DEEP.has(letter);
      const rise = (tall ? height * 0.42 : height * 0.17) * (0.8 + shape() * 0.4) + jitter(2.2);
      const step = (tall ? 8 : 9) + shape() * 3 + jitter(1.2);
      const crest = lean([x + step * 0.45, baseline - rise]);
      const end = lean([x + step, baseline + (deep ? height * 0.22 : 0) + jitter(1.2)]);
      parts.push(
        `C ${fmt(lean([x + step * 0.1, baseline - rise * 0.6]))} ${fmt(lean([x + step * 0.25, baseline - rise]))} ${fmt(crest)}`,
        `C ${fmt(lean([x + step * 0.7, baseline - rise]))} ${fmt(lean([x + step * 0.6, baseline]))} ${fmt(end)}`,
      );
      if (deep) {
        // Descender loop back up into the line.
        parts.push(
          `C ${fmt(lean([x + step * 0.6, baseline + height * 0.34]))} ${fmt(lean([x + step * 1.3, baseline + height * 0.2]))} ${fmt(lean([x + step * 1.15, baseline + jitter(1)]))}`,
        );
      }
      x += step;
    }
    x += last ? 0 : 10 + jitter(2);
  });

  // Closing flourish: one swing back under the name, the stroke a hurried hand ends with.
  const tailEnd: Point = [Math.max(12, x * 0.18) + jitter(6), baseline + height * 0.22 + jitter(3)];
  parts.push(
    `C ${fmt([x + 14 + jitter(3), baseline - 6 + jitter(3)])} ${fmt([x + 6, baseline + height * 0.3])} ${fmt([x * 0.6, baseline + height * 0.27 + jitter(2)])}`,
    `S ${fmt([x * 0.3, baseline + height * 0.18])} ${fmt(tailEnd)}`,
  );

  // Scale down when a long name would leave the box.
  const scale = Math.min(1, (width - 10) / Math.max(x + 20, 1));
  return { d: parts.join(" "), scale, width, height };
}
