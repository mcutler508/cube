/**
 * Given the current streak and the change in progress from the last move,
 * return the new streak value. Rules:
 *   - Positive progress → streak increments.
 *   - Neutral or tiny negative change → streak is preserved (encourages
 *     exploration without punishing the player for setting up a solution).
 *   - Meaningful negative change → streak resets.
 */
export function updateStreak(current: number, progressDelta: number): number {
  if (progressDelta > 0) return current + 1;
  if (progressDelta >= NEUTRAL_FLOOR) return current;
  return 0;
}

/** Deltas at or above this value (i.e., -2 through 0) don't break a streak. */
const NEUTRAL_FLOOR = -2;

/** Human-readable label for a streak (or null if not worth showing). */
export function streakLabel(streak: number): string | null {
  if (streak < 2) return null;
  if (streak >= 8) return 'GREAT FLOW';
  if (streak >= 5) return 'NICE';
  return `x${streak} STREAK`;
}
