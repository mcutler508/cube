import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { LevelResultPanel } from './LevelResultPanel';

/**
 * Arcade-style completion sequence for a full cube solve. Three stages:
 *   0. sparkle rays + SOLVED word flash-in
 *   1. best-streak grace note
 *   2. results panel (stars, moves, PB, actions)
 *
 * Kept under control — one screen, no confetti sheets. The staged reveal
 * gives each moment a beat of its own so the whole thing feels earned.
 */
export function SolvedSequence() {
  const startedAt = useGameStore((s) => s.startedAt);
  const endedAt = useGameStore((s) => s.endedAt);
  const moves = useGameStore((s) => s.moveCount);
  const bestStreak = useGameStore((s) => s.bestStreak);
  const currentLevel = useGameStore((s) => s.currentLevel);
  const elapsedMs = startedAt !== null && endedAt !== null ? endedAt - startedAt : 0;

  const [stage, setStage] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    const t1 = window.setTimeout(() => setStage(1), 520);
    const t2 = window.setTimeout(() => setStage(2), 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (!currentLevel) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/62 backdrop-blur-md animate-[fadein 500ms ease-out]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(255,255,255,0.20) 0%, rgba(80,220,140,0.09) 30%, transparent 60%)',
          animation: 'solveburst 900ms ease-out',
        }}
      />

      {/* Sparkle rays radiating from the SOLVED word */}
      <SparkleRays />

      <div className="pointer-events-auto relative flex w-full max-w-md flex-col items-center px-6 py-6">
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.4em] text-emerald-300/90"
          style={{ animation: 'popup 400ms ease-out' }}
        >
          Cube Solved
        </div>
        <div
          className="mt-2 select-none text-center font-semibold text-white"
          style={{
            fontSize: 'clamp(3.5rem, 12vw, 5.5rem)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textShadow: '0 0 40px rgba(255,255,255,0.32), 0 0 80px rgba(140,240,190,0.25)',
            animation: 'solvedbig 620ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          SOLVED
        </div>

        {stage >= 1 && bestStreak >= 3 && (
          <div
            className="mt-3 flex items-center gap-2 rounded-full bg-amber-300/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200 ring-1 ring-amber-300/25"
            style={{ animation: 'popup 380ms ease-out' }}
          >
            Best combo x{bestStreak}
          </div>
        )}

        {stage >= 2 && (
          <div
            className="mt-5 w-full"
            style={{ animation: 'popup 420ms ease-out' }}
          >
            <LevelResultPanel
              level={currentLevel}
              moves={moves}
              elapsedMs={elapsedMs}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes solveburst {
          0% { opacity: 0; transform: scale(0.6); }
          40% { opacity: 1; }
          100% { opacity: 0.6; transform: scale(1); }
        }
        @keyframes solvedbig {
          0% { opacity: 0; transform: translateY(24px) scale(0.7); letter-spacing: 0.1em; filter: blur(6px); }
          60% { opacity: 1; transform: translateY(0) scale(1.05); letter-spacing: -0.01em; filter: blur(0); }
          100% { transform: scale(1); letter-spacing: -0.02em; }
        }
        @keyframes popup {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sparkleRay {
          0% { opacity: 0; transform: scaleY(0.2); }
          25% { opacity: 0.9; }
          100% { opacity: 0; transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

/**
 * Twelve thin rays radiating from screen-center, each with its own delay so
 * the burst has a "shutter" feel rather than everything popping at once.
 * Pure CSS — no canvas, no particle system.
 */
function SparkleRays() {
  const rays = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-0 w-0">
        {rays.map((i) => {
          const angle = (i * 360) / rays.length;
          const delay = 40 + (i % 4) * 60;
          return (
            <span
              key={i}
              className="absolute left-0 top-0 origin-bottom"
              style={{
                width: 3,
                height: 'min(28vh, 220px)',
                transform: `translate(-50%, -100%) rotate(${angle}deg)`,
                background:
                  'linear-gradient(to top, rgba(255,255,255,0) 0%, rgba(255,255,220,0.55) 40%, rgba(255,255,255,0.9) 100%)',
                filter: 'blur(1px)',
                animation: `sparkleRay 900ms ease-out ${delay}ms both`,
                transformOrigin: '50% 100%',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
