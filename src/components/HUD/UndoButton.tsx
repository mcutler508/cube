import { useEffect, useState } from 'react';
import { moveQueue } from '../../animation/moveController';
import { enqueueUndoMove } from '../../animation/enqueue';
import { popHistory, useGameStore } from '../../store/gameStore';

/**
 * Bottom-left undo affordance. Always mounted so its position is stable;
 * dims to a subtle disabled state when there's nothing to undo or the app
 * is mid-animation / already solved.
 */
export function UndoButton() {
  const hasHistory = useGameStore((s) => s.history.length > 0);
  const phase = useGameStore((s) => s.phase);
  const objectiveCompleted = useGameStore((s) => s.objectiveCompleted);

  const [busy, setBusy] = useState(moveQueue.hasWork());
  useEffect(() => {
    const unsub = moveQueue.subscribe(() => setBusy(moveQueue.hasWork()));
    return () => {
      unsub();
    };
  }, []);

  const disabled =
    !hasHistory || busy || phase === 'solved' || objectiveCompleted;

  const onClick = () => {
    if (disabled) return;
    const inverse = popHistory();
    if (!inverse) return;
    enqueueUndoMove(inverse);
  };

  return (
    <div
      className="pointer-events-none absolute bottom-3 left-4 z-20 sm:left-8"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label="Undo last move"
        disabled={disabled}
        className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/[0.08] backdrop-blur-md transition-all active:scale-95 ${
          disabled
            ? 'text-white/30 opacity-40'
            : 'text-white/85 hover:bg-white/[0.12] hover:text-white'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M4.5 9a4.5 4.5 0 1 1 1.32 3.18"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
          <path
            d="M4.5 5v4H8.5"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
