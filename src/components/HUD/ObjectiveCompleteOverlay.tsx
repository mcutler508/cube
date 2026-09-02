import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { describeObjective } from '../../game/levels/labels';
import { LevelResultPanel } from './LevelResultPanel';

/**
 * Non-full-solve objective completion overlay. Renders when the player has
 * satisfied the level objective (e.g. completed the white face) but the cube
 * itself isn't fully solved. Full-solve objectives are handled by the
 * existing SolvedSequence — this overlay stays out of the way to avoid
 * double-celebration.
 */
export function ObjectiveCompleteOverlay() {
  const level = useGameStore((s) => s.currentLevel);
  const objectiveCompleted = useGameStore((s) => s.objectiveCompleted);
  const phase = useGameStore((s) => s.phase);
  const moves = useGameStore((s) => s.moveCount);
  const startedAt = useGameStore((s) => s.startedAt);

  const [snapshot, setSnapshot] = useState<{ moves: number; elapsedMs: number } | null>(null);
  const shouldShow = objectiveCompleted && phase !== 'solved' && level != null;

  useEffect(() => {
    if (!shouldShow) {
      setSnapshot(null);
      return;
    }
    // Snapshot the completion once so the timer freezes as the overlay opens.
    setSnapshot({
      moves,
      elapsedMs: startedAt != null ? performance.now() - startedAt : 0,
    });
    // Intentionally exclude `moves`/`startedAt` — we only snapshot on the
    // rising edge of `shouldShow` and hold that value until the overlay closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow]);

  if (!shouldShow || !level || !snapshot) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center px-6">
      <div
        className="absolute inset-0 animate-[fadein_320ms_ease-out]"
        style={{
          background: 'rgba(6,8,12,0.55)',
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        }}
      />
      <div
        className="premium-panel pointer-events-auto relative flex w-full max-w-sm flex-col items-center px-6 py-6"
        style={{ animation: 'panelIn 320ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
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

        <LevelResultPanel
          level={level}
          moves={snapshot.moves}
          elapsedMs={snapshot.elapsedMs}
        />
      </div>
      <style>{`
        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popup {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  );
}
