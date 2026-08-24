import { useEffect, useMemo, useRef, useState } from 'react';
import type { Level } from '../../game/levels/types';
import { computeStars, type StarCount } from '../../game/stars';
import { getLevelBest, recordCompletion, type LevelBest } from '../../game/persistence';
import {
  exitToMenu,
  loadLevel,
  loadTutorialLevel,
  restartCurrentLevel,
} from '../../game/levels/loader';
import { nextLevel } from '../../game/levels/catalog';
import { nextTutorialLevelAfter } from '../../game/tutorial';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { markTutorialCompleted } from '../../auth/players';
import { Stars } from './Stars';
import { formatElapsed } from './useLiveTimer';

/**
 * Reusable results panel: stars, moves-vs-par, time, NEW BEST marker, actions.
 * Both the objective-complete overlay and the full-solve celebration mount
 * this once — the effect writes the PB exactly once thanks to the ref guard,
 * which matters under React strict-mode double-invocation.
 */
export function LevelResultPanel({
  level,
  moves,
  elapsedMs,
  showNextButton = true,
}: {
  level: Level;
  moves: number;
  elapsedMs: number;
  showNextButton?: boolean;
}) {
  const stars = useMemo(() => computeStars(level, moves), [level, moves]);
  const previousBest = useRef<LevelBest | null>(null);
  const [updated, setUpdated] = useState(false);
  const [merged, setMerged] = useState<LevelBest | null>(null);
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    previousBest.current = getLevelBest(level.id);
    const result = recordCompletion({
      levelId: level.id,
      moves,
      timeMs: elapsedMs,
      stars,
    });
    setUpdated(result.updated);
    setMerged(result.best);
  }, [level.id, moves, elapsedMs, stars]);

  const next = nextLevel(level.id);
  const isFirstEver = previousBest.current === null;
  const showNewBestBanner = updated && !isFirstEver;
  const isTutorialRun = useGameStore((s) => s.isTutorialRun);

  return (
    <div className="pointer-events-auto relative flex w-full max-w-sm flex-col items-center">
      <div className="mt-2">
        <Stars earned={stars} scale={1.15} />
      </div>

      <div className="mt-5 grid w-full grid-cols-2 gap-2 text-center">
        <StatCard
          label="Moves"
          value={String(moves)}
          hint={
            moves <= level.expertMoves
              ? `Expert ≤${level.expertMoves}`
              : moves <= level.parMoves
                ? `Par ≤${level.parMoves}`
                : `Par ${level.parMoves}`
          }
        />
        <StatCard
          label="Time"
          value={formatElapsed(elapsedMs)}
          hint={merged ? `Best ${formatElapsed(merged.bestTimeMs)}` : undefined}
        />
      </div>

      {showNewBestBanner && (
        <div
          className="mt-3 rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-200 ring-1 ring-emerald-300/30"
          style={{ animation: 'popup 380ms ease-out' }}
        >
          New Best
        </div>
      )}
      {isFirstEver && merged && merged.completions === 1 && (
        <div
          className="mt-3 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75 ring-1 ring-white/15"
          style={{ animation: 'popup 380ms ease-out' }}
        >
          First Clear
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {isTutorialRun ? (
          <ActionButton primary onClick={() => advanceTutorial(level.id)}>
            Continue
          </ActionButton>
        ) : (
          <>
            <ActionButton onClick={() => exitToMenu()}>Menu</ActionButton>
            <ActionButton onClick={() => restartCurrentLevel()}>Replay</ActionButton>
            {showNextButton && next && (
              <ActionButton primary onClick={() => loadLevel(next)}>
                Next
              </ActionButton>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10">
      <div className="text-[9px] uppercase tracking-[0.22em] text-white/45">{label}</div>
      <div className="mt-0.5 font-mono text-lg tabular-nums text-white">{value}</div>
      {hint && (
        <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-white/35">
          {hint}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  const base =
    'min-w-[86px] rounded-full px-5 py-2.5 text-sm font-medium tracking-wide transition-all active:scale-95';
  const style = primary
    ? 'bg-white text-black shadow-lg shadow-black/40 hover:bg-white/95'
    : 'bg-white/[0.08] text-white/85 ring-1 ring-white/10 hover:bg-white/15';
  return (
    <button type="button" onClick={onClick} className={`${base} ${style}`}>
      {children}
    </button>
  );
}

function advanceTutorial(currentLevelId: string): void {
  const nextTutorial = nextTutorialLevelAfter(currentLevelId);
  if (nextTutorial) {
    loadTutorialLevel(nextTutorial);
    return;
  }
  // Finished the last tutorial level. Persist completion to the account
  // (best-effort — no need to await; the local flag is set optimistically
  // below so the tutorial gate on the next mount correctly skips) then land
  // on the main menu.
  const player = usePlayerStore.getState().player;
  usePlayerStore.getState().markTutorialCompleted();
  if (player) void markTutorialCompleted(player.id);
  exitToMenu();
}

// Re-export for consumers that only need the stars glyph elsewhere.
export type { StarCount };
