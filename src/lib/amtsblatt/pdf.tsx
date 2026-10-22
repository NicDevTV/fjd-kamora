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
import { signaturePath } from "./signature";
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
  // German words must not be split with English hyphenation rules.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const PAGE = { width: 595.28, height: 841.89 };
const INK = "#2b2116";
const SEPIA = "#6b5032";
const STAMP = "#9b1d30";
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

// Rubber stamp: two rings, the issuer around the edge, an emblem in the middle. Paper-coloured
// specks knock holes into the ink the way an unevenly inked stamp does.
function Seal({ kind, seed }: { kind: SealKind; seed: number }) {
  const random = seededRandom(seed ^ 0x5ea1);
  const size = 128;
  const c = size / 2;
  const text = SEAL_TEXT[kind];
  const letters = Array.from(text);
  const rotation = -14 + random() * 28;
  const specks = Array.from({ length: 90 }, () => {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * (c - 2);
    return { cx: c + Math.cos(angle) * distance, cy: c + Math.sin(angle) * distance, r: 0.4 + random() * 1.6 };
  });

  return (
    <Svg width={size} height={size}>
      <G transform={`rotate(${rotation.toFixed(1)}, ${c}, ${c})`}>
        <Circle cx={c} cy={c} r={c - 3} fill="none" stroke={STAMP} strokeWidth={2.6} />
        <Circle cx={c} cy={c} r={c - 8} fill="none" stroke={STAMP} strokeWidth={0.8} />
        <Circle cx={c} cy={c} r={c - 24} fill="none" stroke={STAMP} strokeWidth={1} />
        {letters.map((letter, index) => (
          <G key={index} transform={`rotate(${((360 / letters.length) * index).toFixed(2)}, ${c}, ${c})`}>
            <Text x={c} y={19} fill={STAMP} textAnchor="middle" style={{ fontFamily: "FellSC", fontSize: 9.5 }}>
              {letter}
            </Text>
          </G>
        ))}
        {kind === "foederation" ? (
          <G>
            <Path d={star(c, c, 24, 10, 8)} fill={STAMP} />
            <Circle cx={c} cy={c} r={6} fill={PAPER} />
            <Circle cx={c} cy={c} r={3.4} fill={STAMP} />
          </G>
        ) : (
          <G transform={`translate(${c - 17}, ${c - 20}) scale(0.36)`}>
            <Path d="M48 4L90 17V58C90 84 72 100 48 109C24 100 6 84 6 58V17Z" fill="none" stroke={STAMP} strokeWidth={6} />
            <Path d="M33 34H63V45H44V58H57V68H44V84H33Z" fill={STAMP} />
          </G>
        )}
        {specks.map((speck, index) => (
          <Circle key={index} cx={speck.cx} cy={speck.cy} r={speck.r} fill={PAPER} fillOpacity={0.75} />
        ))}
      </G>
    </Svg>
  );
}

function Signature({ name, seed }: { name: string; seed: number }) {
  const { d, scale, width, height } = signaturePath(name, seed);
  return (
    <Svg width={width} height={height}>
      <G transform={`scale(${scale.toFixed(3)})`}>
        {/* A second, thinner pass a hair off the first imitates uneven pen pressure. */}
        <Path d={d} fill="none" stroke="#1d2b66" strokeWidth={1.35} strokeOpacity={0.88} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={d} fill="none" stroke="#1d2b66" strokeWidth={0.5} strokeOpacity={0.35} transform="translate(0.6, 0.4)" />
      </G>
    </Svg>
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
      {/* Faint watermark of the issuing body's emblem, the way official paper carries one. */}
      <View style={[styles.layer, { alignItems: "center", justifyContent: "center" }]} fixed>
        <Svg width={300} height={300}>
          {template.seal === "foederation" ? (
            <Path d={star(150, 150, 140, 58, 8)} fill={SEPIA} fillOpacity={0.06} />
          ) : (
            <G transform="translate(42, 24) scale(2.25)">
              <Path d="M48 4L90 17V58C90 84 72 100 48 109C24 100 6 84 6 58V17Z" fill={SEPIA} fillOpacity={0.06} />
            </G>
          )}
        </Svg>
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
      </View>

      {/* Place and date on the left, signature on the right, the seal pressed half over both. */}
      <View style={{ position: "absolute", left: 76, right: 76, bottom: 92, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View style={{ width: 150 }}>
          <Text style={{ fontSize: 12.5, fontStyle: "italic" }}>Kamora,</Text>
          <Text style={{ fontSize: 12.5, fontStyle: "italic" }}>den {issued}</Text>
        </View>
        <View style={{ width: 230, alignItems: "center" }}>
          <Signature name={document.signerName} seed={document.signatureSeed} />
          <View style={{ width: 210, borderTopWidth: 0.7, borderTopColor: INK, marginTop: -6 }} />
          <Text style={{ fontSize: 12, marginTop: 4 }}>{document.signerName}</Text>
          <Text style={{ fontSize: 10, fontStyle: "italic", color: SEPIA, marginTop: 1 }}>{document.signerTitle}</Text>
        </View>
      </View>
      <View style={{ position: "absolute", left: 186, bottom: 82, opacity: 0.86 }}>
        <Seal kind={template.seal} seed={document.signatureSeed} />
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
