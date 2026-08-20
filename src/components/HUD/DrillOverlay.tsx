import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { formatMove } from '../../cube/notation';

const MISFIRE_DURATION_MS = 380;

/**
 * Drill practice overlay. Shows:
 *   - Algorithm label + move ticks (highlighting the current expected step)
 *   - Phase counter ("Guided 1 of 2" / "Free run 3 of 4")
 *   - Wrong-move flash + shake, triggered when drillMisfireAt updates
 *
 * Rendered above the cube in the level playfield when currentLevel.drill is set.
 * Idle when no drill is active or the drill is complete.
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

  const { algorithm, guidedRuns, unlockedRuns, label } = level.drill;
  const isGuided = drillState.phase === 'guided';
  const runsDone = isGuided ? drillState.guidedCompleted : drillState.unlockedCompleted;
  const runsTotal = isGuided ? guidedRuns : unlockedRuns;
  const phaseLabel = isGuided ? 'Guided' : 'Free Run';

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-4"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}
    >
      <div
        className={`pointer-events-auto rounded-2xl bg-black/60 px-4 py-3 ring-1 ring-white/15 backdrop-blur ${shaking ? 'drill-shake' : ''}`}
        style={{ minWidth: 280, maxWidth: 420 }}
      >
        <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.25em]">
          <span
            className={
              isGuided ? 'text-sky-300' : 'text-amber-300'
            }
          >
            {phaseLabel}
          </span>
          <span className="font-mono text-white/70">
            {runsDone} / {runsTotal}
          </span>
        </div>
        <div className="mt-1 text-xs font-medium text-white/85">{label}</div>
        <div className="mt-2 flex items-center justify-center gap-1.5">
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
        {isGuided ? (
          <div className="mt-2 text-center text-[10px] uppercase tracking-[0.2em] text-white/45">
            Only the correct face responds
          </div>
        ) : (
          <div className="mt-2 text-center text-[10px] uppercase tracking-[0.2em] text-white/45">
            One wrong move resets the streak
          </div>
        )}
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
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.55);
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
    'flex h-8 min-w-[2.25rem] items-center justify-center rounded-md px-2 font-mono text-xs font-semibold ring-1 transition-all';
  const style =
    status === 'done'
      ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/40'
      : status === 'active'
        ? 'bg-amber-300/25 text-amber-100 ring-amber-300/60 scale-110 shadow-md shadow-amber-500/20'
        : 'bg-white/[0.04] text-white/40 ring-white/10';
  return <div className={`${base} ${style}`}>{label}</div>;
}
