import { useMemo } from 'react';
import { getAllBests } from '../../game/persistence';
import { isDailyLevelId, isoDate, todaysDaily } from '../../game/daily';
import { loadLevel } from '../../game/levels/loader';
import { useGameStore } from '../../store/gameStore';
import { formatElapsed } from '../HUD/useLiveTimer';
import { Stars } from '../HUD/Stars';

/**
 * Primary landing: today's Daily Cube CTA + personal-best snapshot + a small
 * link into the Learn tier for players who need a tutorial arc first.
 *
 * The scramble is deterministic per calendar day, so the "today's puzzle" is
 * the same for every player on the same day — no backend required.
 */
export function DailyLanding() {
  const setMenuView = useGameStore((s) => s.setMenuView);
  const today = useMemo(() => todaysDaily(), []);
  const bests = useMemo(() => getAllBests(), []);
  const todaysBest = bests[today.id];

  // All-time best solve time across every daily attempt the player has ever
  // completed. Ignores learn/rookie level times so the number reflects real
  // full-cube solves only.
  const allTimeBest = useMemo(() => {
    let bestMs = Infinity;
    let bestDate: string | null = null;
    for (const key of Object.keys(bests)) {
      if (!isDailyLevelId(key)) continue;
      const b = bests[key];
      if (b.bestTimeMs < bestMs) {
        bestMs = b.bestTimeMs;
        bestDate = key.replace(/^daily-/, '');
      }
    }
    return bestDate ? { ms: bestMs, date: bestDate } : null;
  }, [bests]);

  const dayCount = useMemo(
    () => Object.keys(bests).filter((k) => isDailyLevelId(k)).length,
    [bests],
  );

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
          Today's Cube
        </h1>
        <p className="mt-1 text-sm text-white/55">
          Same scramble for everyone. New puzzle every day.
        </p>

        <button
          type="button"
          onClick={() => loadLevel(today)}
          className="mt-8 flex w-full items-center justify-between rounded-2xl bg-white px-5 py-5 text-left text-black shadow-lg shadow-black/40 transition-all active:scale-[0.99]"
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/55">
              {isoDate()}
            </span>
            <span className="mt-1 text-xl font-semibold">
              {todaysBest ? 'Play again' : 'Solve today'}
            </span>
            {todaysBest && (
              <span className="mt-1 text-[11px] uppercase tracking-[0.22em] text-black/50">
                Best today · {formatElapsed(todaysBest.bestTimeMs)} · {todaysBest.bestMoves} moves
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {todaysBest && <Stars earned={todaysBest.bestStars} scale={0.55} />}
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/55">
              →
            </span>
          </div>
        </button>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <StatCard
            label="All-time best"
            value={allTimeBest ? formatElapsed(allTimeBest.ms) : '—'}
            hint={allTimeBest?.date}
          />
          <StatCard
            label="Days played"
            value={String(dayCount)}
            hint={dayCount === 0 ? 'Start your streak' : 'And counting'}
          />
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => setMenuView('learn')}
            className="flex w-full items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-4 text-left ring-1 ring-white/10 transition-all hover:bg-white/[0.08] active:scale-[0.99]"
          >
            <div>
              <div className="text-sm font-medium text-white">
                Learn to solve
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-white/40">
                Short puzzles that teach the moves
              </div>
            </div>
            <span className="text-white/40">→</span>
          </button>
        </div>
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
    <div className="rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10">
      <div className="text-[9px] uppercase tracking-[0.22em] text-white/45">{label}</div>
      <div className="mt-0.5 font-mono text-xl tabular-nums text-white">{value}</div>
      {hint && (
        <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-white/35">
          {hint}
        </div>
      )}
    </div>
  );
}
