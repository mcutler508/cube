import { describe, expect, it } from 'vitest';
import {
  dailyLevelFor,
  dailyScramble,
  isDailyLevelId,
  isoDate,
  mulberry32,
} from '../daily';
import { applyMoves, createSolvedCube } from '../../cube/cubeState';
import { isSolved } from '../../cube/solved';

describe('daily challenge', () => {
  it('mulberry32 produces the same sequence for the same seed', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('mulberry32 diverges for different seeds', () => {
    const a = mulberry32(1234);
    const b = mulberry32(5678);
    let diverged = false;
    for (let i = 0; i < 10; i++) {
      if (a() !== b()) {
        diverged = true;
        break;
      }
    }
    expect(diverged).toBe(true);
  });

  it('dailyScramble is deterministic for the same date', () => {
    const s1 = dailyScramble('2026-08-17');
    const s2 = dailyScramble('2026-08-17');
    expect(s1).toEqual(s2);
  });

  it('dailyScramble differs across consecutive days', () => {
    const s1 = dailyScramble('2026-08-17');
    const s2 = dailyScramble('2026-08-18');
    expect(s1).not.toEqual(s2);
  });

  it('dailyScramble produces a genuinely scrambled cube', () => {
    const scramble = dailyScramble('2026-08-17');
    expect(scramble.length).toBeGreaterThan(15);
    const scrambled = applyMoves(createSolvedCube(), scramble);
    expect(isSolved(scrambled)).toBe(false);
  });

  it('isoDate formats YYYY-MM-DD', () => {
    // Use UTC noon to sidestep timezone edge cases in CI.
    const d = new Date(Date.UTC(2026, 7, 17, 12, 0, 0));
    expect(isoDate(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('dailyLevelFor produces a valid Level with full_solve objective', () => {
    const level = dailyLevelFor('2026-08-17');
    expect(level.id).toBe('daily-2026-08-17');
    expect(level.objective).toEqual({ type: 'full_solve' });
    expect(level.setupMoves.length).toBeGreaterThan(0);
  });

  it('isDailyLevelId identifies daily-prefixed IDs', () => {
    expect(isDailyLevelId('daily-2026-08-17')).toBe(true);
    expect(isDailyLevelId('learn-01-first-turn')).toBe(false);
  });
});
