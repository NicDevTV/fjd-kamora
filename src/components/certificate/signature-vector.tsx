import { signatureGeometry, SIGNATURE_PAD, type DrawnSignature } from "@/lib/amtsblatt/drawn-signature";

export function SignatureVector({ signature, className = "" }: { signature: DrawnSignature; className?: string }) {
  const geometry = signatureGeometry(signature);
  return (
    <svg viewBox="0 0 240 54" role="img" aria-label="Persönlich gezeichnete Unterschrift" className={className} style={{ width: "100%", height: "100%" }}>
      <g transform={geometry.transform} fill="none" stroke={SIGNATURE_PAD.ink} strokeWidth={SIGNATURE_PAD.weight} strokeLinecap="round" strokeLinejoin="round">
        {geometry.paths.map((path, index) => <path key={index} d={path} />)}
      </g>
    </svg>
  );
}
