import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { milestoneStatuses } from '../../game/milestones';

/**
 * Progressive solve checklist rendered as a vertical stack in the top-left.
 * Only completed milestones plus the first incomplete one (the "next"
 * objective) are shown — the roadmap reveals itself as the player earns it,
 * with a pop animation on the moment each transitions to done.
 */
export function MilestoneChips() {
  const cubies = useGameStore((s) => s.cubeState.cubies);
  const statuses = useMemo(() => milestoneStatuses({ cubies }), [cubies]);

  const visible = useMemo(() => {
    const out: typeof statuses = [];
    let seenIncomplete = false;
    for (const s of statuses) {
      if (s.done) {
        out.push(s);
      } else if (!seenIncomplete) {
        out.push(s);
        seenIncomplete = true;
      } else {
        break;
      }
    }
    return out;
  }, [statuses]);

  // Detect the incomplete→done transition per milestone so we can trigger a
  // one-shot pop. Snapshot of the previous done-set is stored in a ref.
  const prevDone = useRef<Set<string>>(new Set());
  const [poppingKey, setPoppingKey] = useState<string | null>(null);
  useEffect(() => {
    let newlyDone: string | null = null;
    for (const s of statuses) {
      if (s.done && !prevDone.current.has(s.key)) newlyDone = s.key;
    }
    prevDone.current = new Set(statuses.filter((s) => s.done).map((s) => s.key));
    if (!newlyDone) return;
    setPoppingKey(newlyDone);
    const id = window.setTimeout(() => setPoppingKey(null), 620);
    return () => window.clearTimeout(id);
  }, [statuses]);

  return (
    <div
      className="pointer-events-none absolute left-4 z-10 flex flex-col items-start gap-1.5 sm:left-8"
      style={{ top: 'calc(max(env(safe-area-inset-top), 0.5rem) + 3rem)' }}
    >
      <style>{CHIP_ANIM_CSS}</style>
      {visible.map((s) => (
        <Chip key={s.key} label={s.label} on={s.done} popping={poppingKey === s.key} />
      ))}
    </div>
  );
}

function Chip({ label, on, popping }: { label: string; on: boolean; popping: boolean }) {
  // Enter animation plays only on first mount so re-renders during a game
  // (state changes, chip completions) don't re-trigger the slide-in.
  const [justMounted, setJustMounted] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setJustMounted(false), 380);
    return () => window.clearTimeout(id);
  }, []);

  const animation = popping
    ? 'milestonePop 600ms ease-out'
    : justMounted
      ? 'milestoneEnter 320ms cubic-bezier(0.16, 1, 0.3, 1)'
      : 'none';

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] backdrop-blur',
        on
          ? 'bg-emerald-400/25 text-emerald-100 ring-1 ring-emerald-300/50'
          : 'bg-white/[0.06] text-white/60 ring-1 ring-white/[0.08]',
      ].join(' ')}
      style={{
        animation,
        boxShadow: on ? '0 0 10px rgba(160, 240, 190, 0.35)' : undefined,
      }}
    >
      <span aria-hidden="true" className={on ? 'text-emerald-200' : 'text-white/40'}>
        {on ? '✓' : '·'}
      </span>
      {label}
    </span>
  );
}

const CHIP_ANIM_CSS = `
  @keyframes milestoneEnter {
    from { opacity: 0; transform: translateX(-6px) scale(0.9); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }
  @keyframes milestonePop {
    0% { transform: scale(1); box-shadow: 0 0 10px rgba(160, 240, 190, 0.35); }
    35% { transform: scale(1.15); box-shadow: 0 0 24px rgba(160, 240, 190, 0.95); }
    100% { transform: scale(1); box-shadow: 0 0 10px rgba(160, 240, 190, 0.35); }
  }
`;
