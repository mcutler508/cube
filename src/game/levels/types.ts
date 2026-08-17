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
  | { type: 'full_solve' };

export type LevelTier = 'learn' | 'rookie';

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
}
