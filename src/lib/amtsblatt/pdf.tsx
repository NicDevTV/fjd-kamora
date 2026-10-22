import "server-only";
import path from "node:path";
import {
  Circle,
  Defs,
  Document,
  Ellipse,
  Font,
  G,
  Line,
  Page,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { DocumentRecord } from "@/lib/server/db/types";
import { seededRandom } from "./random";
import { formatDate, type SealKind, type Template } from "./templates";

// The certificate as a PDF: aged paper, a printed frame, a fraktur title, a rubber-stamp seal
// and a handwritten signature. All randomness comes from the document's seed, so a document
// always reopens exactly as it was issued.

const FONTS = path.join(process.cwd(), "src", "assets", "fonts");
let fontsReady = false;

function registerFonts() {
  if (fontsReady) return;
  Font.register({
    family: "Garamond",
    fonts: [
      { src: path.join(FONTS, "EBGaramond.ttf") },
      { src: path.join(FONTS, "EBGaramond-Italic.ttf"), fontStyle: "italic" },
    ],
  });
  Font.register({ family: "Fraktur", src: path.join(FONTS, "UnifrakturMaguntia.ttf") });
  Font.register({ family: "FellSC", src: path.join(FONTS, "IMFellEnglishSC.ttf") });
  Font.register({ family: "Signature", src: path.join(FONTS, "HerrVonMuellerhoff.ttf") });
  // German words must not be split with English hyphenation rules.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const PAGE = { width: 595.28, height: 841.89 };
const INK = "#2b2116";
const SEPIA = "#6b5032";
const PAPER = "#efe3c6";

function Paper({ seed }: { seed: number }) {
  const random = seededRandom(seed ^ 0x51ed);
  const stains = Array.from({ length: 5 }, (_, index) => ({
    id: `stain${index}`,
    cx: random() * PAGE.width,
    cy: random() * PAGE.height,
    rx: 40 + random() * 120,
    ry: 30 + random() * 90,
    opacity: 0.05 + random() * 0.08,
  }));
  const fibers = Array.from({ length: 160 }, () => {
    const x = random() * PAGE.width;
    const y = random() * PAGE.height;
    const angle = random() * Math.PI;
    const length = 4 + random() * 14;
    return { x1: x, y1: y, x2: x + Math.cos(angle) * length, y2: y + Math.sin(angle) * length };
  });

  return (
    <Svg width={PAGE.width} height={PAGE.height}>
      <Defs>
        <RadialGradient id="vignette" cx="50%" cy="48%" r="75%">
          <Stop offset="55%" stopColor="#c9a76a" stopOpacity={0} />
          <Stop offset="100%" stopColor="#8a6233" stopOpacity={0.45} />
        </RadialGradient>
        {stains.map((stain) => (
          <RadialGradient key={stain.id} id={stain.id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#a0773f" stopOpacity={stain.opacity} />
            <Stop offset="70%" stopColor="#a0773f" stopOpacity={stain.opacity * 0.6} />
            <Stop offset="100%" stopColor="#a0773f" stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <Rect x={0} y={0} width={PAGE.width} height={PAGE.height} fill={PAPER} />
      {stains.map((stain) => (
        <Ellipse key={stain.id} cx={stain.cx} cy={stain.cy} rx={stain.rx} ry={stain.ry} fill={`url(#${stain.id})`} />
      ))}
      {fibers.map((fiber, index) => (
        <Line key={index} {...fiber} stroke="#7a5a30" strokeWidth={0.4} strokeOpacity={0.09} />
      ))}
      {/* Two folds, as if the certificate had been sent in an envelope. */}
      {[1 / 3, 2 / 3].map((share) => (
        <G key={share}>
          <Line x1={0} y1={PAGE.height * share} x2={PAGE.width} y2={PAGE.height * share} stroke="#ffffff" strokeWidth={1.4} strokeOpacity={0.35} />
          <Line x1={0} y1={PAGE.height * share + 1.2} x2={PAGE.width} y2={PAGE.height * share + 1.2} stroke="#5a4020" strokeWidth={0.6} strokeOpacity={0.12} />
        </G>
      ))}
      <Rect x={0} y={0} width={PAGE.width} height={PAGE.height} fill="url(#vignette)" />
    </Svg>
  );
}

function Frame() {
  const outer = 30;
  const inner = 37;
  const corner = (x: number, y: number, dx: number, dy: number) =>
    `M ${x + dx * 26} ${y} L ${x} ${y} L ${x} ${y + dy * 26} M ${x + dx * 6} ${y + dy * 6} L ${x + dx * 16} ${y + dy * 6} M ${x + dx * 6} ${y + dy * 6} L ${x + dx * 6} ${y + dy * 16}`;
  return (
    <Svg width={PAGE.width} height={PAGE.height}>
      <Rect x={outer} y={outer} width={PAGE.width - outer * 2} height={PAGE.height - outer * 2} fill="none" stroke={SEPIA} strokeWidth={1.4} />
      <Rect x={inner} y={inner} width={PAGE.width - inner * 2} height={PAGE.height - inner * 2} fill="none" stroke={SEPIA} strokeWidth={0.5} />
      {[
        corner(inner + 5, inner + 5, 1, 1),
        corner(PAGE.width - inner - 5, inner + 5, -1, 1),
        corner(inner + 5, PAGE.height - inner - 5, 1, -1),
        corner(PAGE.width - inner - 5, PAGE.height - inner - 5, -1, -1),
      ].map((d) => (
        <Path key={d} d={d} fill="none" stroke={SEPIA} strokeWidth={0.8} />
      ))}
    </Svg>
  );
}

function star(cx: number, cy: number, outer: number, inner: number, points: number) {
  const path: string[] = [];
  for (let index = 0; index < points * 2; index++) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI / points) * index - Math.PI / 2;
    path.push(`${index === 0 ? "M" : "L"} ${(cx + Math.cos(angle) * radius).toFixed(2)} ${(cy + Math.sin(angle) * radius).toFixed(2)}`);
  }
  return `${path.join(" ")} Z`;
}

const SEAL_TEXT: Record<SealKind, string> = {
  foederation: "FÖDERATIONSRAT · FÖDERATION · ",
  fjd: "FÖDERALES JUSTIZDEPARTEMENT · KAMORA · ",
};

const WAX = { light: "#c8404f", base: "#9a1e2e", deep: "#5c0c18", rim: "#4a0712", shine: "#ffd9dc" };
const RIBBON = { light: "#2f4a72", base: "#1d3152", deep: "#101d33" };

// Outline of poured wax: a circle whose radius wobbles a little, with a few drops that ran out
// before the stamp came down. Smoothed with quadratic curves through the midpoints.
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

// Two ribbon tails under the seal, each with a swallowtail notch.
function ribbon(c: number, angle: number, length: number, width: number) {
  const rad = (angle * Math.PI) / 180;
  const along = [Math.sin(rad), Math.cos(rad)];
  const across = [Math.cos(rad), -Math.sin(rad)];
  const p = (s: number, t: number) => `${(c + along[0] * s + across[0] * t).toFixed(2)} ${(c + along[1] * s + across[1] * t).toFixed(2)}`;
  return `M ${p(0, -width / 2)} L ${p(length, -width / 2)} L ${p(length - width * 0.55, 0)} L ${p(length, width / 2)} L ${p(0, width / 2)} Z`;
}

function Emblem({ kind, c, fill, dx = 0, dy = 0 }: { kind: SealKind; c: number; fill: string; dx?: number; dy?: number }) {
  return kind === "foederation" ? (
    <G transform={`translate(${dx}, ${dy})`}>
      <Path d={star(c, c, 19, 8, 8)} fill={fill} />
      <Circle cx={c} cy={c} r={4.6} fill="none" stroke={fill} strokeWidth={1.4} />
    </G>
  ) : (
    <G transform={`translate(${c - 15 + dx}, ${c - 18 + dy}) scale(0.32)`}>
      <Path d="M48 4L90 17V58C90 84 72 100 48 109C24 100 6 84 6 58V17Z" fill="none" stroke={fill} strokeWidth={7} />
      <Path d="M33 34H63V45H44V58H57V68H44V84H33Z" fill={fill} />
    </G>
  );
}

// A wax seal pressed onto two ribbons. Everything raised by the stamp (rim, letters, emblem) is
// drawn three times: a dark copy shifted down-right as shadow, a pale copy up-left as the light
// catching the edge, and the wax colour on top. That reads as relief even on flat paper.
function Seal({ kind, seed }: { kind: SealKind; seed: number }) {
  const random = seededRandom(seed ^ 0x5ea1);
  const size = 168;
  const c = size / 2;
  const letters = Array.from(SEAL_TEXT[kind]);
  const rotation = -18 + random() * 36;
  const outline = waxOutline(c, 50, random);
  const ribbonAngle = 18 + random() * 10;

  const ring = (dx: number, dy: number, color: string, opacity: number) => (
    <G transform={`translate(${dx}, ${dy})`}>
      <Circle cx={c} cy={c} r={39} fill="none" stroke={color} strokeWidth={1.6} strokeOpacity={opacity} />
      <Circle cx={c} cy={c} r={26} fill="none" stroke={color} strokeWidth={0.9} strokeOpacity={opacity} />
      {letters.map((letter, index) => (
        <G key={index} transform={`rotate(${((360 / letters.length) * index).toFixed(2)}, ${c}, ${c})`}>
          <Text x={c} y={c - 29} fill={color} fillOpacity={opacity} textAnchor="middle" style={{ fontFamily: "FellSC", fontSize: 7.4 }}>
            {letter}
          </Text>
        </G>
      ))}
    </G>
  );

  return (
    // Drawn on a 168 grid and scaled to the closing block.
    <Svg width={150} height={150} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="wax" cx="38%" cy="32%" r="72%">
          <Stop offset="0%" stopColor={WAX.light} />
          <Stop offset="55%" stopColor={WAX.base} />
          <Stop offset="100%" stopColor={WAX.deep} />
        </RadialGradient>
        <RadialGradient id="press" cx="56%" cy="60%" r="60%">
          <Stop offset="0%" stopColor={WAX.base} />
          <Stop offset="85%" stopColor={WAX.deep} />
          <Stop offset="100%" stopColor={WAX.rim} />
        </RadialGradient>
        <RadialGradient id="ribbon" cx="50%" cy="20%" r="90%">
          <Stop offset="0%" stopColor={RIBBON.light} />
          <Stop offset="70%" stopColor={RIBBON.base} />
          <Stop offset="100%" stopColor={RIBBON.deep} />
        </RadialGradient>
      </Defs>

      {/* Ribbons first, so the wax lies on top of them. */}
      <Path d={ribbon(c, ribbonAngle, 74, 17)} fill="url(#ribbon)" />
      <Path d={ribbon(c, -ribbonAngle - 4, 70, 17)} fill="url(#ribbon)" />
      <Path d={ribbon(c, ribbonAngle, 74, 17)} fill="none" stroke={RIBBON.light} strokeWidth={0.6} strokeOpacity={0.6} />
      <Path d={ribbon(c, -ribbonAngle - 4, 70, 17)} fill="none" stroke={RIBBON.light} strokeWidth={0.6} strokeOpacity={0.6} />

      <G transform={`rotate(${rotation.toFixed(1)}, ${c}, ${c})`}>
        {/* Cast shadow on the paper, then the poured wax. */}
        <Path d={outline} fill="#2a0a0e" fillOpacity={0.28} transform="translate(2.2, 3)" />
        <Path d={outline} fill="url(#wax)" />
        <Path d={outline} fill="none" stroke={WAX.shine} strokeWidth={0.8} strokeOpacity={0.35} transform="translate(-0.6, -0.8)" />

        {/* The pressed face: slightly sunk, with a dark inner rim. */}
        <Circle cx={c} cy={c} r={43.5} fill="url(#press)" />
        <Circle cx={c + 0.9} cy={c + 1.1} r={43.5} fill="none" stroke={WAX.rim} strokeWidth={1.6} strokeOpacity={0.8} />
        <Circle cx={c - 0.7} cy={c - 0.8} r={44.6} fill="none" stroke={WAX.shine} strokeWidth={0.9} strokeOpacity={0.4} />

        {ring(0.8, 0.9, WAX.rim, 0.85)}
        {ring(-0.55, -0.6, WAX.shine, 0.45)}
        {ring(0, 0, WAX.light, 1)}

        <Emblem kind={kind} c={c} fill={WAX.rim} dx={0.9} dy={1} />
        <Emblem kind={kind} c={c} fill={WAX.shine} dx={-0.6} dy={-0.7} />
        <Emblem kind={kind} c={c} fill={WAX.light} />
      </G>

      {/* Gloss on the curved wax, independent of the seal's rotation: light comes from top left. */}
      <Path d={`M ${c - 36} ${c - 14} Q ${c - 30} ${c - 36} ${c - 8} ${c - 41}`} fill="none" stroke={WAX.shine} strokeWidth={2.6} strokeOpacity={0.28} strokeLinecap="round" />
      <Circle cx={c - 27} cy={c - 30} r={2.4} fill={WAX.shine} fillOpacity={0.35} />
    </Svg>
  );
}

// The signature is set in a handwriting face. Angle, size, position and spacing vary a little
// with every document, the way the same person never signs twice exactly alike.
function Signature({ name, seed }: { name: string; seed: number }) {
  const random = seededRandom(seed ^ 0x51a9);
  const fit = Math.min(1, 20 / Math.max(name.length, 1));
  const size = (32 + random() * 5) * Math.max(fit, 0.62);
  return (
    <View style={{ width: 240, height: 54, justifyContent: "flex-end", alignItems: "center" }}>
      <Text
        style={{
          fontFamily: "Signature",
          fontSize: size,
          color: "#1d2b66",
          letterSpacing: -0.3 + random() * 0.6,
          marginLeft: -14 + random() * 28,
          marginBottom: -10 + random() * 4,
          transform: `rotate(${(-7 + random() * 5).toFixed(1)}deg)`,
        }}
      >
        {name}
      </Text>
    </View>
  );
}

const styles = {
  // The page itself has no padding: the full-page paper and frame must fit it exactly, or
  // react-pdf pushes them onto pages of their own. The text sits in a padded block instead.
  page: { fontFamily: "Garamond", color: INK, backgroundColor: PAPER },
  content: { position: "absolute" as const, top: 84, left: 76, right: 76 },
  layer: { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 },
  realm: { fontFamily: "FellSC", fontSize: 12, letterSpacing: 4, textAlign: "center" as const, color: SEPIA },
  body: { fontFamily: "Garamond", fontStyle: "italic" as const, fontSize: 13, textAlign: "center" as const, marginTop: 4, color: SEPIA },
  rule: { marginTop: 14, marginBottom: 6, alignSelf: "center" as const, width: 140, borderBottomWidth: 0.8, borderBottomColor: SEPIA },
  title: { fontFamily: "Fraktur", fontSize: 40, textAlign: "center" as const, marginTop: 18 },
  number: { fontSize: 9.5, textAlign: "center" as const, marginTop: 6, color: SEPIA, letterSpacing: 1 },
  text: { fontSize: 13.5, lineHeight: 1.55, textAlign: "center" as const, marginTop: 18 },
  name: { fontFamily: "Garamond", fontStyle: "italic" as const, fontSize: 26, textAlign: "center" as const, marginTop: 18 },
  office: { fontFamily: "FellSC", fontSize: 17, letterSpacing: 1.5, textAlign: "center" as const, marginTop: 16 },
};

function Certificate({ document, template }: { document: DocumentRecord; template: Template }) {
  const issued = formatDate(document.issuedAt.slice(0, 10));
  return (
    <Page size="A4" style={styles.page}>
      {/* Full-page layers behind the text; an absolute View keeps them out of the page flow. */}
      <View style={styles.layer} fixed>
        <Paper seed={document.signatureSeed} />
      </View>
      <View style={styles.layer} fixed>
        <Frame />
      </View>

      <View style={styles.content}>
      <Text style={styles.realm}>{template.issuer.realm.toUpperCase()}</Text>
      <Text style={styles.body}>{template.issuer.body}</Text>
      <View style={styles.rule} />
      <Text style={styles.title}>{template.title}</Text>
      <Text style={styles.number}>AMTSBLATT NR. {document.number}</Text>

      <View style={{ marginTop: 22 }}>
        {template.blocks(document.fields).map((block, index) => (
          <Text key={index} style={block.kind === "name" ? styles.name : block.kind === "office" ? styles.office : styles.text}>
            {block.text}
          </Text>
        ))}
      </View>
        {/* Closing block: the seal stands on its own on the left, nothing printed under it;
            place, date and signature on the right, as on a real certificate. It follows the text, so the page never gapes. */}
        <View style={{ marginTop: 64, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View style={{ width: 150, alignItems: "center" }}>
            <Seal kind={template.seal} seed={document.signatureSeed} />
          </View>
          <View style={{ width: 240, alignItems: "center" }}>
            <Text style={{ fontSize: 12.5, fontStyle: "italic" }}>Kamora, den {issued}</Text>
            <Signature name={document.signerName} seed={document.signatureSeed} />
            <View style={{ width: 210, borderTopWidth: 0.7, borderTopColor: INK, marginTop: 2 }} />
            <Text style={{ fontSize: 12, marginTop: 5 }}>{document.signerName}</Text>
            <Text style={{ fontSize: 10, fontStyle: "italic", color: SEPIA, marginTop: 1 }}>{document.signerTitle}</Text>
          </View>
        </View>
      </View>

      <Text style={{ position: "absolute", left: 76, right: 76, bottom: 50, fontSize: 8, textAlign: "center", color: SEPIA }}>
        Rechtsgrundlage: {template.legalBasis}. Veröffentlicht im Amtsblatt des Staates Kamora.
      </Text>
    </Page>
  );
}

export async function renderCertificate(document: DocumentRecord, template: Template) {
  registerFonts();
  return renderToBuffer(
    <Document title={`${template.title} ${document.number}`} author="Föderales Justizdepartement" creator="FJD Amtsblatt">
      <Certificate document={document} template={template} />
    </Document>,
  );
}
