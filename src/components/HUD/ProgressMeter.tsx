import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { intensityFor, intensityScalar } from '../../game/intensity';

/**
 * A thin, arcade-style energy line that fills as the cube gets closer to solved.
 * Intentionally NOT a chunky progress bar — it's ambient, sitting just below
 * the timer. Intensifies visually as progress rises: hue warms, brightness
 * lifts, and a subtle glow appears past 75%.
 *
 * The width is animated with CSS so React only re-renders when progress
 * actually changes, not every frame.
 */
export function ProgressMeter() {
  const progress = useGameStore((s) => s.progress);
  const isNear = useGameStore((s) => s.isNearSolved);
  const phase = useGameStore((s) => s.phase);
  const tier = intensityFor(progress, phase === 'solved');
  const scalar = intensityScalar(progress);

  // A one-frame lag so we can trigger a "just-changed" pop on the fill.
  const prev = useRef(progress);
  const [pop, setPop] = useState(0);
  useEffect(() => {
    if (progress !== prev.current) {
      setPop((p) => p + 1);
      prev.current = progress;
    }
  }, [progress]);

  const color = colorForTier(tier);
  const glow = tier === 'near' ? '0 0 14px rgba(255,255,255,0.55)' : tier === 'heightened' ? '0 0 6px rgba(255,255,255,0.35)' : 'none';

  return (
    <div className="relative w-full">
      <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-[0.22em] text-white/40">
        <span>Progress</span>
        <span className="tabular-nums">{progress}%</span>
      </div>
      <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          key={`pop-${pop}`}
          className="absolute inset-y-0 left-0 origin-left transition-[width] duration-500 ease-out"
          style={{
            width: `${Math.max(2, progress)}%`,
            background: color,
            boxShadow: glow,
            animation: 'metersnap 240ms ease-out',
          }}
        />
        {isNear && (
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'meterscan 1.6s linear infinite',
            }}
          />
        )}
      </div>
      <style>{`
        @keyframes metersnap {
          0% { filter: brightness(1.6); }
          100% { filter: brightness(1); }
        }
        @keyframes meterscan {
          0% { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      {/* invisible; kept so unused imports don't trip TS if we tune later */}
      <span className="hidden" data-tier={tier} data-scalar={scalar} />
    </div>
  );
}

function colorForTier(tier: ReturnType<typeof intensityFor>): string {
  switch (tier) {
    case 'calm':
      return 'linear-gradient(90deg, #4a5568, #718096)';
    case 'warm':
      return 'linear-gradient(90deg, #4c7a9a, #7ab8d6)';
    case 'active':
      return 'linear-gradient(90deg, #5eb37a, #a2e6b9)';
    case 'heightened':
      return 'linear-gradient(90deg, #f0c04a, #ffe488)';
    case 'near':
      return 'linear-gradient(90deg, #ff9a3d, #fff1a8)';
    case 'solved':
      return 'linear-gradient(90deg, #ffffff, #a2e6b9)';
  }
}
