import { describe, expect, it } from 'vitest';
import {
  applyMove,
  applyMoves,
  createSolvedCube,
} from '../cubeState';
import { isSolved } from '../solved';
import {
  FACE_LETTERS,
  formatMove,
  formatSequence,
  invertMove,
  parseMove,
  parseSequence,
} from '../notation';
import { generateScramble } from '../scramble';
import type { Move } from '../../types/cube';

describe('cube engine', () => {
  it('starts solved', () => {
    expect(isSolved(createSolvedCube())).toBe(true);
  });

  it('R then R\' returns to solved', () => {
    for (const face of FACE_LETTERS) {
      const s = applyMoves(createSolvedCube(), [
        { face, turns: 1 },
        { face, turns: -1 },
      ]);
      expect(isSolved(s)).toBe(true);
    }
  });

  it('four quarter turns of each face returns to solved', () => {
    for (const face of FACE_LETTERS) {
      const moves: Move[] = Array.from({ length: 4 }, () => ({ face, turns: 1 }));
      expect(isSolved(applyMoves(createSolvedCube(), moves))).toBe(true);
    }
  });

  it('two half turns of each face returns to solved', () => {
    for (const face of FACE_LETTERS) {
      const s = applyMoves(createSolvedCube(), [
        { face, turns: 2 },
        { face, turns: 2 },
      ]);
      expect(isSolved(s)).toBe(true);
    }
  });

  it('a single quarter turn breaks solved state', () => {
    for (const face of FACE_LETTERS) {
      const s = applyMove(createSolvedCube(), { face, turns: 1 });
      expect(isSolved(s)).toBe(false);
    }
  });

  it('a scramble is not solved', () => {
    const s = applyMoves(createSolvedCube(), generateScramble(22));
    expect(isSolved(s)).toBe(false);
  });

  it('applying a scramble and its inverse returns to solved', () => {
    const scramble = generateScramble(22);
    const inverse = [...scramble].reverse().map(invertMove);
    const s = applyMoves(createSolvedCube(), [...scramble, ...inverse]);
    expect(isSolved(s)).toBe(true);
  });

  it('preserves the 26 outer cubies (+ 1 center) after arbitrary moves', () => {
    const s = applyMoves(createSolvedCube(), generateScramble(40));
    expect(s.cubies).toHaveLength(27);
    // each home id should still appear exactly once
    const ids = new Set(s.cubies.map((c) => c.id));
    expect(ids.size).toBe(27);
  });

  it('does not produce duplicate positions', () => {
    const s = applyMoves(createSolvedCube(), generateScramble(40));
    const key = (c: (typeof s.cubies)[number]) => c.position.join(',');
    const positions = new Set(s.cubies.map(key));
    expect(positions.size).toBe(27);
  });

  it('parses and formats move notation round-trip', () => {
    const tokens = ["R", "R'", 'R2', 'U', "U'", 'F2'];
    for (const t of tokens) {
      expect(formatMove(parseMove(t))).toBe(t);
    }
  });

  it('parses/formats sequences', () => {
    const seq = "R U R' U' F2 B'";
    expect(formatSequence(parseSequence(seq))).toBe(seq);
  });

  it('invertMove inverts quarter turns and preserves halves', () => {
    expect(invertMove({ face: 'R', turns: 1 })).toEqual({ face: 'R', turns: -1 });
    expect(invertMove({ face: 'R', turns: -1 })).toEqual({ face: 'R', turns: 1 });
    expect(invertMove({ face: 'R', turns: 2 })).toEqual({ face: 'R', turns: 2 });
  });

  it('classic sexy move (R U R\' U\') six times returns to solved', () => {
    let s = createSolvedCube();
    for (let i = 0; i < 6; i++) {
      s = applyMoves(s, parseSequence("R U R' U'"));
    }
    expect(isSolved(s)).toBe(true);
  });
});
