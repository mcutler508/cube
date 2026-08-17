import { describe, expect, it } from 'vitest';
import { isLevelUnlocked, tierProgress } from '../progression';
import { LEVELS } from '../levels/catalog';
import type { LevelBest } from '../persistence';

function mkBest(levelId: string, overrides: Partial<LevelBest> = {}): LevelBest {
  return {
    levelId,
    bestMoves: 5,
    bestTimeMs: 5000,
    bestStars: 1,
    completions: 1,
    updatedAt: 0,
    ...overrides,
  };
}

function bestsFor(...ids: string[]): Record<string, LevelBest> {
  const out: Record<string, LevelBest> = {};
  for (const id of ids) out[id] = mkBest(id);
  return out;
}

describe('isLevelUnlocked', () => {
  it('unlocks the first level of the first tier with no PBs', () => {
    expect(isLevelUnlocked('learn-01-first-turn', {})).toBe(true);
  });

  it('locks subsequent levels until predecessor is completed', () => {
    expect(isLevelUnlocked('learn-02-two-steps', {})).toBe(false);
  });

  it('unlocks the next level once its predecessor is completed', () => {
    expect(
      isLevelUnlocked('learn-02-two-steps', bestsFor('learn-01-first-turn')),
    ).toBe(true);
  });

  it('locks the first level of the second tier until the previous tier is fully cleared', () => {
    const learn = LEVELS.filter((l) => l.tier === 'learn').map((l) => l.id);
    // Only partial learn tier: rookie stays locked.
    expect(isLevelUnlocked('rookie-01-white-cross', bestsFor(learn[0]))).toBe(false);
    // Full learn tier: rookie's first level unlocks.
    expect(isLevelUnlocked('rookie-01-white-cross', bestsFor(...learn))).toBe(true);
  });

  it('returns false for unknown level ids', () => {
    expect(isLevelUnlocked('does-not-exist', {})).toBe(false);
  });
});

describe('tierProgress', () => {
  it('reports 0/N when no levels in the tier are completed', () => {
    const p = tierProgress('learn', {});
    expect(p.completed).toBe(0);
    expect(p.total).toBeGreaterThan(0);
  });

  it('reports N/N when all levels are completed', () => {
    const learn = LEVELS.filter((l) => l.tier === 'learn').map((l) => l.id);
    const p = tierProgress('learn', bestsFor(...learn));
    expect(p.completed).toBe(p.total);
  });
});
