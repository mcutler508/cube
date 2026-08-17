import { useMemo } from 'react';
import { LEVELS } from '../../game/levels/catalog';
import { loadLevel } from '../../game/levels/loader';
import { describeObjective } from '../../game/levels/labels';
import type { Level, LevelTier } from '../../game/levels/types';
import { getAllBests } from '../../game/persistence';
import { isLevelUnlocked, tierProgress } from '../../game/progression';
import { Stars } from '../HUD/Stars';
import type { StarCount } from '../../game/stars';

const TIER_LABEL: Record<LevelTier, string> = {
  learn: 'Learn',
  rookie: 'Rookie',
};

const TIER_TAGLINE: Record<LevelTier, string> = {
  learn: 'Get a feel for the cube',
  rookie: 'Beginner puzzles',
};

/**
 * Landing screen. Groups levels by tier and shows earned stars per card.
 * Locked levels appear dimmed with a lock chip and can't be tapped until
 * their unlock rule (see progression.ts) is met.
 */
export function LevelSelect() {
  const grouped = groupByTier(LEVELS);
  // PBs are read once on mount — LevelSelect is a landing screen, never
  // updates while a level is playing.
  const bests = useMemo(() => getAllBests(), []);
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

        {grouped.map(({ tier, items }) => {
          const prog = tierProgress(tier, bests);
          return (
            <section key={tier} className="mt-8">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-white/85">
                    {TIER_LABEL[tier]}
                  </h2>
                  <span className="text-[10px] font-mono tabular-nums text-white/45">
                    {prog.completed}/{prog.total}
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                  {TIER_TAGLINE[tier]}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {items.map((level, idx) => {
                  const unlocked = isLevelUnlocked(level.id, bests);
                  return (
                    <LevelCard
                      key={level.id}
                      level={level}
                      index={tierIndex(tier, idx)}
                      earnedStars={bests[level.id]?.bestStars ?? null}
                      unlocked={unlocked}
                      onPick={unlocked ? () => loadLevel(level) : undefined}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function LevelCard({
  level,
  index,
  earnedStars,
  unlocked,
  onPick,
}: {
  level: Level;
  index: string;
  earnedStars: StarCount | null;
  unlocked: boolean;
  onPick?: () => void;
}) {
  const dim = !unlocked;
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={!unlocked}
      aria-disabled={!unlocked}
      className={[
        'group flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-left ring-1 ring-white/10 transition-all',
        unlocked
          ? 'hover:bg-white/[0.08] active:scale-[0.98]'
          : 'cursor-not-allowed opacity-55',
      ].join(' ')}
    >
      <div
        className={[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm tabular-nums ring-1 ring-white/10',
          unlocked ? 'bg-white/[0.06] text-white/70' : 'bg-white/[0.03] text-white/35',
        ].join(' ')}
      >
        {unlocked ? index : <LockIcon />}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={[
            'truncate text-sm font-medium',
            unlocked ? 'text-white' : 'text-white/55',
          ].join(' ')}
        >
          {level.name}
        </div>
        <div
          className={[
            'mt-0.5 truncate text-[10px] uppercase tracking-[0.2em]',
            unlocked ? 'text-white/45' : 'text-white/30',
          ].join(' ')}
        >
          {unlocked ? describeObjective(level.objective) : 'Locked'}
        </div>
      </div>
      <div className={['flex flex-col items-end gap-1', dim ? 'opacity-70' : ''].join(' ')}>
        {earnedStars !== null ? (
          <Stars earned={earnedStars} scale={0.5} />
        ) : unlocked ? (
          <div className="text-[9px] uppercase tracking-[0.22em] text-white/25">Unplayed</div>
        ) : (
          <div className="text-[9px] uppercase tracking-[0.22em] text-white/25">—</div>
        )}
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
          Par {level.parMoves}
        </div>
      </div>
    </button>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10.5" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 10.5V7a4 4 0 118 0v3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
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
