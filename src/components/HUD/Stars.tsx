import type { StarCount } from '../../game/stars';

/**
 * Three-star rating display. Earned stars glow; unearned stars render as
 * dim outlines so the ceiling is always visible. Size scales via `scale`.
 */
export function Stars({ earned, scale = 1 }: { earned: StarCount; scale?: number }) {
  const dim = (i: number) => i > earned;
  const size = 28 * scale;
  return (
    <div className="flex items-center justify-center gap-1.5">
      {[1, 2, 3].map((i) => (
        <Star key={i} filled={!dim(i)} size={size} />
      ))}
    </div>
  );
}

function Star({ filled, size }: { filled: boolean; size: number }) {
  const stroke = filled ? 'rgba(255, 220, 130, 0.95)' : 'rgba(255,255,255,0.22)';
  const fill = filled ? 'rgba(255, 220, 130, 0.95)' : 'transparent';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        filter: filled ? 'drop-shadow(0 0 6px rgba(255, 210, 120, 0.55))' : undefined,
      }}
    >
      <path
        d="M12 2.75l2.9 5.88 6.5.94-4.7 4.58 1.11 6.48L12 17.6l-5.81 3.03 1.11-6.48L2.6 9.57l6.5-.94L12 2.75z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}
