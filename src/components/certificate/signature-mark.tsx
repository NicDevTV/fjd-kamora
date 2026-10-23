import type { CSSProperties } from "react";
import { SIGNATURE_BOX, signatureHand, signatureStyle } from "@/lib/amtsblatt/geometry";

// The handwritten signature of one official on one document, as HTML. Sizes are in points of the
// certificate grid (var(--u)); outside a certificate the wrapper sets --u itself (see SignatureSample).
const u = (value: number) => `calc(var(--u) * ${value})`;

export function SignatureMark({ name, seed, signerKey }: { name: string; seed: number; signerKey: string }) {
  const style = signatureStyle(name, seed, signatureHand(signerKey));
  return (
    <div className="cert-signature" style={{ color: style.ink }}>
      <span
        style={
          {
            fontFamily: `var(--font-cert-sig-${style.key}), cursive`,
            fontSize: u(style.size),
            letterSpacing: u(style.letterSpacing),
            left: u(style.shift),
            marginBottom: u(style.drop),
            transform: `rotate(${style.rotate.toFixed(1)}deg) skewX(${style.skew.toFixed(1)}deg) scaleX(${style.stretch.toFixed(3)})`,
          } as CSSProperties
        }
      >
        {name}
      </span>
      {style.flourish && (
        <svg
          viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`}
          aria-hidden="true"
          className="cert-flourish"
        >
          <path
            d={style.flourish}
            fill="none"
            stroke="currentColor"
            strokeWidth={style.weight}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

// A signature on its own, e.g. in the form or on the profile page. One point is `scale` pixels wide.
export function SignatureSample({
  name,
  seed,
  signerKey,
  scale = 1,
}: {
  name: string;
  seed: number;
  signerKey: string;
  scale?: number;
}) {
  return (
    <div style={{ "--u": `${scale}px`, width: u(SIGNATURE_BOX.width), maxWidth: "100%" } as CSSProperties}>
      <SignatureMark name={name} seed={seed} signerKey={signerKey} />
    </div>
  );
}
