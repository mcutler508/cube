import { describe, expect, it } from 'vitest';
import { applyMoves, createSolvedCube } from '../../cube/cubeState';
import { parseSequence } from '../../cube/notation';
import { LEVELS } from '../levels/catalog';
import { evaluateObjective } from '../levels/evaluator';
import { nextHintMove, solveObjective } from '../solver';

const solved = () => createSolvedCube();
const after = (seq: string) => applyMoves(createSolvedCube(), parseSequence(seq));

describe('solveObjective', () => {
  it('returns empty path when the state already satisfies the objective', () => {
    const path = solveObjective(solved(), { type: 'complete_face', face: 'U' });
    expect(path).toEqual([]);
  });

  it('finds a 1-move solution for a 1-move-away face', () => {
    // R breaks U face; R' (or a couple other moves) restores it.
    const path = solveObjective(after('R'), { type: 'complete_face', face: 'U' });
    expect(path).not.toBeNull();
    expect(path!.length).toBe(1);
    // Verify by application.
    const resolved = applyMoves(after('R'), path!);
    expect(evaluateObjective(resolved, { type: 'complete_face', face: 'U' })).toBe(true);
  });

  it('finds a 2-move solution for a 2-move-away face', () => {
    const path = solveObjective(after('R U'), { type: 'complete_face', face: 'U' });
    expect(path).not.toBeNull();
    expect(path!.length).toBeLessThanOrEqual(2);
    const resolved = applyMoves(after('R U'), path!);
    expect(evaluateObjective(resolved, { type: 'complete_face', face: 'U' })).toBe(true);
  });

  it('returns null when the objective is deeper than maxDepth', () => {
    // Full solve from a 6-move scramble with maxDepth=3 shouldn't find one.
    const scrambled = after("R U R' U' R' F R2");
    const path = solveObjective(scrambled, { type: 'full_solve' }, { maxDepth: 3 });
    expect(path).toBeNull();
  });

  it('nextHintMove returns first move of the solution or null', () => {
    const first = nextHintMove(after('R'), { type: 'complete_face', face: 'U' });
    expect(first).not.toBeNull();
    expect(first!.face).toMatch(/[RLUDFB]/);
  });

  describe('starter catalog solvability at depth 5', () => {
    for (const level of LEVELS) {
      // L6 par 9 is intentionally deeper than our beginner-hint budget; skip it.
      if (level.parMoves > 5) continue;
      it(`${level.id} — hint finds a path within par`, () => {
        const startingState = applyMoves(createSolvedCube(), level.setupMoves);
        const path = solveObjective(startingState, level.objective, { maxDepth: 5 });
        expect(path, `no hint for ${level.id}`).not.toBeNull();
        expect(path!.length).toBeLessThanOrEqual(level.parMoves);
      });
    }
  });
});
