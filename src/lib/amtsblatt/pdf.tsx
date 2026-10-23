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
import { fullName, ROLE_STAMP, type DocumentRecord } from "@/lib/server/db/types";
import type { PendingView, StampView } from "./countersign";
import { isPublicTemplate } from "./publication";
import { signatureGeometry, SIGNATURE_PAD, type DrawnSignature } from "./drawn-signature";
import {
  COLORS,
  LETTER_PATH,
  PAGE,
  SEAL_SIZE,
  SHIELD_PATH,
  guillocheStrands,
  sealShape,
  SIGNATURE_BOX,
  signatureHand,
  signatureStyle,
  STAMP_INK,
  STAMP_SIZE,
  stampDecisionSize,
  stampShape,
  star,
} from "./geometry";
import { seededRandom } from "./random";
import { formatDate, type SealKind, type Template } from "./templates";

// The certificate as a PDF: aged paper inside a guilloche frame, the issuer's emblem, a fraktur
// title, a wax seal on ribbons and a handwritten signature. All randomness comes from the
// document's seed, so a document always reopens exactly as it was issued.

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
  Font.register({ family: "SignatureDelafield", src: path.join(FONTS, "MrsSaintDelafield.ttf") });
  Font.register({ family: "SignatureDoulaise", src: path.join(FONTS, "MonsieurLaDoulaise.ttf") });
  Font.register({ family: "SignatureHaviland", src: path.join(FONTS, "MrDeHaviland.ttf") });
  // German words must not be split with English hyphenation rules.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const { ink: INK, sepia: SEPIA, paper: PAPER, wax: WAX, ribbon: RIBBON } = COLORS;

