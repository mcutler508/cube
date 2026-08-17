import type { IntensityTier } from '../types/game';

/**
 * Map a 0–100 progress percentage to a named tier so the presentation layer
 * has a single source of truth for "how much energy to give this frame". The
 * tiers roughly mirror the design spec: calm, warm, active, heightened, near,
 * and the final solved-flare state.
 */
export function intensityFor(progress: number, isSolved: boolean): IntensityTier {
  if (isSolved) return 'solved';
  if (progress >= 90) return 'near';
  if (progress >= 75) return 'heightened';
  if (progress >= 50) return 'active';
  if (progress >= 25) return 'warm';
  return 'calm';
}

/** A 0..1 "energy" scalar useful for continuously scaling effects (glow, etc). */
export function intensityScalar(progress: number): number {
  return Math.max(0, Math.min(1, progress / 100));
}
