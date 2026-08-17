import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { describeObjective } from '../../game/levels/labels';
import {
  exitToMenu,
  loadLevel,
  restartCurrentLevel,
} from '../../game/levels/loader';
import { nextLevel } from '../../game/levels/catalog';
import { formatElapsed } from './useLiveTimer';

/**
 * Non-full-solve objective completion overlay. Renders when the player has
 * satisfied the level objective (e.g. completed the white face) but the cube
 * itself isn't fully solved. Full-solve objectives are handled by the existing
 * SolvedSequence — this overlay stays out of the way to avoid double-celebration.
 */
export function ObjectiveCompleteOverlay() {
  const level = useGameStore((s) => s.currentLevel);
  const objectiveCompleted = useGameStore((s) => s.objectiveCompleted);
  const phase = useGameStore((s) => s.phase);
  const moves = useGameStore((s) => s.moveCount);
  const startedAt = useGameStore((s) => s.startedAt);

  const [stage, setStage] = useState<0 | 1>(0);
  const shouldShow = objectiveCompleted && phase !== 'solved' && level != null;

  useEffect(() => {
    if (!shouldShow) {
      setStage(0);
      return;
    }
    const t = window.setTimeout(() => setStage(1), 320);
    return () => window.clearTimeout(t);
  }, [shouldShow]);

  if (!shouldShow || !level) return null;

  const elapsedMs = startedAt != null ? performance.now() - startedAt : 0;
  const next = nextLevel(level.id);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md animate-[fadein_320ms_ease-out]" />
      <div className="pointer-events-auto relative flex w-full max-w-sm flex-col items-center px-6 py-6">
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.4em] text-emerald-300/90"
          style={{ animation: 'popup 320ms ease-out' }}
        >
          Objective Complete
        </div>
        <div
          className="mt-3 select-none text-center font-semibold text-white"
          style={{
            fontSize: 'clamp(1.6rem, 5.5vw, 2.4rem)',
            lineHeight: 1.1,
            letterSpacing: '0.02em',
            textShadow: '0 0 24px rgba(255,255,255,0.2)',
            animation: 'popup 420ms ease-out',
          }}
        >
          {describeObjective(level.objective)}
        </div>

        {stage >= 1 && (
          <div
            className="mt-5 grid w-full grid-cols-2 gap-2 text-center"
            style={{ animation: 'popup 320ms ease-out' }}
          >
            <StatCard label="Moves" value={String(moves)} />
            <StatCard label="Time" value={formatElapsed(elapsedMs)} />
          </div>
        )}

        {stage >= 1 && (
          <div
            className="mt-5 flex flex-wrap items-center justify-center gap-2"
            style={{ animation: 'popup 400ms ease-out' }}
          >
            <OverlayButton onClick={() => exitToMenu()}>Menu</OverlayButton>
            <OverlayButton onClick={() => restartCurrentLevel()}>Replay</OverlayButton>
            {next && (
              <OverlayButton primary onClick={() => loadLevel(next)}>
                Next
              </OverlayButton>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popup {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10">
      <div className="text-[9px] uppercase tracking-[0.22em] text-white/45">{label}</div>
      <div className="mt-0.5 font-mono text-lg tabular-nums text-white">{value}</div>
    </div>
  );
}

function OverlayButton({
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
