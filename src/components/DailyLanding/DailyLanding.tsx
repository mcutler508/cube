import { useMemo, useState } from 'react';
import { getAllBests } from '../../game/persistence';
import {
  DAILY_DIFFICULTIES,
  DAILY_DIFFICULTY_LABELS,
  DAILY_DIFFICULTY_TAGLINES,
  DAILY_SCRAMBLE_LENGTHS,
  daily2x2LevelFor,
  dailyLevelFor,
  isDaily2x2LevelId,
  isDailyLevelId,
  isoDate,
  parseDaily2x2LevelId,
  parseDailyLevelId,
  type DailyDifficulty,
} from '../../game/daily';
import { loadLevel } from '../../game/levels/loader';
import { useGameStore } from '../../store/gameStore';
import { formatElapsed } from '../HUD/useLiveTimer';
import { MenuBackdrop } from '../HUD/MenuBackdrop';
import { Stars } from '../HUD/Stars';
import { PlayerChip } from '../Player/PlayerChip';

/**
 * Primary landing. Pick your difficulty (Casual / Regular / Full — same daily
 * scramble prefix at three depths), see today's PB for that difficulty, tap
 * to play. Also shows all-time best for the selected difficulty plus a total
 * days-played counter across all difficulties.
 */
type DailyMode = '3x3' | '2x2';

export function DailyLanding() {
  const setMenuView = useGameStore((s) => s.setMenuView);
  const [mode, setMode] = useState<DailyMode>('3x3');
  const [difficulty, setDifficulty] = useState<DailyDifficulty>('regular');
  const bests = useMemo(() => getAllBests(), []);
  const today = useMemo(() => isoDate(), []);
  const level = useMemo(
    () =>
      mode === '2x2'
        ? daily2x2LevelFor(today)
        : dailyLevelFor(today, difficulty),
    [mode, today, difficulty],
  );
  const todaysBest = bests[level.id];
  // Scramble length shown in the play CTA. 2x2 daily is a fixed length; 3x3
  // reads from the difficulty table.
  const scrambleLen = mode === '2x2' ? level.setupMoves.length : DAILY_SCRAMBLE_LENGTHS[difficulty];

  const allTimeBest = useMemo(() => {
    let bestMs = Infinity;
    let bestDate: string | null = null;
    for (const key of Object.keys(bests)) {
      let iso: string | null = null;
      if (mode === '2x2') {
        const parsed = parseDaily2x2LevelId(key);
        if (parsed) iso = parsed.iso;
      } else {
        const parsed = parseDailyLevelId(key);
        if (parsed && parsed.difficulty === difficulty) iso = parsed.iso;
      }
      if (!iso) continue;
      const b = bests[key];
      if (b.bestTimeMs < bestMs) {
        bestMs = b.bestTimeMs;
        bestDate = iso;
      }
    }
    return bestDate ? { ms: bestMs, date: bestDate } : null;
  }, [bests, difficulty, mode]);

  // Days played counts unique dates where ANY daily (3x3 any difficulty or
  // 2x2) was completed.
  const dayCount = useMemo(() => {
    const dates = new Set<string>();
    for (const key of Object.keys(bests)) {
      if (isDaily2x2LevelId(key)) {
        const p = parseDaily2x2LevelId(key);
        if (p) dates.add(p.iso);
        continue;
      }
      if (!isDailyLevelId(key)) continue;
      const parsed = parseDailyLevelId(key);
      if (parsed) dates.add(parsed.iso);
    }
    return dates.size;
  }, [bests]);

  return (
    <MenuBackdrop>
      <div
        className="mx-auto flex w-full max-w-lg flex-col px-6 pb-10 pt-10"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 2.5rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 2.5rem)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-[10px] uppercase tracking-[0.4em] text-white/50">Cube</div>
          <PlayerChip />
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Today's Cube
        </h1>
        <p className="mt-1 text-sm text-white/55">
          Same puzzle for everyone. Pick your depth.
        </p>

        {/* Mode picker: 3x3 (classic daily) or 2x2 (single-length graffiti). */}
        <div className="mt-6 flex gap-1 rounded-full bg-white/[0.05] p-1 ring-1 ring-white/10">
          {(['3x3', '2x2'] as const).map((m) => {
            const active = m === mode;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={[
                  'flex-1 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all',
                  active
                    ? 'bg-white text-black shadow'
                    : 'text-white/60 hover:text-white/85',
                ].join(' ')}
              >
                {m === '3x3' ? '3×3' : '2×2'}
              </button>
            );
          })}
        </div>

        {mode === '3x3' ? (
          <>
            {/* Difficulty picker (3x3 only — 2x2 is a single fixed length) */}
            <div className="mt-3 flex gap-1 rounded-full bg-white/[0.05] p-1 ring-1 ring-white/10">
              {DAILY_DIFFICULTIES.map((d) => {
                const active = d === difficulty;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={[
                      'flex-1 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all',
                      active
                        ? 'bg-white text-black shadow'
                        : 'text-white/60 hover:text-white/85',
                    ].join(' ')}
                  >
                    {DAILY_DIFFICULTY_LABELS[d]}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 text-center text-[10px] uppercase tracking-[0.22em] text-white/40">
              {DAILY_DIFFICULTY_TAGLINES[difficulty]}
            </div>
          </>
        ) : (
          <div className="mt-3 text-center text-[10px] uppercase tracking-[0.22em] text-white/40">
            Graffiti collage · 8 corners · line up the primary color
          </div>
        )}

        {/* Play CTA */}
        <button
          type="button"
          onClick={() => loadLevel(level)}
          className="mt-5 flex w-full items-center justify-between rounded-2xl bg-white px-5 py-5 text-left text-black shadow-lg shadow-black/40 transition-all active:scale-[0.99]"
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/55">
              {today} · {scrambleLen} moves
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

        <div className="mt-4 grid grid-cols-2 gap-2">
          <StatCard
            label={mode === '2x2' ? 'Best 2×2' : `Best ${DAILY_DIFFICULTY_LABELS[difficulty]}`}
            value={allTimeBest ? formatElapsed(allTimeBest.ms) : '—'}
            hint={allTimeBest?.date}
          />
          <StatCard
            label="Days played"
            value={String(dayCount)}
            hint={dayCount === 0 ? 'Start your streak' : 'And counting'}
          />
        </div>

        <div className="mt-8 flex flex-col gap-2">
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
          <button
            type="button"
            onClick={() => setMenuView('algos')}
            className="flex w-full items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-4 text-left ring-1 ring-white/10 transition-all hover:bg-white/[0.08] active:scale-[0.99]"
          >
            <div>
              <div className="text-sm font-medium text-white">
                Algorithms
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-white/40">
                Triggers to chain during a solve
              </div>
            </div>
            <span className="text-white/40">→</span>
          </button>
          <button
            type="button"
            onClick={() => setMenuView('fidget')}
            className="flex w-full items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-4 text-left ring-1 ring-white/10 transition-all hover:bg-white/[0.08] active:scale-[0.99]"
          >
            <div>
              <div className="text-sm font-medium text-white">Fidget</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-white/40">
                Swipe an iridescent cube for a bit
              </div>
            </div>
            <span className="text-white/40">→</span>
          </button>
        </div>
      </div>
    </MenuBackdrop>
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
