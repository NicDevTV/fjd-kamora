import {
  EB_Garamond,
  Herr_Von_Muellerhoff,
  IM_Fell_English_SC,
  Mr_De_Haviland,
  Monsieur_La_Doulaise,
  Mrs_Saint_Delafield,
  UnifrakturMaguntia,
} from "next/font/google";
import { COLORS, LETTER_PATH, SHIELD_PATH, star } from "@/lib/amtsblatt/geometry";
import { formatDate, type SealKind, type Template } from "@/lib/amtsblatt/templates";
import { SignatureMark } from "./signature-mark";
import type { PendingView, StampView } from "@/lib/amtsblatt/countersign";
import { fullName } from "@/lib/server/db/types";
import { CertificateStamps } from "./stamp-mark";
import { WaxSeal } from "./wax-seal";
import { isPublicTemplate } from "@/lib/amtsblatt/publication";
import type { DrawnSignature } from "@/lib/amtsblatt/drawn-signature";

// The certificate in HTML, laid out like the PDF (pdf.tsx) on the same A4 grid in points.
// One point is var(--u), a fraction of the preview's width, so the page scales to any size
// (gallery thumbnail, live preview, document page) and stays sharp.

const fraktur = UnifrakturMaguntia({ weight: "400", subsets: ["latin"], variable: "--font-cert-fraktur" });
const garamond = EB_Garamond({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-cert-garamond" });
const fell = IM_Fell_English_SC({ weight: "400", subsets: ["latin"], variable: "--font-cert-fell" });
// Four scripts for the officials' personal hands (signatureHand in geometry.ts).
const sigHand = Herr_Von_Muellerhoff({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-cert-sig-hand" });
const sigDelafield = Mrs_Saint_Delafield({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-cert-sig-delafield" });
const sigDoulaise = Monsieur_La_Doulaise({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-cert-sig-doulaise" });
const sigHaviland = Mr_De_Haviland({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-cert-sig-haviland" });

// Font variables for anything outside the page that shows the same faces (signature sample).
export const certificateFonts = `${fraktur.variable} ${garamond.variable} ${fell.variable} ${sigHand.variable} ${sigDelafield.variable} ${sigDoulaise.variable} ${sigHaviland.variable}`;

const u = (value: number) => `calc(var(--u) * ${value})`;

function Emblem({ kind }: { kind: SealKind }) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" style={{ width: u(46), height: u(46) }}>
      {kind !== "fjd" ? (
        <g>
          <circle cx={48} cy={48} r={44} fill="none" stroke={COLORS.sepia} strokeWidth={2} />
          <circle cx={48} cy={48} r={38} fill="none" stroke={COLORS.sepia} strokeWidth={0.8} />
          <path d={star(48, 48, 30, 12, 8)} fill={COLORS.sepia} />
          <circle cx={48} cy={48} r={6} fill={COLORS.paper} />
        </g>
      ) : (
        <g transform="translate(7.7 0.6) scale(0.84)">
          <path d={SHIELD_PATH} fill="none" stroke={COLORS.sepia} strokeWidth={4} />
          <path d={LETTER_PATH} fill={COLORS.sepia} />
        </g>
      )}
    </svg>
  );
}

export type CertificateData = {
  template: Template;
  fields: Record<string, string>;
  number: string | null;
  signerName: string;
  signerSignature?: DrawnSignature | null;
  // Printed before the name under the signature, never inside it.
  signerHonorific?: string | null;
  signerTitle: string;
  // Id of the official whose personal hand signs (see signatureHand).
  signerKey: string;
  seed: number;
  // ISO date of issue; the preview of an unissued document shows today.
  issuedAt: string;
  // Countersignatures already stamped, and the ones still open.
  stamps?: StampView[];
  pending?: PendingView[];
};

export function CertificatePreview({ data, className = "" }: { data: CertificateData; className?: string }) {
  const { template, fields, number, signerName, signerHonorific, signerTitle, signerKey, signerSignature, seed, issuedAt, stamps = [], pending = [] } = data;

  return (
    <div
      className={`cert ${certificateFonts} ${className}`}
      data-quorum={template.judicialQuorum ?? undefined}
      role="img"
      aria-label={`${template.title}${fields.name ? ` für ${fields.name}` : ""}`}
    >
      <div className="cert-page">
        {/* eslint-disable-next-line @next/next/no-img-element -- static vector frame, no optimisation needed */}
        <img src="/urkunde-rahmen.svg" alt="" className="cert-frame" />

        <div className="cert-content">
          <Emblem kind={template.seal} />
          <p className="cert-formula">{template.formula.toUpperCase()}</p>
          <p className="cert-issuer">{template.issuer}</p>
          <span className="cert-rule" />
          <p className="cert-title">{template.title}</p>
          <p className="cert-number">AMTSBLATT NR. {number ?? "wird vergeben"}</p>

          <div className="cert-body">
            {template.blocks(fields).map((block, index) => (
              <p key={index} className={`cert-${block.kind}`}>
                {block.text}
              </p>
            ))}
          </div>

          <div className="cert-closing">
            <WaxSeal kind={template.seal} seed={seed} className="cert-seal" />
            <div className="cert-signing">
              <p className="cert-date">Kamora, den {formatDate(issuedAt.slice(0, 10))}</p>
              <SignatureMark name={signerName || "Dein Dienstname"} seed={seed} signerKey={signerKey} signature={signerSignature} />
              <span className="cert-line" />
              <p className="cert-signer">{fullName(signerHonorific, signerName || "Dein Dienstname")}</p>
              <p className="cert-signer-title">{signerTitle}</p>
            </div>
          </div>
        </div>

        <CertificateStamps stamps={stamps} pending={pending} />

        <p className="cert-legal">
          Rechtsgrundlage: {template.legalBasis}. {isPublicTemplate(template.id) ? "Öffentliche Bekanntmachung erst nach vollständiger Gegenzeichnung." : "Vertrauliche Urkunde · nur für den internen Dienstgebrauch."}
        </p>
      </div>
    </div>
  );
}
