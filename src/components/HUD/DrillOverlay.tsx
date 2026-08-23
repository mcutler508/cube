import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { formatMove } from '../../cube/notation';

const MISFIRE_DURATION_MS = 380;

/**
 * Drill practice ticker — a filmstrip of numbered move chips at the top of
 * the play area. Renders:
 *   - Algorithm name + optional blurb header pill
 *   - Phase column ("GUIDED 0/2" / "FREE 3/4") on the left of the strip
 *   - One numbered chip per move in the algorithm; done chips read emerald,
 *     the current expected step glows amber, upcoming steps are dim
 *   - Sprocket-hole perforations along the top and bottom of the strip for
 *     the filmstrip aesthetic (no per-chip tick marks — those forced a
 *     horizontal scroll on narrow phones)
 *   - Red shake on wrong moves (misfire pulse)
 *
 * The strip stretches to the play-area width and its chips share space via
 * flex-1 + min-w-0, so a full 8-move algorithm fits any phone width without
 * needing to scroll.
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

  const { name, blurb, algorithm, guidedRuns, unlockedRuns } = level.drill;
  const isGuided = drillState.phase === 'guided';
  const runsDone = isGuided ? drillState.guidedCompleted : drillState.unlockedCompleted;
  const runsTotal = isGuided ? guidedRuns : unlockedRuns;
  const phaseLabel = isGuided ? 'Guided' : 'Free';

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-1.5 px-3"
      style={{ top: 'calc(max(env(safe-area-inset-top), 0.25rem) + 3.25rem)' }}
    >
      <div className="pointer-events-auto flex max-w-full flex-col items-center rounded-lg bg-black/55 px-3 py-1 ring-1 ring-white/[0.09] shadow-lg shadow-black/40 backdrop-blur-md">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] leading-tight text-white/90">
          {name}
        </span>
        {blurb && (
          <span className="mt-0.5 text-[9px] uppercase tracking-[0.18em] leading-tight text-white/55">
            {blurb}
          </span>
        )}
      </div>
      <div
        className={`pointer-events-auto drill-filmstrip flex w-full max-w-md items-stretch gap-1.5 rounded-xl bg-black/55 px-2 py-1.5 ring-1 ring-white/[0.09] shadow-lg shadow-black/40 backdrop-blur-md ${shaking ? 'drill-shake' : ''}`}
      >
        <div className="flex shrink-0 flex-col items-start justify-center pr-0.5">
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
        <div className="flex min-w-0 flex-1 items-stretch gap-1">
          {algorithm.map((m, i) => {
            const status: 'done' | 'active' | 'pending' =
              i < drillState.expectedIndex
                ? 'done'
                : i === drillState.expectedIndex
                  ? 'active'
                  : 'pending';
            return (
              <FilmChip
                key={i}
                label={formatMove(m)}
                index={i + 1}
                status={status}
              />
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
        /* Filmstrip perforations: tiny repeating dots along the top and
           bottom inner edges of the strip. Sits behind the chips so it
           reads as sprocket holes along the frame edges. */
        .drill-filmstrip {
          background-image:
            radial-gradient(circle at 4px 3px, rgba(255,255,255,0.10) 0.9px, transparent 1.2px),
            radial-gradient(circle at 4px calc(100% - 3px), rgba(255,255,255,0.10) 0.9px, transparent 1.2px);
          background-size: 10px 100%, 10px 100%;
          background-repeat: repeat-x, repeat-x;
          background-position: 0 0, 0 100%;
        }
      `}</style>
    </div>
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
    'flex h-8 min-w-0 flex-1 flex-col items-center justify-center rounded-md px-0.5 ring-1 transition-all';
  const style =
    status === 'done'
      ? 'bg-emerald-400/12 text-emerald-200/85 ring-emerald-400/30'
      : status === 'active'
        ? 'bg-amber-300/25 text-amber-50 ring-amber-300/70 shadow-[0_0_14px_rgba(255,191,59,0.5)]'
        : 'bg-white/[0.03] text-white/40 ring-white/[0.06]';
  const numberStyle =
    status === 'done'
      ? 'text-emerald-200/50'
      : status === 'active'
        ? 'text-amber-100/75'
        : 'text-white/25';
  return (
    <div className={`${base} ${style}`}>
      <span className="font-mono text-[11px] font-semibold leading-none tracking-tight">
        {label}
      </span>
      <span className={`mt-[1px] font-mono text-[7px] leading-none tabular-nums ${numberStyle}`}>
        {index}
      </span>
    </div>
  );
}
