import { describe, expect, it } from 'vitest';
import {
  DAILY_SCRAMBLE_LENGTHS,
  daily2x2LevelFor,
  daily2x2Scramble,
  dailyLevelFor,
  dailyScramble,
  isDaily2x2LevelId,
  isDailyLevelId,
  isoDate,
  mulberry32,
  parseDaily2x2LevelId,
  parseDailyLevelId,
} from '../daily';
import { applyMoves, createSolvedCube } from '../../cube/cubeState';
import { invertMove } from '../../cube/notation';
import { isSolved, isSolved2x2 } from '../../cube/solved';

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

  it('dailyScramble is deterministic for the same date and difficulty', () => {
    const s1 = dailyScramble('2026-08-17', 'full');
    const s2 = dailyScramble('2026-08-17', 'full');
    expect(s1).toEqual(s2);
  });

  it('dailyScramble differs across consecutive days', () => {
    const s1 = dailyScramble('2026-08-17', 'full');
    const s2 = dailyScramble('2026-08-18', 'full');
    expect(s1).not.toEqual(s2);
  });

  it('dailyScramble produces a genuinely scrambled cube', () => {
    const scramble = dailyScramble('2026-08-17', 'full');
    expect(scramble.length).toBe(DAILY_SCRAMBLE_LENGTHS.full);
    const scrambled = applyMoves(createSolvedCube(), scramble);
    expect(isSolved(scrambled)).toBe(false);
  });

  it('shorter difficulties are prefixes of the longer ones (shared puzzle)', () => {
    const iso = '2026-08-17';
    const casual = dailyScramble(iso, 'casual');
    const regular = dailyScramble(iso, 'regular');
    const full = dailyScramble(iso, 'full');
    expect(casual.length).toBe(DAILY_SCRAMBLE_LENGTHS.casual);
    expect(regular.length).toBe(DAILY_SCRAMBLE_LENGTHS.regular);
    expect(full.length).toBe(DAILY_SCRAMBLE_LENGTHS.full);
    expect(regular.slice(0, casual.length)).toEqual(casual);
    expect(full.slice(0, regular.length)).toEqual(regular);
  });

  it('isoDate formats YYYY-MM-DD', () => {
    // Use UTC noon to sidestep timezone edge cases in CI.
    const d = new Date(Date.UTC(2026, 7, 17, 12, 0, 0));
    expect(isoDate(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('dailyLevelFor id encodes date and difficulty', () => {
    expect(dailyLevelFor('2026-08-17', 'casual').id).toBe('daily-2026-08-17-casual');
    expect(dailyLevelFor('2026-08-17', 'regular').id).toBe('daily-2026-08-17-regular');
    expect(dailyLevelFor('2026-08-17', 'full').id).toBe('daily-2026-08-17-full');
  });

  it('dailyLevelFor sets full_solve objective and non-empty setup', () => {
    const level = dailyLevelFor('2026-08-17', 'casual');
    expect(level.objective).toEqual({ type: 'full_solve' });
    expect(level.setupMoves.length).toBe(DAILY_SCRAMBLE_LENGTHS.casual);
  });

  it('isDailyLevelId identifies daily-prefixed IDs', () => {
    expect(isDailyLevelId('daily-2026-08-17-casual')).toBe(true);
    expect(isDailyLevelId('daily-2026-08-17-full')).toBe(true);
    expect(isDailyLevelId('learn-01-first-turn')).toBe(false);
  });

  it('parseDailyLevelId round-trips', () => {
    expect(parseDailyLevelId('daily-2026-08-17-casual')).toEqual({
      iso: '2026-08-17',
      difficulty: 'casual',
    });
    expect(parseDailyLevelId('daily-2026-08-17-full')).toEqual({
      iso: '2026-08-17',
      difficulty: 'full',
    });
    expect(parseDailyLevelId('learn-01-first-turn')).toBeNull();
    // Old-format daily ids without difficulty suffix don't parse.
    expect(parseDailyLevelId('daily-2026-08-17')).toBeNull();
  });

  it('daily 2x2 scramble is deterministic and non-trivial', () => {
    const a = daily2x2Scramble('2026-08-17');
    const b = daily2x2Scramble('2026-08-17');
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    const cube = applyMoves(createSolvedCube(), a);
    // Solved-check on 8 corners must fail — otherwise the scramble is a no-op.
    expect(isSolved2x2(cube)).toBe(false);
  });

  it('daily 2x2 scramble differs from same-date 3x3 scramble', () => {
    const iso = '2026-08-17';
    expect(daily2x2Scramble(iso)).not.toEqual(
      dailyScramble(iso, 'casual').slice(0, daily2x2Scramble(iso).length),
    );
  });

  it('daily2x2LevelFor produces a 2x2 level that unwinds to solved', () => {
    const level = daily2x2LevelFor('2026-08-17');
    expect(level.id).toBe('daily-2x2-2026-08-17');
    expect(level.cubeSize).toBe('2x2');
    expect(level.objective).toEqual({ type: 'full_solve' });
    // Applying the inverse of the setup moves must land back at a
    // corners-solved cube — otherwise the daily is unsolvable in principle.
    const scrambled = applyMoves(createSolvedCube(), level.setupMoves);
    const solved = applyMoves(
      scrambled,
      [...level.setupMoves].reverse().map(invertMove),
    );
    expect(isSolved2x2(solved)).toBe(true);
  });

  it('2x2 daily id helpers identify and parse only 2x2 ids', () => {
    expect(isDaily2x2LevelId('daily-2x2-2026-08-17')).toBe(true);
    expect(isDaily2x2LevelId('daily-2026-08-17-casual')).toBe(false);
    expect(parseDaily2x2LevelId('daily-2x2-2026-08-17')).toEqual({
      iso: '2026-08-17',
    });
    expect(parseDaily2x2LevelId('daily-2026-08-17-casual')).toBeNull();
  });
});
