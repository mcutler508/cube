import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { formatMove } from '../../cube/notation';

const MISFIRE_DURATION_MS = 380;

/**
 * Drill practice ticker. A slim horizontal pill at the top of the play area:
 *   - Phase chip ("GUIDED 1/2" / "FREE 3/4")
 *   - Move ticks for the algorithm; the current expected step glows amber
 *   - Red shake on wrong moves (drillMisfireAt)
 *
 * Kept intentionally shallow so the cube gets full vertical breathing room.
 */
export function DrillOverlay() {
  const level = useGameStore((s) => s.currentLevel);
  const drillState = useGameStore((s) => s.drillState);
  const misfireAt = useGameStore((s) => s.drillMisfireAt);
  const objectiveCompleted = useGameStore((s) => s.objectiveCompleted);
  const dismiss = useGameStore((s) => s.dismissDrillMisfire);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (misfireAt === null) return;
    setShaking(true);
    const id = window.setTimeout(() => {
      setShaking(false);
      dismiss();
    }, MISFIRE_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [misfireAt, dismiss]);

  if (!level?.drill || !drillState || objectiveCompleted) return null;

  const { algorithm, guidedRuns, unlockedRuns } = level.drill;
  const isGuided = drillState.phase === 'guided';
  const runsDone = isGuided ? drillState.guidedCompleted : drillState.unlockedCompleted;
  const runsTotal = isGuided ? guidedRuns : unlockedRuns;
  const phaseLabel = isGuided ? 'Guided' : 'Free';

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-14 z-20 flex justify-center px-3"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 0.25rem)' }}
    >
      <div
        className={`pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-full bg-black/55 pl-2.5 pr-2 py-1 ring-1 ring-white/10 shadow-lg shadow-black/30 backdrop-blur-md ${shaking ? 'drill-shake' : ''}`}
      >
        <span
          className={`shrink-0 text-[9px] font-semibold uppercase tracking-[0.22em] ${
            isGuided ? 'text-sky-300/90' : 'text-amber-300/90'
          }`}
        >
          {phaseLabel}
        </span>
        <span className="shrink-0 font-mono text-[9px] text-white/50">
          {runsDone}/{runsTotal}
        </span>
        <span aria-hidden className="shrink-0 mx-0.5 h-3 w-px bg-white/10" />
        <div className="flex items-center gap-1">
          {algorithm.map((m, i) => (
            <MoveTick
              key={i}
              label={formatMove(m)}
              status={
                i < drillState.expectedIndex
                  ? 'done'
                  : i === drillState.expectedIndex
                    ? 'active'
                    : 'pending'
              }
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes drillShake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-6px); }
          40%  { transform: translateX(5px); }
          60%  { transform: translateX(-3px); }
          80%  { transform: translateX(2px); }
          100% { transform: translateX(0); }
        }
        .drill-shake {
          animation: drillShake ${MISFIRE_DURATION_MS}ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
          box-shadow: 0 0 0 1.5px rgba(239, 68, 68, 0.55);
        }
      `}</style>
    </div>
  );
}

function MoveTick({
  label,
  status,
}: {
  label: string;
  status: 'done' | 'active' | 'pending';
}) {
  const base =
    'flex h-6 min-w-[1.55rem] items-center justify-center rounded-md px-1.5 font-mono text-[10px] font-semibold ring-1 transition-all';
  const style =
    status === 'done'
      ? 'bg-emerald-400/10 text-emerald-200/80 ring-emerald-400/25'
      : status === 'active'
        ? 'bg-amber-300/25 text-amber-100 ring-amber-300/60 shadow-[0_0_10px_rgba(255,191,59,0.45)] scale-105'
        : 'bg-white/[0.03] text-white/35 ring-white/5';
  return <div className={`${base} ${style}`}>{label}</div>;
}
