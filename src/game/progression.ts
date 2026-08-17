import { LEVELS } from './levels/catalog';
import type { Level, LevelTier } from './levels/types';
import type { LevelBest } from './persistence';
import { isDailyLevelId } from './daily';

/**
 * Unlock rules (kept intentionally simple for Sprint 5):
 *   - The first level of the first tier is always unlocked.
 *   - Within a tier, level N is unlocked once level N-1 has been completed
 *     at least once (any star count).
 *   - A tier is unlocked once every level in the previous tier has been
 *     completed at least once.
 *
 * This keeps beginners moving forward with a single star each while still
 * gating progression on demonstrated capability.
 */

const TIER_ORDER: LevelTier[] = ['learn', 'rookie'];

function tierLevels(tier: LevelTier): Level[] {
  return LEVELS.filter((l) => l.tier === tier);
}

function isTierComplete(tier: LevelTier, bests: Record<string, LevelBest>): boolean {
  return tierLevels(tier).every((l) => (bests[l.id]?.completions ?? 0) > 0);
}

export function isLevelUnlocked(levelId: string, bests: Record<string, LevelBest>): boolean {
  // Daily challenges are never gated — every player has access every day.
  if (isDailyLevelId(levelId)) return true;
  const level = LEVELS.find((l) => l.id === levelId);
  if (!level) return false;

  // Tier gate: previous tier must be fully cleared.
  const tierIdx = TIER_ORDER.indexOf(level.tier);
  for (let i = 0; i < tierIdx; i++) {
    if (!isTierComplete(TIER_ORDER[i], bests)) return false;
  }

  // Level gate: previous level in the same tier must be completed.
  const inTier = tierLevels(level.tier);
  const idx = inTier.findIndex((l) => l.id === levelId);
  if (idx <= 0) return true; // first level of the tier
  const prev = inTier[idx - 1];
  return (bests[prev.id]?.completions ?? 0) > 0;
}

export interface TierProgress {
  tier: LevelTier;
  completed: number;
  total: number;
}

export function tierProgress(tier: LevelTier, bests: Record<string, LevelBest>): TierProgress {
  const items = tierLevels(tier);
  const completed = items.filter((l) => (bests[l.id]?.completions ?? 0) > 0).length;
  return { tier, completed, total: items.length };
}
