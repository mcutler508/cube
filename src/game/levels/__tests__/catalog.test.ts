import { describe, expect, it } from 'vitest';
import { applyMoves, createSolvedCube } from '../../../cube/cubeState';
import { invertMove } from '../../../cube/notation';
import { LEVELS } from '../catalog';
import { evaluateObjective } from '../evaluator';

/**
 * Catalog invariants. Every shipped level must satisfy these — otherwise
 * beginners will boot into a puzzle that is either already-complete or
 * unsolvable within the advertised move count.
 */
describe('level catalog', () => {
  it('has unique level IDs', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const level of LEVELS) {
    describe(level.id, () => {
      const solved = createSolvedCube();
      const startingState = applyMoves(solved, level.setupMoves);

      it('starting state does not already satisfy the objective', () => {
        // Exception: full_solve on a 0-move setup would be a bug we want to
        // catch; other objectives are checked normally.
        expect(evaluateObjective(startingState, level.objective)).toBe(false);
      });

      it('inverse of setup solves the objective (par is achievable)', () => {
        const inverse = [...level.setupMoves].reverse().map(invertMove);
        const reverted = applyMoves(startingState, inverse);
        expect(evaluateObjective(reverted, level.objective)).toBe(true);
      });

      it('par and expert move counts are reasonable', () => {
        expect(level.parMoves).toBeGreaterThan(0);
        expect(level.expertMoves).toBeGreaterThan(0);
        expect(level.expertMoves).toBeLessThanOrEqual(level.parMoves);
      });
    });
  }
});
