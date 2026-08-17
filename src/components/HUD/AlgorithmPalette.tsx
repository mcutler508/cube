import { useEffect, useState } from 'react';
import { enqueuePlayerMove } from '../../animation/enqueue';
import { moveQueue } from '../../animation/moveController';
import { ALGORITHMS, type Algorithm } from '../../game/algorithms';
import { useGameStore } from '../../store/gameStore';

/**
 * On-screen palette of algorithm triggers. Two-tap interaction:
 *   1. First tap on a button previews the algorithm on the 2D net — changed
 *      cells pulse gold, a "PREVIEW · Sexy Move" label appears above the net.
 *      The cube itself doesn't move yet.
 *   2. Second tap on the SAME button executes the algorithm; the previewed
 *      state becomes reality.
 *   3. Tap a DIFFERENT button to switch the preview to that algorithm.
 *
 * The preview state lives in the store (previewAlgorithmId) so CubeNet can
 * read it without prop drilling. Any player move (drag, undo) clears it.
 */
export function AlgorithmPalette() {
  const [busy, setBusy] = useState(moveQueue.hasWork());
  const phase = useGameStore((s) => s.phase);
  const objectiveCompleted = useGameStore((s) => s.objectiveCompleted);
  const isScrambling = useGameStore((s) => s.isScrambling);
  const previewId = useGameStore((s) => s.previewAlgorithmId);
  const setPreview = useGameStore((s) => s.setPreviewAlgorithm);

  useEffect(() => {
    const unsub = moveQueue.subscribe(() => setBusy(moveQueue.hasWork()));
    return () => {
      unsub();
    };
  }, []);

  const hintTier = useGameStore((s) => s.hintTier);
  const hintTargetAlgorithm = useGameStore((s) => s.hintTargetAlgorithm);

  const disabled = busy || isScrambling || phase === 'solved' || objectiveCompleted;

  const onTap = (algo: Algorithm) => {
    if (moveQueue.hasWork()) return;
    if (previewId === algo.id) {
      // Confirmed — execute the algorithm and clear preview.
      setPreview(null);
      for (const move of algo.moves) {
        enqueuePlayerMove(move);
      }
      return;
    }
    // Preview this one (either first-tap or switching).
    setPreview(algo.id);
  };

  return (
    <div className="mt-2 -mx-2 flex gap-1.5 overflow-x-auto px-2 pb-1">
      {ALGORITHMS.map((algo) => (
        <PaletteButton
          key={algo.id}
          algo={algo}
          disabled={disabled}
          previewing={previewId === algo.id}
          recommended={hintTier >= 3 && hintTargetAlgorithm === algo.id}
          onTap={() => onTap(algo)}
        />
      ))}
    </div>
  );
}

function PaletteButton({
  algo,
  disabled,
  previewing,
  recommended,
  onTap,
}: {
  algo: Algorithm;
  disabled: boolean;
  previewing: boolean;
  recommended: boolean;
  onTap: () => void;
}) {
  const base =
    'shrink-0 rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all active:scale-95 disabled:opacity-40';
  const style = previewing
    ? 'bg-amber-300 text-black shadow-lg shadow-amber-500/30 ring-1 ring-black/10'
    : recommended
      ? 'bg-white/[0.10] text-amber-100 ring-2 ring-amber-300/80'
      : 'bg-white/[0.06] text-white/85 ring-1 ring-white/10 hover:bg-white/[0.12]';
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      className={`${base} ${style}`}
      style={recommended && !previewing ? { animation: 'palettePulse 1.4s ease-in-out infinite' } : undefined}
    >
      {previewing ? `Tap to run · ${algo.name}` : algo.name}
      {recommended && !previewing && (
        <style>{`
          @keyframes palettePulse {
            0%, 100% { box-shadow: 0 0 6px rgba(255, 220, 140, 0.5); }
            50% { box-shadow: 0 0 18px rgba(255, 220, 140, 0.95); }
          }
        `}</style>
      )}
    </button>
  );
}
