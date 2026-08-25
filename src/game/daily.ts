import type { Move } from '../types/cube';
import { generateScramble } from '../cube/scramble';
import type { Level } from './levels/types';

/**
 * Daily challenge — a deterministic scramble derived from the ISO calendar
 * date. Every player on the same day gets the same underlying sequence, but
 * they pick their own difficulty: Casual truncates to a short 5-move scramble
 * so beginners can actually finish, Regular is a mid-length 12, Full is the
 * classic 22-move speedcube scramble.
 *
 * Because Casual/Regular are prefixes of Full (same seed, generateScramble
 * emits deterministically), the three difficulties are conceptually the same
 * puzzle at three depths — a shared daily conversation across skill levels.
 *
 * Wrapped as a synthetic Level so the entire play pipeline (loader, timer,
 * hints, results, PB persistence) works unchanged. PBs are keyed per
 * (date, difficulty) so a beginner's Casual record doesn't collide with an
 * expert's Full record.
 */

export type DailyDifficulty = 'casual' | 'regular' | 'full';

export const DAILY_DIFFICULTIES: DailyDifficulty[] = ['casual', 'regular', 'full'];

/**
 * Scramble depth per difficulty. Casual is short enough that the hint system
 * can always find a fresh path within its BFS budget; Regular is bounded so a
 * halfway-competent solve is achievable in a few minutes; Full matches the
 * standard WCA scramble depth.
 */
export const DAILY_SCRAMBLE_LENGTHS: Record<DailyDifficulty, number> = {
  casual: 5,
  regular: 12,
  full: 22,
};

export const DAILY_DIFFICULTY_LABELS: Record<DailyDifficulty, string> = {
  casual: 'Casual',
  regular: 'Regular',
  full: 'Full',
};

export const DAILY_DIFFICULTY_TAGLINES: Record<DailyDifficulty, string> = {
  casual: '5 moves · anyone can finish',
  regular: '12 moves · a real puzzle',
  full: '22 moves · full solve',
};

/** ISO date "YYYY-MM-DD" for the given Date, in the player's local timezone. */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** djb2 — cheap, well-distributed 32-bit string hash. */
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

/** mulberry32 — compact seeded 32-bit PRNG. Same seed → same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic scramble for a given ISO date + difficulty. Because the seed
 * is only the date (not the difficulty), all three difficulties share the
 * same underlying move sequence — shorter difficulties are prefixes of the
 * full one. That's intentional: a Casual player and a Full player see the
 * same first 5 moves of the same puzzle.
 */
export function dailyScramble(
  dateOrSeed: string,
  difficulty: DailyDifficulty = 'full',
): Move[] {
  const rng = mulberry32(djb2(dateOrSeed));
  return generateScramble(DAILY_SCRAMBLE_LENGTHS[difficulty], rng);
}

/**
 * Build the synthetic Level for a given ISO date + difficulty. Id includes
 * both so PBs are stored per (date, difficulty).
 */
export function dailyLevelFor(iso: string, difficulty: DailyDifficulty = 'regular'): Level {
  return {
    id: `daily-${iso}-${difficulty}`,
    name: `Daily · ${DAILY_DIFFICULTY_LABELS[difficulty]}`,
    tier: 'rookie',
    setupMoves: dailyScramble(iso, difficulty),
    objective: { type: 'full_solve' },
    // Move thresholds scale with scramble depth so star tiers stay meaningful
    // at each difficulty. Casual is trivial to 3-star with any real strategy;
    // Full demands a genuine method.
    parMoves: parForDifficulty(difficulty),
    expertMoves: expertForDifficulty(difficulty),
  };
}

function parForDifficulty(d: DailyDifficulty): number {
  return { casual: 15, regular: 40, full: 80 }[d];
}
function expertForDifficulty(d: DailyDifficulty): number {
  return { casual: 8, regular: 25, full: 40 }[d];
}

export function todaysDaily(
  difficulty: DailyDifficulty = 'regular',
  now: Date = new Date(),
): Level {
  return dailyLevelFor(isoDate(now), difficulty);
}

export function isDailyLevelId(id: string): boolean {
  return id.startsWith('daily-');
}

/** Parse a daily level id into its date + difficulty, or null for other ids. */
export function parseDailyLevelId(
  id: string,
): { iso: string; difficulty: DailyDifficulty } | null {
  const m = id.match(/^daily-(\d{4}-\d{2}-\d{2})-(casual|regular|full)$/);
  if (!m) return null;
  return { iso: m[1], difficulty: m[2] as DailyDifficulty };
}

// ---------------------------------------------------------------------------
// 2x2 daily — the graffiti-collage mode. One length per day (no
// Casual/Regular/Full split); 2x2 God's number is 11 so ~10 quarter turns
// gives a real puzzle without an obvious solve path from inspection.
// ---------------------------------------------------------------------------

const DAILY_2X2_SCRAMBLE_LENGTH = 10;

/**
 * Deterministic 2x2 scramble for a given ISO date. Seeded distinctly from
 * the 3x3 daily so a player who did today's 3x3 doesn't get a scramble that
 * shares a prefix with today's 2x2 (would feel like cheating).
 */
export function daily2x2Scramble(dateOrSeed: string): Move[] {
  const rng = mulberry32(djb2(`2x2-${dateOrSeed}`));
  return generateScramble(DAILY_2X2_SCRAMBLE_LENGTH, rng);
}

export function daily2x2LevelFor(iso: string): Level {
  return {
    id: `daily-2x2-${iso}`,
    name: 'Daily · 2×2',
    tier: 'rookie',
    setupMoves: daily2x2Scramble(iso),
    objective: { type: 'full_solve' },
    // Move thresholds tuned for 2x2: expert speedcubers routinely solve in
    // under 10 moves; a competent beginner lands in the 20-30 range.
    parMoves: 25,
    expertMoves: 12,
    cubeSize: '2x2',
  };
}

export function todaysDaily2x2(now: Date = new Date()): Level {
  return daily2x2LevelFor(isoDate(now));
}

export function isDaily2x2LevelId(id: string): boolean {
  return /^daily-2x2-\d{4}-\d{2}-\d{2}$/.test(id);
}

/** Parse a 2x2 daily id into its date, or null when it doesn't match. */
export function parseDaily2x2LevelId(id: string): { iso: string } | null {
  const m = id.match(/^daily-2x2-(\d{4}-\d{2}-\d{2})$/);
  return m ? { iso: m[1] } : null;
}
