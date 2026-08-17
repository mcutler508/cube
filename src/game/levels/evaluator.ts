import type { CubeState } from '../../types/cube';
import { computeNet, type FaceLetter } from '../../cube/net';
import { FACE_COLORS } from '../../cube/colors';
import { isSolved } from '../../cube/solved';
import { evaluateProgress } from '../progress';
import type { Objective } from './types';

const EXPECTED_COLOR: Record<FaceLetter, string> = {
  U: FACE_COLORS.up,
  D: FACE_COLORS.down,
  L: FACE_COLORS.left,
  R: FACE_COLORS.right,
  F: FACE_COLORS.front,
  B: FACE_COLORS.back,
};

type Cell = readonly [0 | 1 | 2, 0 | 1 | 2];

/** The 5 cells (center + 4 edges) that form the "+" on any face's own grid. */
const CROSS_OWN_CELLS: Cell[] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, 2],
  [2, 1],
];

/**
 * For each face, the 4 side stickers of the edges that make up its cross.
 * These are the cells on the ADJACENT faces that must also match their own
 * face color for a strict cross (per standard cube-solving convention).
 */
const CROSS_ADJACENT_CELLS: Record<FaceLetter, Array<{ face: FaceLetter; cell: Cell }>> = {
  U: [
    { face: 'F', cell: [0, 1] },
    { face: 'B', cell: [0, 1] },
    { face: 'L', cell: [0, 1] },
    { face: 'R', cell: [0, 1] },
  ],
  D: [
    { face: 'F', cell: [2, 1] },
    { face: 'B', cell: [2, 1] },
    { face: 'L', cell: [2, 1] },
    { face: 'R', cell: [2, 1] },
  ],
  F: [
    { face: 'U', cell: [2, 1] },
    { face: 'D', cell: [0, 1] },
    { face: 'L', cell: [1, 2] },
    { face: 'R', cell: [1, 0] },
  ],
  B: [
    { face: 'U', cell: [0, 1] },
    { face: 'D', cell: [2, 1] },
    { face: 'L', cell: [1, 0] },
    { face: 'R', cell: [1, 2] },
  ],
  L: [
    { face: 'U', cell: [1, 0] },
    { face: 'D', cell: [1, 0] },
    { face: 'F', cell: [1, 0] },
    { face: 'B', cell: [1, 2] },
  ],
  R: [
    { face: 'U', cell: [1, 2] },
    { face: 'D', cell: [1, 2] },
    { face: 'F', cell: [1, 2] },
    { face: 'B', cell: [1, 0] },
  ],
};

/**
 * For each face, the 4 "bands" of cells on adjacent faces that must match
 * their own face color when this face's layer is fully solved. Each band is
 * a list of 3 cells on one adjacent face (the row or column closest to the
 * layer face).
 */
const LAYER_ADJACENT_BANDS: Record<FaceLetter, Array<{ face: FaceLetter; cells: Cell[] }>> = {
  U: [
    { face: 'F', cells: [[0, 0], [0, 1], [0, 2]] },
    { face: 'B', cells: [[0, 0], [0, 1], [0, 2]] },
    { face: 'L', cells: [[0, 0], [0, 1], [0, 2]] },
    { face: 'R', cells: [[0, 0], [0, 1], [0, 2]] },
  ],
  D: [
    { face: 'F', cells: [[2, 0], [2, 1], [2, 2]] },
    { face: 'B', cells: [[2, 0], [2, 1], [2, 2]] },
    { face: 'L', cells: [[2, 0], [2, 1], [2, 2]] },
    { face: 'R', cells: [[2, 0], [2, 1], [2, 2]] },
  ],
  F: [
    { face: 'U', cells: [[2, 0], [2, 1], [2, 2]] },
    { face: 'D', cells: [[0, 0], [0, 1], [0, 2]] },
    { face: 'L', cells: [[0, 2], [1, 2], [2, 2]] },
    { face: 'R', cells: [[0, 0], [1, 0], [2, 0]] },
  ],
  B: [
    { face: 'U', cells: [[0, 0], [0, 1], [0, 2]] },
    { face: 'D', cells: [[2, 0], [2, 1], [2, 2]] },
    { face: 'L', cells: [[0, 0], [1, 0], [2, 0]] },
    { face: 'R', cells: [[0, 2], [1, 2], [2, 2]] },
  ],
  L: [
    { face: 'U', cells: [[0, 0], [1, 0], [2, 0]] },
    { face: 'D', cells: [[0, 0], [1, 0], [2, 0]] },
    { face: 'F', cells: [[0, 0], [1, 0], [2, 0]] },
    { face: 'B', cells: [[0, 2], [1, 2], [2, 2]] },
  ],
  R: [
    { face: 'U', cells: [[0, 2], [1, 2], [2, 2]] },
    { face: 'D', cells: [[0, 2], [1, 2], [2, 2]] },
    { face: 'F', cells: [[0, 2], [1, 2], [2, 2]] },
    { face: 'B', cells: [[0, 0], [1, 0], [2, 0]] },
  ],
};

function faceIsUniform(grid: string[][], expected: string): boolean {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[r][c] !== expected) return false;
    }
  }
  return true;
}

export function evaluateObjective(state: CubeState, objective: Objective): boolean {
  switch (objective.type) {
    case 'full_solve':
      return isSolved(state);

    case 'complete_face': {
      const net = computeNet(state);
      return faceIsUniform(net[objective.face], EXPECTED_COLOR[objective.face]);
    }

    case 'complete_any_face': {
      const net = computeNet(state);
      for (const f of ['U', 'D', 'L', 'R', 'F', 'B'] as FaceLetter[]) {
        if (faceIsUniform(net[f], EXPECTED_COLOR[f])) return true;
      }
      return false;
    }

    case 'complete_row': {
      const net = computeNet(state);
      const row = net[objective.face][objective.row];
      const expected = EXPECTED_COLOR[objective.face];
      return row.every((c) => c === expected);
    }

    case 'complete_cross': {
      const net = computeNet(state);
      const own = EXPECTED_COLOR[objective.face];
      const ownGrid = net[objective.face];
      for (const [r, c] of CROSS_OWN_CELLS) {
        if (ownGrid[r][c] !== own) return false;
      }
      for (const { face, cell } of CROSS_ADJACENT_CELLS[objective.face]) {
        if (net[face][cell[0]][cell[1]] !== EXPECTED_COLOR[face]) return false;
      }
      return true;
    }

    case 'complete_layer': {
      const net = computeNet(state);
      if (!faceIsUniform(net[objective.face], EXPECTED_COLOR[objective.face])) return false;
      for (const { face, cells } of LAYER_ADJACENT_BANDS[objective.face]) {
        const expected = EXPECTED_COLOR[face];
        for (const [r, c] of cells) {
          if (net[face][r][c] !== expected) return false;
        }
      }
      return true;
    }

    case 'progress_threshold':
      return evaluateProgress(state).percentage >= objective.threshold;
  }
}
