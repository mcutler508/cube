import { LEVELS } from '../../game/levels/catalog';
import { loadLevel } from '../../game/levels/loader';
import { describeObjective } from '../../game/levels/labels';
import type { Level, LevelTier } from '../../game/levels/types';

const TIER_LABEL: Record<LevelTier, string> = {
  learn: 'Learn',
  rookie: 'Rookie',
};

const TIER_TAGLINE: Record<LevelTier, string> = {
  learn: 'Get a feel for the cube',
  rookie: 'Beginner puzzles',
};

/**
 * Landing screen. Groups levels by tier and lets the player tap into any of
 * them. No lock/unlock gating in Sprint 1 — everything is tappable.
 */
export function LevelSelect() {
  const grouped = groupByTier(LEVELS);
  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto bg-[#08090d] text-white">
      <div
        className="mx-auto flex w-full max-w-lg flex-col px-6 pb-10 pt-10"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 2.5rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 2.5rem)',
        }}
      >
        <div className="text-[10px] uppercase tracking-[0.4em] text-white/50">Cube</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Pick a level
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Short puzzles. Tap in, twist a face, hit the objective.
        </p>

        {grouped.map(({ tier, items }) => (
          <section key={tier} className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-white/85">
                {TIER_LABEL[tier]}
              </h2>
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                {TIER_TAGLINE[tier]}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {items.map((level, idx) => (
                <LevelCard
                  key={level.id}
                  level={level}
                  index={tierIndex(tier, idx)}
                  onPick={() => loadLevel(level)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function LevelCard({
  level,
  index,
  onPick,
}: {
  level: Level;
  index: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-left ring-1 ring-white/10 transition-all hover:bg-white/[0.08] active:scale-[0.98]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] font-mono text-sm tabular-nums text-white/70 ring-1 ring-white/10">
        {index}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{level.name}</div>
        <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.2em] text-white/45">
          {describeObjective(level.objective)}
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
        Par {level.parMoves}
      </div>
    </button>
  );
}

function groupByTier(levels: Level[]): Array<{ tier: LevelTier; items: Level[] }> {
  const order: LevelTier[] = ['learn', 'rookie'];
  return order
    .map((tier) => ({ tier, items: levels.filter((l) => l.tier === tier) }))
    .filter((g) => g.items.length > 0);
}

function tierIndex(_tier: LevelTier, i: number): string {
  return String(i + 1).padStart(2, '0');
}
