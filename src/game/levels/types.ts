import type { Move } from '../../types/cube';
import type { FaceLetter } from '../../cube/net';

/**
 * A discrete goal the player is trying to achieve in a level. The evaluator
 * turns each shape into a boolean over the current cube state — no partial
 * credit at this sprint (partial-progress popups arrive in Sprint 2).
 */
export type Objective =
  | { type: 'complete_face'; face: FaceLetter }
  | { type: 'complete_any_face' }
  | { type: 'complete_row'; face: FaceLetter; row: 0 | 1 | 2 }
  | { type: 'complete_cross'; face: FaceLetter }
  | { type: 'complete_layer'; face: FaceLetter }
  | { type: 'progress_threshold'; threshold: number }
  | { type: 'full_solve' }
  | { type: 'drill_complete' };

export type LevelTier = 'learn' | 'rookie';

/**
 * A forced-sequence practice drill. The player repeats `algorithm` for
 * `guidedRuns` reps with input restricted to the correct next move
 * ("bumpers on"), then again for `unlockedRuns` reps back-to-back with all
 * input allowed — any wrong move resets the unlocked counter to zero.
 *
 * Setup: the drill runs on a solved cube. If the algorithm is a commutator
 * (like R U R' U'), the cube stays legal throughout; otherwise the catalog
 * test would need to relax its "setup produces objective" check.
 */
export interface DrillConfig {
  /** Human-readable label surfaced above the counter (e.g., "Sexy Move"). */
  label: string;
  /** Ordered move sequence the player must execute per rep. */
  algorithm: Move[];
  /** Reps in the guided (bumpers-on) phase. */
  guidedRuns: number;
  /** Reps required back-to-back in the unlocked phase to clear the drill. */
  unlockedRuns: number;
}

export interface Level {
  id: string;
  name: string;
  tier: LevelTier;
  /** Moves applied from solved to produce the starting state. */
  setupMoves: Move[];
  objective: Objective;
  /** Target move count for a two-star finish. Stored now, surfaced in Sprint 4. */
  parMoves: number;
  /** Target move count for a three-star finish. Stored now, surfaced in Sprint 4. */
  expertMoves: number;
  /** When present, the level is an algorithm drill; see DrillConfig. */
  drill?: DrillConfig;
}
