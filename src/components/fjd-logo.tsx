// Fictional emblem of the department: a shield with a solid F.
// Deliberately no real coat of arms or seal, so it never reads as a real institution.
type FjdLogoProps = {
  className?: string;
  animated?: boolean;
};

export function FjdLogo({ className, animated = false }: FjdLogoProps) {
  const outline = animated ? "fjd-draw" : undefined;
  const innerLine = animated ? "fjd-draw fjd-step-1" : undefined;
  const letter = animated ? "fjd-fill fjd-step-2" : undefined;

  return (
    <svg
      viewBox="0 0 96 112"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M48 4L90 17V58C90 84 72 100 48 109C24 100 6 84 6 58V17Z"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinejoin="round"
        pathLength={1}
        className={outline}
      />
      <path
        d="M48 14L82 24.5V58C82 79 67 91 48 99.5C29 91 14 79 14 58V24.5Z"
        stroke="currentColor"
        strokeOpacity={0.45}
        strokeWidth={1.25}
        strokeLinejoin="round"
        pathLength={1}
        className={innerLine}
      />
      <path
        d="M33 34H63V45H44V58H57V68H44V84H33Z"
        fill="currentColor"
        className={letter}
      />
    </svg>
  );
}
