import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { formatMove } from '../../cube/notation';

const MISFIRE_DURATION_MS = 380;

/**
 * Drill practice ticker — a filmstrip of numbered move chips at the top of
 * the play area. Renders:
 *   - Phase chip ("GUIDED 0/2" / "FREE 3/4") on the left
 *   - One numbered chip per move in the algorithm; done chips read emerald,
 *     the current expected step glows amber, upcoming steps are dim
 *   - Thin vertical tick marks between chips for the filmstrip aesthetic
 *   - Red shake on wrong moves (misfire pulse)
 *
 * Positioned in the empty band between the objective banner and the cube so
 * the sequence stays glanceable without eating the cube's real estate.
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
      className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-3"
      style={{ top: 'calc(max(env(safe-area-inset-top), 0.25rem) + 3.25rem)' }}
    >
      <div
        className={`pointer-events-auto flex max-w-full items-stretch gap-2 overflow-x-auto rounded-xl bg-black/55 px-2.5 py-1.5 ring-1 ring-white/[0.09] shadow-lg shadow-black/40 backdrop-blur-md ${shaking ? 'drill-shake' : ''}`}
      >
        <div className="flex shrink-0 flex-col items-start justify-center pr-1">
          <span
            className={`text-[9px] font-semibold uppercase tracking-[0.22em] leading-none ${
              isGuided ? 'text-sky-300/90' : 'text-amber-300/90'
            }`}
          >
            {phaseLabel}
          </span>
          <span className="mt-0.5 font-mono text-[9px] leading-none text-white/50">
            {runsDone}/{runsTotal}
          </span>
        </div>
        <span aria-hidden className="shrink-0 self-stretch w-px bg-white/[0.08]" />
        <div className="flex items-stretch">
          {algorithm.map((m, i) => {
            const status: 'done' | 'active' | 'pending' =
              i < drillState.expectedIndex
                ? 'done'
                : i === drillState.expectedIndex
                  ? 'active'
                  : 'pending';
            return (
              <div key={i} className="flex items-stretch">
                {i > 0 && <TickMark />}
                <FilmChip label={formatMove(m)} index={i + 1} status={status} />
              </div>
            );
          })}
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

function TickMark() {
  return (
    <span
      aria-hidden
      className="mx-1 my-1 w-px shrink-0 bg-white/[0.08]"
    />
  );
}

function FilmChip({
  label,
  index,
  status,
}: {
  label: string;
  index: number;
  status: 'done' | 'active' | 'pending';
}) {
  const base =
    'flex h-8 min-w-[1.9rem] flex-col items-center justify-center rounded-lg px-1.5 ring-1 transition-all';
  const style =
    status === 'done'
      ? 'bg-emerald-400/12 text-emerald-200/85 ring-emerald-400/30'
      : status === 'active'
        ? 'bg-amber-300/25 text-amber-50 ring-amber-300/70 shadow-[0_0_14px_rgba(255,191,59,0.5)] scale-[1.08]'
        : 'bg-white/[0.03] text-white/35 ring-white/[0.06]';
  const numberStyle =
    status === 'done'
      ? 'text-emerald-200/50'
      : status === 'active'
        ? 'text-amber-100/70'
        : 'text-white/25';
  return (
    <div className={`${base} ${style}`}>
      <span className="font-mono text-[12px] font-semibold leading-none tracking-tight">
        {label}
      </span>
      <span className={`mt-[2px] font-mono text-[7px] leading-none tabular-nums ${numberStyle}`}>
        {index}
      </span>
    </div>
  );
}
