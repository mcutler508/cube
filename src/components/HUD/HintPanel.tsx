import { useGameStore } from '../../store/gameStore';
import { formatMove } from '../../cube/notation';

/**
 * Hint text. Shows the concrete next move (from the Kociemba solver, or the
 * canonical level path if the player is still on it) plus the milestone
 * they're working toward. Named-algorithm suggestions ("Try Sledgehammer",
 * palette-pulse, net-preview) are intentionally suppressed — the player
 * asked us to keep hints trigger-agnostic.
 */
export function HintPanel() {
  const tier = useGameStore((s) => s.hintTier);
  const milestone = useGameStore((s) => s.hintTargetMilestone);
  const nextMove = useGameStore((s) => s.hintNextMove);
  const dismissHint = useGameStore((s) => s.dismissHint);

  if (tier === 0) return null;

  const lines: string[] = [];
  if (nextMove) {
    lines.push(`Next move: ${formatMove(nextMove)}`);
  }
  if (milestone) {
    lines.push(`Working toward: ${milestone.toLowerCase()}`);
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
