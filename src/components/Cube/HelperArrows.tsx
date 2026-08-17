import { useEffect, useState } from 'react';
import { getHint } from '../../game/hint';
import { getDifficultyConfig } from '../../game/difficulty';
import { useGameStore } from '../../store/gameStore';
import type { Move } from '../../types/cube';
import { formatMove } from '../../cube/notation';

/**
 * Placeholder helper-arrow rendering. When a solver is installed via
 * `setHintProvider`, this component will show a small floating badge with the
 * suggested move (e.g. "R'") and eventually a directional glyph on the layer.
 *
 * Currently the default hint provider returns null, so this renders nothing
 * — the plumbing is here, the visual polish and per-face arrow overlays land
 * with the real solver.
 */
export function HelperArrows() {
  const difficulty = useGameStore((s) => s.difficulty);
  const phase = useGameStore((s) => s.phase);
  const cubies = useGameStore((s) => s.cubeState.cubies);
  const config = getDifficultyConfig(difficulty);

  const [hint, setHint] = useState<Move | null>(null);
  useEffect(() => {
    if (!config.helperArrows || phase === 'solved') {
      setHint(null);
      return;
    }
    // Recompute the hint whenever the cube state changes. Runs synchronously
    // for now (stub returns null quickly); once a real solver lands this
    // should probably move to a worker.
    setHint(getHint({ cubies }));
  }, [cubies, config.helperArrows, phase]);

  if (!config.helperArrows) return null;
  if (!hint) return null;

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-3 z-[6] -translate-x-1/2 select-none rounded-full bg-white/90 px-3 py-1 text-xs font-mono text-black shadow-lg"
      style={{ animation: 'hintpop 260ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      Try {formatMove(hint)}
      <style>{`
        @keyframes hintpop {
          from { opacity: 0; transform: translate(-50%, -6px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
