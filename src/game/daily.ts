import type { Move } from '../types/cube';
import { generateScramble } from '../cube/scramble';
import type { Level } from './levels/types';

/**
 * Daily challenge = a deterministic 22-move scramble derived from the ISO
 * calendar date. Every player who opens the app on 2026-08-17 sees the same
 * cube, and tomorrow it changes. Wrapped as a synthetic Level so the entire
 * play pipeline (loader, timer, hints, results, PB persistence) works
 * unchanged.
 */

const DAILY_SCRAMBLE_LENGTH = 22;

/** ISO date "YYYY-MM-DD" for the given Date, in the player's local timezone. */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Hash a string to a 32-bit unsigned int. djb2 — cheap, well-distributed
 * enough for a scramble seed. We don't need cryptographic strength; just
 * "different date → very different scramble".
 */
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * mulberry32 — a compact 32-bit PRNG. Given the same seed it produces the
 * same sequence of floats in [0, 1). Standard choice for seeded RNGs in JS.
 */
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

/** Deterministic scramble for a given ISO date (or arbitrary seed string). */
export function dailyScramble(dateOrSeed: string): Move[] {
  const rng = mulberry32(djb2(dateOrSeed));
  return generateScramble(DAILY_SCRAMBLE_LENGTH, rng);
}

/**
 * Build the synthetic Level representing today's daily challenge. The id is
 * date-scoped ("daily-2026-08-17") so each day gets its own PB record.
 */
export function todaysDaily(now: Date = new Date()): Level {
  const iso = isoDate(now);
  return dailyLevelFor(iso);
}

export function dailyLevelFor(iso: string): Level {
  return {
    id: `daily-${iso}`,
    name: 'Daily Cube',
    tier: 'rookie',
    setupMoves: dailyScramble(iso),
    objective: { type: 'full_solve' },
    // Loose thresholds — a beginner solve is 60–100 moves; skilled is 40–60;
    // speedcubers are ~20. Star tiers are wide so mid-tier finishes still
    // feel rewarded.
    parMoves: 80,
    expertMoves: 40,
  };
}

export function isDailyLevelId(id: string): boolean {
  return id.startsWith('daily-');
}
