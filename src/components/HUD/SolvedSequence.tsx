import { useEffect, useState } from 'react';
import { DIFFICULTY_CONFIGS } from '../../game/difficulty';
import { useGameStore } from '../../store/gameStore';
import type { Difficulty } from '../../types/game';
import { formatElapsed } from './useLiveTimer';
import {
  exitToMenu,
  loadLevel,
  restartCurrentLevel,
} from '../../game/levels/loader';
import { nextLevel } from '../../game/levels/catalog';

interface Props {
  onAgain: (d: Difficulty) => void;
}

/**
 * The arcade-style completion sequence. It runs through a couple of stages so
 * the moment lands:
 *   0. brief flash-in of the SOLVED word
 *   1. stats appear
 *   2. difficulty picker to go again
 *
 * We keep it under control — one screen, no particle storms, no confetti sheets.
 */
export function SolvedSequence({ onAgain }: Props) {
  const startedAt = useGameStore((s) => s.startedAt);
  const endedAt = useGameStore((s) => s.endedAt);
  const moves = useGameStore((s) => s.moveCount);
  const difficulty = useGameStore((s) => s.difficulty);
  const bestStreak = useGameStore((s) => s.bestStreak);
  const currentDifficulty = useGameStore((s) => s.difficulty);
  const currentLevel = useGameStore((s) => s.currentLevel);
  const elapsedMs = startedAt !== null && endedAt !== null ? endedAt - startedAt : 0;

  const [stage, setStage] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    const t1 = window.setTimeout(() => setStage(1), 380);
    const t2 = window.setTimeout(() => setStage(2), 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const score = computeScore(elapsedMs, moves, difficulty);
  const config = DIFFICULTY_CONFIGS[difficulty];

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      {/* backdrop wash */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadein_500ms_ease-out]" />
      {/* radial burst */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(255,255,255,0.18) 0%, rgba(60,220,140,0.08) 30%, transparent 60%)',
          animation: 'solveburst 900ms ease-out',
        }}
      />
      <div className="pointer-events-auto relative flex w-full max-w-md flex-col items-center px-6 py-6">
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.4em] text-emerald-300/90"
          style={{ animation: 'popup 400ms ease-out' }}
        >
          Cube Solved
        </div>
        <div
          className="mt-2 select-none text-center font-semibold text-white"
          style={{
            fontSize: 'clamp(3.5rem, 12vw, 5.5rem)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textShadow: '0 0 40px rgba(255,255,255,0.28)',
            animation: 'solvedbig 520ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          SOLVED
        </div>

        {stage >= 1 && (
          <div
            className="mt-6 grid w-full grid-cols-3 gap-2 text-center"
            style={{ animation: 'popup 380ms ease-out' }}
          >
            <StatCard label="Time" value={formatElapsed(elapsedMs)} accent />
            <StatCard label="Moves" value={String(moves)} />
            <StatCard label="Score" value={String(score)} />
          </div>
        )}
        {stage >= 1 && (
          <div
            className="mt-2 grid w-full grid-cols-2 gap-2 text-center"
            style={{ animation: 'popup 480ms ease-out' }}
          >
            <StatCard label="Difficulty" value={config.label} />
            <StatCard label="Best Streak" value={`×${bestStreak}`} />
          </div>
        )}

        {stage >= 2 && currentLevel && (
          <LevelActions levelId={currentLevel.id} />
        )}
        {stage >= 2 && !currentLevel && (
          <div
            className="mt-5 flex flex-wrap items-center justify-center gap-2"
            style={{ animation: 'popup 400ms ease-out' }}
          >
            {(['easy', 'normal', 'hard', 'master'] as Difficulty[]).map((d) => {
              const isCurrent = d === currentDifficulty;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onAgain(d)}
                  className={[
                    'rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-all active:scale-95',
                    isCurrent
                      ? 'bg-white text-black shadow-lg shadow-black/40'
                      : 'bg-white/8 text-white/80 ring-1 ring-white/10 hover:bg-white/15',
                  ].join(' ')}
                >
                  {DIFFICULTY_CONFIGS[d].label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes solveburst {
          0% { opacity: 0; transform: scale(0.6); }
          40% { opacity: 1; }
          100% { opacity: 0.6; transform: scale(1); }
        }
        @keyframes solvedbig {
          0% { opacity: 0; transform: translateY(24px) scale(0.7); letter-spacing: 0.1em; filter: blur(6px); }
          60% { opacity: 1; transform: translateY(0) scale(1.05); letter-spacing: -0.01em; filter: blur(0); }
          100% { transform: scale(1); letter-spacing: -0.02em; }
        }
        @keyframes popup {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function LevelActions({ levelId }: { levelId: string }) {
  const next = nextLevel(levelId);
  return (
    <div
      className="mt-5 flex flex-wrap items-center justify-center gap-2"
      style={{ animation: 'popup 400ms ease-out' }}
    >
      <ActionButton onClick={() => exitToMenu()}>Menu</ActionButton>
      <ActionButton onClick={() => restartCurrentLevel()}>Replay</ActionButton>
      {next && (
        <ActionButton primary onClick={() => loadLevel(next)}>
          Next
        </ActionButton>
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

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        'rounded-2xl px-3 py-2.5 ring-1',
        accent
          ? 'bg-white/[0.08] ring-white/20'
          : 'bg-white/[0.04] ring-white/10',
      ].join(' ')}
    >
      <div className="text-[9px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-lg tabular-nums text-white">{value}</div>
    </div>
  );
}

/**
 * Score = (base − time_penalty − move_penalty) × difficulty multiplier, floored at 100.
 * Rewards fast solves in few moves, especially at higher difficulty.
 */
function computeScore(elapsedMs: number, moves: number, difficulty: Difficulty): number {
  const mult = DIFFICULTY_CONFIGS[difficulty].scoreMultiplier;
  const base = 10000;
  const timePenalty = Math.floor(elapsedMs / 100); // 10 pts per second
  const movePenalty = moves * 30;
  const raw = Math.max(100, base - timePenalty - movePenalty);
  return Math.round(raw * mult);
}