function Paper({ seed }: { seed: number }) {
  const random = seededRandom(seed ^ 0x51ed);
  const stains = Array.from({ length: 5 }, (_, index) => ({
    id: `stain${index}`,
    cx: random() * PAGE.width,
    cy: random() * PAGE.height,
    rx: 40 + random() * 120,
    ry: 30 + random() * 90,
    opacity: 0.04 + random() * 0.07,
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
          <Stop offset="100%" stopColor="#8a6233" stopOpacity={0.42} />
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

// Printed frame: a fine guilloche band between two rules, the way security paper is printed.
function Frame() {
  const outer = 28;
  const inner = 42;
  return (
    <Svg width={PAGE.width} height={PAGE.height}>
      <Rect x={outer} y={outer} width={PAGE.width - outer * 2} height={PAGE.height - outer * 2} fill="none" stroke={SEPIA} strokeWidth={1.1} />
      {guillocheStrands(35, 9).map((d, index) => (
        <Path key={index} d={d} fill="none" stroke={SEPIA} strokeWidth={0.35} strokeOpacity={0.75} />
      ))}
      <Rect x={inner} y={inner} width={PAGE.width - inner * 2} height={PAGE.height - inner * 2} fill="none" stroke={SEPIA} strokeWidth={0.6} />
    </Svg>
  );
}

// Engraved emblem of the issuer above the text: the federation's star or the department's shield.
function Emblem({ kind }: { kind: SealKind }) {
  return (
    <Svg width={46} height={46} viewBox="0 0 96 96">
      {kind !== "fjd" ? (
        <G>
          <Circle cx={48} cy={48} r={44} fill="none" stroke={SEPIA} strokeWidth={2} />
          <Circle cx={48} cy={48} r={38} fill="none" stroke={SEPIA} strokeWidth={0.8} />
          <Path d={star(48, 48, 30, 12, 8)} fill={SEPIA} />
          <Circle cx={48} cy={48} r={6} fill={PAPER} />
        </G>
      ) : (
        <G transform="translate(7.7, 0.6) scale(0.84)">
          <Path d={SHIELD_PATH} fill="none" stroke={SEPIA} strokeWidth={4} />
          <Path d={LETTER_PATH} fill={SEPIA} />
        </G>
      )}
    </Svg>
  );
}

// A wax seal pressed onto two ribbons. Everything raised by the stamp (rim, letters, emblem) is
// drawn three times: a dark copy shifted down-right as shadow, a pale copy up-left as the light
// catching the edge, and the wax colour on top. That reads as relief even on flat paper.
function Seal({ kind, seed, size = 150 }: { kind: SealKind; seed: number; size?: number }) {
  const shape = sealShape(kind, seed);
  const { c, letters } = shape;

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

  const emblem = (fill: string, dx = 0, dy = 0) =>
    kind !== "fjd" ? (
      <G transform={`translate(${dx}, ${dy})`}>
        <Path d={shape.starPath} fill={fill} />
        <Circle cx={c} cy={c} r={4.6} fill="none" stroke={fill} strokeWidth={1.4} />
      </G>
    ) : (
      <G transform={`translate(${c - 15 + dx}, ${c - 18 + dy}) scale(0.32)`}>
        <Path d={SHIELD_PATH} fill="none" stroke={fill} strokeWidth={7} />
        <Path d={LETTER_PATH} fill={fill} />
      </G>
    );

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${SEAL_SIZE} ${SEAL_SIZE}`}>
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

      {shape.ribbons.map((d) => (
        <G key={d}>
          <Path d={d} fill="url(#ribbon)" />
          <Path d={d} fill="none" stroke={RIBBON.light} strokeWidth={0.6} strokeOpacity={0.6} />
        </G>
      ))}

      <G transform={`rotate(${shape.rotation.toFixed(1)}, ${c}, ${c})`}>
        <Path d={shape.outline} fill="#2a0a0e" fillOpacity={0.28} transform="translate(2.2, 3)" />
        <Path d={shape.outline} fill="url(#wax)" />
        <Path d={shape.outline} fill="none" stroke={WAX.shine} strokeWidth={0.8} strokeOpacity={0.35} transform="translate(-0.6, -0.8)" />
        <Circle cx={c} cy={c} r={43.5} fill="url(#press)" />
        <Circle cx={c + 0.9} cy={c + 1.1} r={43.5} fill="none" stroke={WAX.rim} strokeWidth={1.6} strokeOpacity={0.8} />
        <Circle cx={c - 0.7} cy={c - 0.8} r={44.6} fill="none" stroke={WAX.shine} strokeWidth={0.9} strokeOpacity={0.4} />
        {ring(0.8, 0.9, WAX.rim, 0.85)}
        {ring(-0.55, -0.6, WAX.shine, 0.45)}
        {ring(0, 0, WAX.light, 1)}
        {emblem(WAX.rim, 0.9, 1)}
        {emblem(WAX.shine, -0.6, -0.7)}
        {emblem(WAX.light)}
      </G>

      {/* Gloss on the curved wax, independent of the seal's rotation: light comes from top left. */}
      <Path d={`M ${c - 36} ${c - 14} Q ${c - 30} ${c - 36} ${c - 8} ${c - 41}`} fill="none" stroke={WAX.shine} strokeWidth={2.6} strokeOpacity={0.28} strokeLinecap="round" />
      <Circle cx={c - 27} cy={c - 30} r={2.4} fill={WAX.shine} fillOpacity={0.35} />
    </Svg>
  );
}

function Signature({ name, seed, signerKey, scale = 1, signature }: { name: string; seed: number; signerKey: string; scale?: number; signature?: DrawnSignature | null }) {
  if (signature) {
    const geometry = signatureGeometry(signature);
    return <Svg width={SIGNATURE_BOX.width * scale} height={SIGNATURE_BOX.height * scale} viewBox="0 0 240 54"><G transform={geometry.transform}>{geometry.paths.map((path, index) => <Path key={index} d={path} fill="none" stroke={SIGNATURE_PAD.ink} strokeWidth={SIGNATURE_PAD.weight} strokeLinecap="round" strokeLinejoin="round" />)}</G></Svg>;
  }
  const style = signatureStyle(name, seed, signatureHand(signerKey));
  const k = scale;
  return (
    <View style={{ width: SIGNATURE_BOX.width * k, height: SIGNATURE_BOX.height * k, justifyContent: "flex-end", alignItems: "center" }}>
      <Text
        style={{
          fontFamily: style.family,
          lineHeight: 1,
          // Wider than the box so the name never wraps; it stays centred and overflows evenly.
          width: 700 * k,
          textAlign: "center",
          fontSize: style.size * k,
          color: style.ink,
          letterSpacing: style.letterSpacing * k,
          position: "relative",
          left: style.shift * k,
          marginBottom: (style.drop + style.size * 0.2) * k,
          transform: `rotate(${style.rotate.toFixed(1)}deg) skewX(${style.skew.toFixed(1)}deg) scaleX(${style.stretch.toFixed(3)})`,
        }}
      >
        {name}
      </Text>
      {style.flourish && (
        <Svg
          viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`}
          style={{ position: "absolute", top: 0, left: 0, width: SIGNATURE_BOX.width * k, height: SIGNATURE_BOX.height * k }}
        >
          <Path d={style.flourish} fill="none" stroke={style.ink} strokeWidth={style.weight} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  );
}

// A round ink stamp of an office, drawn like the one in the preview (stamp-mark.tsx).
function StampDrawing({ stamp }: { stamp: StampView }) {
  const shape = stampShape(ROLE_STAMP[stamp.role], stamp.seed);
  const { c } = shape;
  const ink = stamp.rejected ? STAMP_INK.no : STAMP_INK.yes;
  return (
    <Svg width={62} height={62} viewBox={`0 0 ${STAMP_SIZE} ${STAMP_SIZE}`}>
      <G transform={`rotate(${shape.rotation.toFixed(1)}, ${c}, ${c})`} opacity={0.88}>
        <Circle cx={c} cy={c} r={30.2} fill="none" stroke={ink} strokeWidth={1.1} />
        <Circle cx={c} cy={c} r={19.5} fill="none" stroke={ink} strokeWidth={0.6} />
        {shape.letters.map((letter, index) => (
          <G key={index} transform={`rotate(${((360 / shape.letters.length) * index).toFixed(2)}, ${c}, ${c})`}>
            <Text x={c} y={c - 22.6} fill={ink} textAnchor="middle" style={{ fontFamily: "FellSC", fontSize: 4.9 }}>
              {letter}
            </Text>
          </G>
        ))}
        <G transform={`rotate(${shape.tilt.toFixed(1)}, ${c}, ${c})`}>
          <Text x={c} y={c + 1.2} fill={ink} textAnchor="middle" style={{ fontFamily: "FellSC", fontSize: stampDecisionSize(stamp.decision) }}>
            {stamp.decision.toUpperCase()}
          </Text>
        </G>
        <Text x={c} y={c + 8.6} fill={ink} textAnchor="middle" style={{ fontFamily: "FellSC", fontSize: 4.2 }}>
          {formatDate(stamp.stampedAt.slice(0, 10))}
        </Text>
      </G>
    </Svg>
  );
}

// Countersignatures in a row above the legal line; open requests as a dashed box.
function Stamps({ stamps, pending }: { stamps: StampView[]; pending: PendingView[] }) {
  if (stamps.length === 0 && pending.length === 0) return null;
  return (
    <View
      style={{ position: "absolute", left: 70, right: 70, bottom: 76, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-end", gap: 14 }}
    >
      {stamps.map((stamp) => (
        <View key={`${stamp.signerKey}-${stamp.stampedAt}`} style={{ width: 205, flexDirection: "row", alignItems: "center" }}>
          <StampDrawing stamp={stamp} />
          <View style={{ flex: 1, alignItems: "center", marginLeft: 5 }}>
            <Signature name={stamp.signerName} seed={stamp.seed} signerKey={stamp.signerKey} scale={0.5} signature={stamp.signerSignature} />
            <View style={{ width: 118, borderTopWidth: 0.6, borderTopColor: INK, marginTop: 1 }} />
            <Text style={{ fontSize: 9, marginTop: 3 }}>{fullName(stamp.signerHonorific, stamp.signerName)}</Text>
            <Text style={{ fontSize: 7.5, fontStyle: "italic", color: SEPIA, marginTop: 1 }}>{stamp.signerTitle}</Text>
          </View>
        </View>
      ))}
      {pending.map((item) => (
        <View
          key={item.label}
          style={{
            width: 205,
            height: 54,
            borderWidth: 0.8,
            borderStyle: "dashed",
            borderColor: SEPIA,
            borderRadius: 4,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 8, fontStyle: "italic", color: SEPIA }}>Gegenzeichnung ausstehend</Text>
          <Text style={{ fontSize: 9, color: SEPIA, marginTop: 2 }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = {
  // The page itself has no padding: the full-page paper and frame must fit it exactly, or
  // react-pdf pushes them onto pages of their own. The text sits in a padded block instead.
  page: { fontFamily: "Garamond", color: INK, backgroundColor: PAPER },
  content: { position: "absolute" as const, top: 70, left: 80, right: 80, alignItems: "center" as const },
  layer: { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 },
  formula: { fontFamily: "FellSC", fontSize: 11, letterSpacing: 3, color: SEPIA, marginTop: 12 },
  issuer: { fontStyle: "italic" as const, fontSize: 13, marginTop: 3, color: SEPIA },
  rule: { marginTop: 12, width: 120, borderBottomWidth: 0.8, borderBottomColor: SEPIA },
  title: { fontFamily: "Fraktur", fontSize: 40, marginTop: 14 },
  number: { fontSize: 9, marginTop: 4, color: SEPIA, letterSpacing: 1.2 },
  text: { fontSize: 13.5, lineHeight: 1.55, textAlign: "center" as const, marginTop: 16 },
  name: { fontStyle: "italic" as const, fontSize: 26, textAlign: "center" as const, marginTop: 16 },
  office: { fontFamily: "FellSC", fontSize: 17, letterSpacing: 1.5, textAlign: "center" as const, marginTop: 14 },
};

function Certificate({
  document,
  template,
  stamps,
  pending,
}: {
  document: DocumentRecord;
  template: Template;
  stamps: StampView[];
  pending: PendingView[];
}) {
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
        <Emblem kind={template.seal} />
        <Text style={styles.formula}>{template.formula.toUpperCase()}</Text>
        <Text style={styles.issuer}>{template.issuer}</Text>
        <View style={styles.rule} />
        <Text style={styles.title}>{template.title}</Text>
        <Text style={styles.number}>AMTSBLATT NR. {document.number}</Text>

        <View style={{ marginTop: 14, alignSelf: "stretch" }}>
          {template.blocks(document.fields).map((block, index) => (
            <Text key={index} style={[block.kind === "name" ? styles.name : block.kind === "office" ? styles.office : styles.text, ...(template.judicialQuorum ? [{ marginTop: 10, fontSize: block.kind === "name" ? 23 : block.kind === "office" ? 14 : 12 }] : [])]}>
              {block.text}
            </Text>
          ))}
        </View>

        {/* Closing block: the seal stands on its own on the left, nothing printed under it;
            place, date and signature on the right, as on a real certificate. */}
        <View style={{ marginTop: template.judicialQuorum ? 18 : 52, alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View style={{ width: template.judicialQuorum ? 105 : 150, height: template.judicialQuorum ? 105 : 150, alignItems: "center" }}>
            <Seal kind={template.seal} seed={document.signatureSeed} size={template.judicialQuorum ? 105 : 150} />
          </View>
          <View style={{ width: 240, alignItems: "center" }}>
            <Text style={{ fontSize: 12.5, fontStyle: "italic" }}>Kamora, den {issued}</Text>
            <Signature name={document.signerName} seed={document.signatureSeed} signerKey={document.issuedBy} signature={document.signerSignature} />
            <View style={{ width: 210, borderTopWidth: 0.7, borderTopColor: INK, marginTop: 2 }} />
            <Text style={{ fontSize: 12, marginTop: 5 }}>{fullName(document.signerHonorific, document.signerName)}</Text>
            <Text style={{ fontSize: 10, fontStyle: "italic", color: SEPIA, marginTop: 1 }}>{document.signerTitle}</Text>
          </View>
        </View>
      </View>

      <Stamps stamps={stamps} pending={pending} />

      <Text style={{ position: "absolute", left: 80, right: 80, bottom: 54, fontSize: 7.5, textAlign: "center", color: SEPIA }}>
        Rechtsgrundlage: {template.legalBasis}. {isPublicTemplate(template.id) ? "Öffentliche Bekanntmachung erst nach vollständiger Gegenzeichnung." : "Vertrauliche Urkunde · nur für den internen Dienstgebrauch."}
      </Text>
    </Page>
  );
}

export async function renderCertificate(
  document: DocumentRecord,
  template: Template,
  stamps: StampView[] = [],
  pending: PendingView[] = [],
) {
  registerFonts();
  return renderToBuffer(
    <Document title={`${template.title} ${document.number}`} author="Föderales Justizdepartement" creator="FJD Amtsblatt">
      <Certificate document={document} template={template} stamps={stamps} pending={pending} />
    </Document>,
  );
}
