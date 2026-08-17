import { useCallback, useEffect, useState } from 'react';
import { moveQueue } from '../../animation/moveController';
import { enqueueUndoMove } from '../../animation/enqueue';
import { exitToMenu, restartCurrentLevel } from '../../game/levels/loader';
import { popHistory, useGameStore } from '../../store/gameStore';
import { ProgressMeter } from './ProgressMeter';
import { SolvedSequence } from './SolvedSequence';
import { StreakBadge } from './StreakBadge';
import { formatElapsed, useLiveTimer } from './useLiveTimer';

/**
 * Shared game controls. Kept as a hook so multiple HUD slots can share the
 * same `busy` subscription and callbacks without prop-drilling.
 */
function useGameControls() {
  const [busy, setBusy] = useState(moveQueue.hasWork());
  useEffect(() => {
    const unsub = moveQueue.subscribe(() => setBusy(moveQueue.hasWork()));
    return () => {
      unsub();
    };
  }, []);

  const onUndo = useCallback(() => {
    if (moveQueue.hasWork()) return;
    if (useGameStore.getState().phase === 'solved') return;
    if (useGameStore.getState().objectiveCompleted) return;
    const inverse = popHistory();
    if (!inverse) return;
    enqueueUndoMove(inverse);
  }, []);

  const onRestart = useCallback(() => {
    if (moveQueue.hasWork()) return;
    restartCurrentLevel();
  }, []);

  const onMenu = useCallback(() => {
    if (moveQueue.hasWork()) return;
    exitToMenu();
  }, []);

  return { busy, onUndo, onRestart, onMenu };
}

/**
 * The top overlay sits inside the cube canvas region and shows the essentials:
 *   - Timer (top-right)
 *   - Progress meter beneath it
 *   - Move count
 *   - Streak badge (when active)
 *   - Objective banner (rendered separately in App.tsx, top-center)
 */
function TopBarSlot() {
  const moveCount = useGameStore((s) => s.moveCount);
  const phase = useGameStore((s) => s.phase);
  const elapsed = useLiveTimer();
  const time = formatElapsed(elapsed);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-end gap-3 px-4 pt-3 sm:px-8"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 3.25rem)' }}
    >
      <div className="flex min-w-[9rem] flex-col items-end gap-1">
        <div
          className="font-mono text-2xl tabular-nums leading-none text-white/95 drop-shadow sm:text-3xl"
          style={{ letterSpacing: '-0.01em' }}
        >
          {time}
        </div>
        <div className="w-40 sm:w-56">
          <ProgressMeter />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/45">
          <span>{moveCount} {moveCount === 1 ? 'move' : 'moves'}</span>
          <span className="text-white/25">•</span>
          <span>{phase === 'solved' ? 'Solved' : phase === 'playing' ? 'Solving' : 'Ready'}</span>
        </div>
        <div className="mt-1">
          <StreakBadge />
        </div>
      </div>
    </div>
  );
}

function BottomBarSlot() {
  const hasHistory = useGameStore((s) => s.history.length > 0);
  const phase = useGameStore((s) => s.phase);
  const objectiveCompleted = useGameStore((s) => s.objectiveCompleted);
  const hintTier = useGameStore((s) => s.hintTier);
  const requestHint = useGameStore((s) => s.requestHint);
  const { busy, onUndo, onRestart, onMenu } = useGameControls();
  const canUndo = hasHistory && phase !== 'solved' && !objectiveCompleted;
  const canHint = phase !== 'solved' && !objectiveCompleted;
  const hintLabel =
    hintTier === 0 ? 'Hint' : hintTier < 4 ? `Hint +` : 'Hide';

  return (
    <div className="mt-3 flex justify-center">
      <div className="flex items-center gap-1.5 rounded-full bg-white/5 p-1.5 ring-1 ring-white/10">
        <HudButton onClick={onMenu} disabled={busy}>
          Menu
        </HudButton>
        <HudButton onClick={onUndo} disabled={!canUndo || busy}>
          Undo
        </HudButton>
        <HudButton
          onClick={() => requestHint()}
          disabled={!canHint || busy}
          highlighted={hintTier > 0}
        >
          {hintLabel}
        </HudButton>
        <HudButton onClick={onRestart} primary disabled={busy}>
          Restart
        </HudButton>
      </div>
    </div>
  );
}

function SolvedOverlaySlot() {
  const phase = useGameStore((s) => s.phase);
  if (phase !== 'solved') return null;
  return <SolvedSequence />;
}

function HudButton({
  children,
  onClick,
  disabled,
  primary,
  highlighted,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  highlighted?: boolean;
}) {
  const base =
    'min-w-[76px] rounded-full px-4 py-3 text-sm font-medium tracking-wide transition-all active:scale-95';
  const style = highlighted
    ? 'bg-amber-300 text-black shadow-lg shadow-amber-500/40 hover:bg-amber-200'
    : primary
      ? 'bg-white text-black shadow-lg shadow-black/40 hover:bg-white/95 disabled:bg-white/40 disabled:text-black/60'
      : 'bg-white/[0.08] text-white/85 hover:bg-white/15 disabled:opacity-40';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${style}`}
    >
      {children}
    </button>
  );
}

export const GameHUD = {
  TopBarSlot,
  BottomBarSlot,
  SolvedOverlaySlot,
};
