import { useGameStore } from '../../store/gameStore';
import { ALGORITHMS } from '../../game/algorithms';

/**
 * Escalating hint text. Each tier of the hint ladder adds one more piece of
 * information without replacing the previous — a beginner who taps hint 4
 * times has milestone + algorithm + palette pulse + preview all visible at
 * once. Text is always at the top of the cube region so the eye finds it.
 */
export function HintPanel() {
  const tier = useGameStore((s) => s.hintTier);
  const milestone = useGameStore((s) => s.hintTargetMilestone);
  const algoId = useGameStore((s) => s.hintTargetAlgorithm);
  const dismissHint = useGameStore((s) => s.dismissHint);

  if (tier === 0) return null;

  const algo = algoId ? ALGORITHMS.find((a) => a.id === algoId) ?? null : null;

  const lines: string[] = [];
  if (milestone) {
    lines.push(`Now: build the ${milestone.toLowerCase()}`);
  }
  if (tier >= 2) {
    if (algo) lines.push(`Try ${algo.name}`);
    else lines.push('Common triggers help — try one from the palette');
  }
  if (tier >= 3 && algo) {
    lines.push('Highlighted in the palette ↓');
  }
  if (tier === 4 && algo) {
    lines.push('Preview showing on the net ↓');
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-10 z-[11] flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-[92%] flex-col items-center gap-0.5 rounded-2xl bg-black/70 px-4 py-2 text-center backdrop-blur-md ring-1 ring-amber-300/25 shadow-lg shadow-amber-500/10">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-amber-200/85">
            Hint · Tier {tier}/4
          </span>
          <button
            type="button"
            onClick={() => dismissHint()}
            className="rounded-full bg-white/10 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/60 hover:bg-white/20 hover:text-white/90"
          >
            Hide
          </button>
        </div>
        {lines.map((l, i) => (
          <div
            key={i}
            className={[
              'text-[11px] font-medium uppercase tracking-[0.14em]',
              i === 0 ? 'text-white' : 'text-white/80',
            ].join(' ')}
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
