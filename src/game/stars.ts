import type { Level } from './levels/types';

export type StarCount = 1 | 2 | 3;

/**
 * Star rating for a level completion:
 *   3 stars = solved in ≤ expertMoves
 *   2 stars = solved in ≤ parMoves
 *   1 star  = solved (any move count)
 *
 * Time is intentionally not used yet — it becomes a tiebreaker / leaderboard
 * axis in a later sprint. Beginners shouldn't fail on time.
 */
export function computeStars(level: Level, moves: number): StarCount {
  if (moves <= level.expertMoves) return 3;
  if (moves <= level.parMoves) return 2;
  return 1;
}
