import { parseSequence } from '../../cube/notation';
import type { Level } from './types';

/**
 * Ordered list of starter levels. Each `setupMoves` sequence is applied from
 * a solved cube to produce the level's starting state. Because setups are
 * short (≤6 moves), applying their inverse is guaranteed to satisfy the
 * objective — that invariant is checked in catalog.test.ts.
 *
 * Par / expert move counts are stored but not surfaced until Sprint 4.
 */
export const LEVELS: Level[] = [
  {
    id: 'learn-01-first-turn',
    name: 'First Turn',
    tier: 'learn',
    setupMoves: parseSequence('R'),
    objective: { type: 'complete_face', face: 'U' },
    parMoves: 1,
    expertMoves: 1,
  },
  {
    id: 'learn-02-two-steps',
    name: 'Two Steps',
    tier: 'learn',
    setupMoves: parseSequence('R U'),
    objective: { type: 'complete_face', face: 'U' },
    parMoves: 2,
    expertMoves: 2,
  },
  {
    id: 'learn-03-find-a-face',
    name: 'Find a Face',
    tier: 'learn',
    setupMoves: parseSequence("R' U'"),
    objective: { type: 'complete_any_face' },
    parMoves: 2,
    expertMoves: 1,
  },
  {
    id: 'learn-04-white-corners',
    name: 'White Corners',
    tier: 'learn',
    // Drill runs on a solved cube: R U R' U' is a commutator that returns
    // the cube to solved after 6 reps, so we don't need a scramble.
    setupMoves: [],
    objective: { type: 'drill_complete' },
    parMoves: 24, // 6 reps × 4 moves
    expertMoves: 24,
    drill: {
      label: 'Right-Hand Trigger (R U R′ U′)',
      algorithm: parseSequence("R U R' U'"),
      guidedRuns: 2,
      unlockedRuns: 4,
    },
  },
  {
    id: 'learn-05-middle-layer-right',
    name: 'Middle Layer — Right',
    tier: 'learn',
    // Middle-layer edge insertion isn't a commutator; the cube ends up
    // scrambled after 6 reps. That's fine for muscle memory — the drill
    // tracks completion via drillState, not cube state.
    setupMoves: [],
    objective: { type: 'drill_complete' },
    parMoves: 48, // 6 reps × 8 moves
    expertMoves: 48,
    drill: {
      label: 'Right Insert (U R U′ R′ U′ F′ U F)',
      algorithm: parseSequence("U R U' R' U' F' U F"),
      guidedRuns: 2,
      unlockedRuns: 4,
    },
  },
  {
    id: 'learn-06-middle-layer-left',
    name: 'Middle Layer — Left',
    tier: 'learn',
    setupMoves: [],
    objective: { type: 'drill_complete' },
    parMoves: 48,
    expertMoves: 48,
    drill: {
      label: 'Left Insert (U′ L′ U L U F U′ F′)',
      algorithm: parseSequence("U' L' U L U F U' F'"),
      guidedRuns: 2,
      unlockedRuns: 4,
    },
  },
  {
    id: 'rookie-01-white-cross',
    name: 'White Cross',
    tier: 'rookie',
    setupMoves: parseSequence("F U R'"),
    objective: { type: 'complete_cross', face: 'U' },
    parMoves: 3,
    expertMoves: 3,
  },
  {
    id: 'rookie-02-finish-top',
    name: 'Finish the Top',
    tier: 'rookie',
    setupMoves: parseSequence("R U R' U'"),
    objective: { type: 'complete_layer', face: 'U' },
    parMoves: 4,
    expertMoves: 4,
  },
  {
    id: 'rookie-03-getting-warmer',
    name: 'Getting Warmer',
    tier: 'rookie',
    setupMoves: parseSequence("R U R' U' R' F R2 U' R'"),
    objective: { type: 'full_solve' },
    parMoves: 9,
    expertMoves: 9,
  },
];

export function findLevel(id: string): Level | null {
  return LEVELS.find((l) => l.id === id) ?? null;
}

export function nextLevel(id: string): Level | null {
  const idx = LEVELS.findIndex((l) => l.id === id);
  if (idx === -1 || idx === LEVELS.length - 1) return null;
  return LEVELS[idx + 1];
}
