import { findLevel } from './levels/catalog';
import { getLevelBest } from './persistence';
import type { Level } from './levels/types';
import type { Player } from '../store/playerStore';

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
 * cleared both.
 *
 * When a player is signed in, the account's tutorial_completed flag is the
 * canonical source of truth — a brand-new account always sees the tutorial,
 * even in a browser that already ran it under a different account.
 *
 * When there's no player (auth-less builds), we fall back to the local PB
 * table so users on offline / dev builds can still bypass a completed
 * tutorial across page reloads.
 */
export function nextRequiredTutorialLevel(player: Player | null): Level | null {
  if (player) {
    if (player.tutorialCompleted) return null;
    // Fresh account — always route through level 1. The Continue button
    // chains onward from there; local PB is deliberately ignored so a fresh
    // account gets a fresh onboarding.
    return findLevel(FIRST_RUN_LEVEL_IDS[0]);
  }
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
