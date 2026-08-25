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
 * Cube form-factor. `'3x3'` is the standard 26-cubie puzzle; `'2x2'` renders
 * only the 8 corners and treats the puzzle as solved when those 8 corners are
 * back home (edges + centers, still physically present in the engine, are
 * invisible and irrelevant to detection). Absent field means 3x3 for
 * backwards compatibility with every existing level.
 */
export type CubeSize = '2x2' | '3x3';

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
  /** Short name of the algorithm (e.g., "Sexy Move", "Yellow Cross"). */
  name: string;
  /** Optional 4–6 word explanation of what the algorithm does. */
  blurb?: string;
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
  /**
   * Cube form-factor for this level. Defaults to `'3x3'` when unset so every
   * existing level keeps its behavior. `'2x2'` swaps the render (corners
   * only), the solved check (corners only), and hides 3x3-only HUD chrome.
   */
  cubeSize?: CubeSize;
}
