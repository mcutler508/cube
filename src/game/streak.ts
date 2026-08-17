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

/**
 * Human-readable label for a streak. Tiered so short streaks get a subtle
 * "keep going" nudge and long streaks feel earned:
 *   2  → COMBO x2
 *   3  → COMBO x3
 *   4  → ON FIRE
 *   5–7 → ON FIRE xN
 *   8+  → UNSTOPPABLE (with x count for very long runs)
 */
export function streakLabel(streak: number): string | null {
  if (streak < 2) return null;
  if (streak >= 10) return `UNSTOPPABLE x${streak}`;
  if (streak === 8 || streak === 9) return 'UNSTOPPABLE';
  if (streak >= 4) return streak === 4 ? 'ON FIRE' : `ON FIRE x${streak}`;
  return `COMBO x${streak}`;
}

/**
 * 0..1 scalar that quantifies how "hot" the current streak is. Meant for
 * scaling visual/audio intensity — larger toast text, thicker burst gradient,
 * richer audio chord, etc. Saturates at streak 8+.
 */
export function streakIntensity(streak: number): number {
  if (streak <= 1) return 0;
  if (streak >= 8) return 1;
  // Smooth ramp: 2 → 0.15, 3 → 0.30, 4 → 0.45, 5 → 0.60, 6 → 0.72, 7 → 0.86.
  return Math.min(1, (streak - 1) * 0.15);
}
