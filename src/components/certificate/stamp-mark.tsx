import type { PendingView, StampView } from "@/lib/amtsblatt/countersign";
import { STAMP_INK, STAMP_SIZE, stampDecisionSize, stampShape } from "@/lib/amtsblatt/geometry";
import { formatDate } from "@/lib/amtsblatt/template-kit";
import { fullName, ROLE_STAMP } from "@/lib/server/db/types";
import { SignatureMark } from "./signature-mark";

// The countersignatures of a certificate as HTML: a round stamp of the office, the signer's hand,
// name and title; open requests as a dashed box. The PDF draws the same (pdf.tsx).

export function StampMark({ stamp }: { stamp: StampView }) {
  const shape = stampShape(ROLE_STAMP[stamp.role], stamp.seed);
  const { c } = shape;
  const ink = stamp.rejected ? STAMP_INK.no : STAMP_INK.yes;
  return (
    <svg viewBox={`0 0 ${STAMP_SIZE} ${STAMP_SIZE}`} aria-hidden="true" className="cert-stamp-mark">
      <g transform={`rotate(${shape.rotation.toFixed(1)} ${c} ${c})`} opacity={0.88}>
        {/* The tiny gap in the dash is worn ink on the rim. */}
        <circle cx={c} cy={c} r={30.2} fill="none" stroke={ink} strokeWidth={1.1} strokeDasharray="44 0.7" />
        <circle cx={c} cy={c} r={19.5} fill="none" stroke={ink} strokeWidth={0.6} />
        {shape.letters.map((letter, index) => (
          <text
            key={index}
            x={c}
            y={c - 22.6}
            fill={ink}
            textAnchor="middle"
            transform={`rotate(${((360 / shape.letters.length) * index).toFixed(2)} ${c} ${c})`}
            style={{ fontFamily: "var(--font-cert-fell)", fontSize: 4.9 }}
          >
            {letter}
          </text>
        ))}
        <text
          x={c}
          y={c + 1.2}
          fill={ink}
          textAnchor="middle"
          transform={`rotate(${shape.tilt.toFixed(1)} ${c} ${c})`}
          style={{ fontFamily: "var(--font-cert-fell)", fontSize: stampDecisionSize(stamp.decision) }}
        >
          {stamp.decision.toUpperCase()}
        </text>
        <text x={c} y={c + 8.6} fill={ink} textAnchor="middle" style={{ fontFamily: "var(--font-cert-fell)", fontSize: 4.2 }}>
          {formatDate(stamp.stampedAt.slice(0, 10))}
        </text>
      </g>
    </svg>
  );
}

export function CertificateStamps({ stamps, pending }: { stamps: StampView[]; pending: PendingView[] }) {
  if (stamps.length === 0 && pending.length === 0) return null;
  return (
    <div className="cert-stamps">
      {stamps.map((stamp) => (
        <div key={`${stamp.role}-${stamp.stampedAt}`} className="cert-stamp">
          <StampMark stamp={stamp} />
          <div className="cert-stamp-text">
            <div className="cert-stamp-sign">
              <SignatureMark name={stamp.signerName} seed={stamp.seed} signerKey={stamp.signerKey} />
            </div>
            <span className="cert-stamp-line" />
            <p className="cert-stamp-name">{fullName(stamp.signerHonorific, stamp.signerName)}</p>
            <p className="cert-stamp-title">{stamp.signerTitle}</p>
          </div>
        </div>
      ))}
      {pending.map((item) => (
        <div key={item.label} className="cert-stamp cert-stamp-pending">
          <p>
            Gegenzeichnung ausstehend
            <b>{item.label}</b>
          </p>
        </div>
      ))}
    </div>
  );
}
