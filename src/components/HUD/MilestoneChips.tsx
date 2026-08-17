import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { milestoneStatuses } from '../../game/milestones';

/**
 * Progressive solve checklist. Instead of a raw progress percentage (which
 * can temporarily drop during a valid algorithm), the player sees which
 * meaningful cube structures are currently built. Milestone list lives in
 * game/milestones.ts so the hint system and this UI stay in sync.
 */
export function MilestoneChips() {
  const cubies = useGameStore((s) => s.cubeState.cubies);
  const statuses = useMemo(() => milestoneStatuses({ cubies }), [cubies]);

  return (
    <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5">
      {statuses.map((s) => (
        <Chip key={s.key} label={s.label} on={s.done} />
      ))}
    </div>
  );
}

function Chip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] transition-all duration-300',
        on
          ? 'bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/40'
          : 'bg-white/[0.04] text-white/35 ring-1 ring-white/[0.06]',
      ].join(' ')}
      style={
        on
          ? { boxShadow: '0 0 10px rgba(160, 240, 190, 0.35)' }
          : undefined
      }
    >
      <span aria-hidden="true" className={on ? 'text-emerald-200' : 'text-white/25'}>
        {on ? '✓' : '·'}
      </span>
      {label}
    </span>
  );
}
