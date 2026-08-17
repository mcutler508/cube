import { describe, expect, it } from 'vitest';
import { computeStars } from '../stars';
import type { Level } from '../levels/types';

const mkLevel = (par: number, expert: number): Level => ({
  id: 't',
  name: 't',
  tier: 'learn',
  setupMoves: [],
  objective: { type: 'full_solve' },
  parMoves: par,
  expertMoves: expert,
});

describe('computeStars', () => {
  it('returns 3 stars when moves ≤ expert', () => {
    expect(computeStars(mkLevel(5, 3), 1)).toBe(3);
    expect(computeStars(mkLevel(5, 3), 3)).toBe(3);
  });

  it('returns 2 stars when expert < moves ≤ par', () => {
    expect(computeStars(mkLevel(5, 3), 4)).toBe(2);
    expect(computeStars(mkLevel(5, 3), 5)).toBe(2);
  });

  it('returns 1 star when moves > par', () => {
    expect(computeStars(mkLevel(5, 3), 6)).toBe(1);
    expect(computeStars(mkLevel(5, 3), 50)).toBe(1);
  });

  it('handles par == expert (only 1 and 3 stars possible)', () => {
    expect(computeStars(mkLevel(4, 4), 4)).toBe(3);
    expect(computeStars(mkLevel(4, 4), 5)).toBe(1);
  });
});
