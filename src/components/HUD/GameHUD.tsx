import { useCallback, useEffect, useState } from 'react';
import { moveQueue } from '../../animation/moveController';
import { enqueueScrambleMoves, enqueueUndoMove } from '../../animation/enqueue';
import { DIFFICULTY_CONFIGS } from '../../game/difficulty';
import { generateScramble } from '../../cube/scramble';
import { popHistory, useGameStore } from '../../store/gameStore';
import type { Difficulty } from '../../types/game';
import { DifficultyPicker } from './DifficultyPicker';
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

  const startScrambleWith = useCallback((difficulty: Difficulty) => {
    if (moveQueue.hasWork()) return;
    const store = useGameStore.getState();
    store.reset();
    store.setDifficulty(difficulty);
    store.beginScramble();
    const config = DIFFICULTY_CONFIGS[difficulty];
    const length = randomInt(config.scrambleMin, config.scrambleMax);
    enqueueScrambleMoves(generateScramble(length));
    const unsub = moveQueue.subscribe(() => {
      if (!moveQueue.hasWork()) {
        useGameStore.getState().endScramble();
        unsub();
      }
    });
  }, []);

  const onUndo = useCallback(() => {
    if (moveQueue.hasWork()) return;
    if (useGameStore.getState().phase === 'solved') return;
    const inverse = popHistory();
    if (!inverse) return;
    enqueueUndoMove(inverse);
  }, []);

  const onReset = useCallback(() => {
    if (moveQueue.hasWork()) return;
    useGameStore.getState().reset();
  }, []);

  return { busy, startScrambleWith, onUndo, onReset };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * The top overlay sits inside the cube canvas region and shows the essentials:
 *   - Timer (biggest, top-right)
 *   - Progress meter beneath it (thin energy line)
 *   - Move count (small, below meter)
 *   - Difficulty chip (top-left)
 *   - Streak badge (floating below timer, only when active)
 */
function TopBarSlot() {
  const moveCount = useGameStore((s) => s.moveCount);
  const phase = useGameStore((s) => s.phase);
  const difficulty = useGameStore((s) => s.difficulty);
  const elapsed = useLiveTimer();
  const time = formatElapsed(elapsed);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-4 pt-3 sm:px-8"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}
    >
      <div className="flex flex-col items-start gap-1.5">
        <div className="rounded-2xl bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/65 backdrop-blur-md">
          {DIFFICULTY_CONFIGS[difficulty].label}
          <span className="ml-2 text-white/35">
            {phase === 'solved' ? 'Solved' : phase === 'playing' ? 'Solving' : 'Ready'}
          </span>
        </div>
      </div>
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
        </div>
        <div className="mt-1">
          <StreakBadge />
        </div>
      </div>
    </div>
  );
}

function BottomBarSlot() {
  const isScrambling = useGameStore((s) => s.isScrambling);
  const hasHistory = useGameStore((s) => s.history.length > 0);
  const phase = useGameStore((s) => s.phase);
  const currentDifficulty = useGameStore((s) => s.difficulty);
  const { busy, startScrambleWith, onUndo, onReset } = useGameControls();
  const canUndo = hasHistory && phase !== 'solved';
  const [pickerOpen, setPickerOpen] = useState(false);

  const openPicker = useCallback(() => {
    if (busy) return;
    setPickerOpen(true);
  }, [busy]);
  // Dev-only: allow `?picker=1` to auto-open the difficulty modal so it's
  // easy to iterate on visually. Silent no-op in prod.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('picker') === '1' && import.meta.env.DEV) setPickerOpen(true);
  }, []);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const pickAndScramble = useCallback(
    (d: Difficulty) => {
      setPickerOpen(false);
      startScrambleWith(d);
    },
    [startScrambleWith],
  );

  return (
    <>
      <div className="mt-3 flex justify-center">
        <div className="flex items-center gap-2 rounded-full bg-white/5 p-1.5 ring-1 ring-white/10">
          <HudButton onClick={onUndo} disabled={!canUndo || busy}>
            Undo
          </HudButton>
          <HudButton onClick={openPicker} primary disabled={busy}>
            {isScrambling ? 'Scrambling…' : 'Scramble'}
          </HudButton>
          <HudButton onClick={onReset} disabled={busy}>
            Reset
          </HudButton>
        </div>
      </div>
      {pickerOpen && (
        <DifficultyPicker
          currentDifficulty={currentDifficulty}
          onPick={pickAndScramble}
          onClose={closePicker}
        />
      )}
    </>
  );
}

function SolvedOverlaySlot() {
  const phase = useGameStore((s) => s.phase);
  const { startScrambleWith } = useGameControls();
  if (phase !== 'solved') return null;
  return <SolvedSequence onAgain={(d) => startScrambleWith(d)} />;
}

function HudButton({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const base =
    'min-w-[92px] rounded-full px-5 py-3 text-sm font-medium tracking-wide transition-all active:scale-95';
  const style = primary
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
