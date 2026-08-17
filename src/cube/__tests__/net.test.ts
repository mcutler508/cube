import { describe, expect, it } from 'vitest';
import { applyMove, applyMoves, createSolvedCube } from '../cubeState';
import { computeNet } from '../net';
import { FACE_COLORS } from '../colors';
import { parseSequence } from '../notation';

describe('cube net derivation', () => {
  it('solved cube: every face is a solid color of the correct hue', () => {
    const net = computeNet(createSolvedCube());
    const expected = {
      U: FACE_COLORS.up,
      D: FACE_COLORS.down,
      L: FACE_COLORS.left,
      R: FACE_COLORS.right,
      F: FACE_COLORS.front,
      B: FACE_COLORS.back,
    };
    for (const [face, color] of Object.entries(expected)) {
      const grid = net[face as keyof typeof expected];
      expect(grid).toHaveLength(3);
      for (const row of grid) {
        expect(row).toHaveLength(3);
        for (const cell of row) {
          expect(cell).toBe(color);
        }
      }
    }
  });

  it('center stickers never change (they define the face color)', () => {
    const scrambled = applyMoves(createSolvedCube(), parseSequence("R U R' U' F2 B L' D"));
    const net = computeNet(scrambled);
    expect(net.U[1][1]).toBe(FACE_COLORS.up);
    expect(net.D[1][1]).toBe(FACE_COLORS.down);
    expect(net.L[1][1]).toBe(FACE_COLORS.left);
    expect(net.R[1][1]).toBe(FACE_COLORS.right);
    expect(net.F[1][1]).toBe(FACE_COLORS.front);
    expect(net.B[1][1]).toBe(FACE_COLORS.back);
  });

  it('after R turn, the F face right column becomes yellow (from D)', () => {
    // A single R turn: the right column of the front face inherits from the
    // right column of the *down* face (which is yellow). Standard cube fact.
    const s = applyMove(createSolvedCube(), { face: 'R', turns: 1 });
    const net = computeNet(s);
    expect(net.F[0][2]).toBe(FACE_COLORS.down);
    expect(net.F[1][2]).toBe(FACE_COLORS.down);
    expect(net.F[2][2]).toBe(FACE_COLORS.down);
  });

  it('after R turn, the U face right column becomes green (from F)', () => {
    const s = applyMove(createSolvedCube(), { face: 'R', turns: 1 });
    const net = computeNet(s);
    expect(net.U[0][2]).toBe(FACE_COLORS.front);
    expect(net.U[1][2]).toBe(FACE_COLORS.front);
    expect(net.U[2][2]).toBe(FACE_COLORS.front);
  });

  it('exactly 9 stickers of each color across all faces (color-preserving invariant)', () => {
    const scrambled = applyMoves(createSolvedCube(), parseSequence("R U R' F' L2 D' B U2 R'"));
    const net = computeNet(scrambled);
    const counts = new Map<string, number>();
    for (const face of Object.values(net)) {
      for (const row of face) {
        for (const cell of row) {
          counts.set(cell, (counts.get(cell) ?? 0) + 1);
        }
      }
    }
    for (const color of Object.values(FACE_COLORS)) {
      expect(counts.get(color)).toBe(9);
    }
  });
});
