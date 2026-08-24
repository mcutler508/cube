import { findLevel } from './levels/catalog';
import { getLevelBest } from './persistence';
import type { Level } from './levels/types';

/**
 * Ordered list of levels a brand-new user is force-fed before the main game
 * opens up. Kept intentionally trivial (a 1-move solve and a 2-move solve)
 * so anyone can complete them in under a minute and learn the tap gesture.
 */
export const FIRST_RUN_LEVEL_IDS = [
  'learn-01-first-turn',
  'learn-02-two-steps',
] as const;

export type FirstRunLevelId = (typeof FIRST_RUN_LEVEL_IDS)[number];

export function isFirstRunLevelId(id: string): id is FirstRunLevelId {
  return (FIRST_RUN_LEVEL_IDS as readonly string[]).includes(id);
}

/**
 * The next tutorial level the player still owes us, or null once they've
 * cleared both. Uses the PB table as the source of truth: any completion
 * (even via level-select replay after wipe) counts.
 */
export function nextRequiredTutorialLevel(): Level | null {
  for (const id of FIRST_RUN_LEVEL_IDS) {
    if (!getLevelBest(id)) return findLevel(id);
  }
  return null;
}

/**
 * Given the tutorial level the player just finished, return the next
 * tutorial level to auto-advance into, or null when the tutorial is
 * complete (caller should exit to the main menu).
 *
 * Independent of PB write timing — driven purely by position in the
 * FIRST_RUN_LEVEL_IDS array so it's safe to call inside a click handler
 * whether or not recordCompletion() has flushed yet.
 */
export function nextTutorialLevelAfter(currentId: string): Level | null {
  const idx = FIRST_RUN_LEVEL_IDS.indexOf(currentId as FirstRunLevelId);
  if (idx === -1 || idx === FIRST_RUN_LEVEL_IDS.length - 1) return null;
  return findLevel(FIRST_RUN_LEVEL_IDS[idx + 1]);
}
