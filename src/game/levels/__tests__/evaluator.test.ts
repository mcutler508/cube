import { describe, expect, it } from 'vitest';
import { applyMoves, createSolvedCube } from '../../../cube/cubeState';
import { parseSequence } from '../../../cube/notation';
import { evaluateObjective } from '../evaluator';

const solved = () => createSolvedCube();
const after = (seq: string) => applyMoves(createSolvedCube(), parseSequence(seq));

describe('evaluateObjective', () => {
  describe('full_solve', () => {
    it('true on solved cube', () => {
      expect(evaluateObjective(solved(), { type: 'full_solve' })).toBe(true);
    });
    it('false after any move', () => {
      expect(evaluateObjective(after('R'), { type: 'full_solve' })).toBe(false);
    });
  });

  describe('complete_face', () => {
    it('true on solved cube for any face', () => {
      expect(evaluateObjective(solved(), { type: 'complete_face', face: 'U' })).toBe(true);
      expect(evaluateObjective(solved(), { type: 'complete_face', face: 'R' })).toBe(true);
    });
    it('false when the target face has been disrupted', () => {
      // U-turn from solved keeps U itself uniform (rotation of a solid face)
      // but F-turn definitely breaks U.
      expect(evaluateObjective(after('F'), { type: 'complete_face', face: 'U' })).toBe(false);
    });
    it('still true after a U turn (U face stays uniform)', () => {
      expect(evaluateObjective(after('U'), { type: 'complete_face', face: 'U' })).toBe(true);
    });
  });

  describe('complete_any_face', () => {
    it('true on solved cube', () => {
      expect(evaluateObjective(solved(), { type: 'complete_any_face' })).toBe(true);
    });
    it('false when every face has been scrambled', () => {
      // A short scramble that disturbs all 6 faces.
      expect(
        evaluateObjective(after("R U R' U' F R F'"), { type: 'complete_any_face' }),
      ).toBe(false);
    });
  });

  describe('complete_row', () => {
    it('true for every row on solved cube', () => {
      for (const row of [0, 1, 2] as const) {
        expect(evaluateObjective(solved(), { type: 'complete_row', face: 'F', row })).toBe(true);
      }
    });
    it('false when the target row is disrupted', () => {
      // R turn breaks the right column of F, so row 0 of F now has a
      // non-green cell at column 2.
      expect(evaluateObjective(after('R'), { type: 'complete_row', face: 'F', row: 0 })).toBe(false);
    });
  });

  describe('complete_cross', () => {
    it('true on solved cube for any face', () => {
      expect(evaluateObjective(solved(), { type: 'complete_cross', face: 'U' })).toBe(true);
      expect(evaluateObjective(solved(), { type: 'complete_cross', face: 'F' })).toBe(true);
    });
    it('false after a move that disrupts the cross', () => {
      expect(evaluateObjective(after('F'), { type: 'complete_cross', face: 'U' })).toBe(false);
    });
  });

  describe('complete_layer', () => {
    it('true on solved cube for any face', () => {
      expect(evaluateObjective(solved(), { type: 'complete_layer', face: 'U' })).toBe(true);
      expect(evaluateObjective(solved(), { type: 'complete_layer', face: 'D' })).toBe(true);
    });
    it('false when the top layer has been disturbed', () => {
      expect(evaluateObjective(after('F'), { type: 'complete_layer', face: 'U' })).toBe(false);
    });
  });

  describe('progress_threshold', () => {
    it('true on solved cube for any threshold ≤ 100', () => {
      expect(evaluateObjective(solved(), { type: 'progress_threshold', threshold: 100 })).toBe(true);
      expect(evaluateObjective(solved(), { type: 'progress_threshold', threshold: 50 })).toBe(true);
    });
    it('false when progress is well below threshold', () => {
      const scrambled = after("R U R' U' F R F' L D L' D'");
      expect(evaluateObjective(scrambled, { type: 'progress_threshold', threshold: 95 })).toBe(false);
    });
  });
});
