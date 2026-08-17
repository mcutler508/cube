import type { CubeState } from '../types/cube';
import { computeNet, type FaceLetter, type CubeNet } from '../cube/net';
import { FACE_COLORS } from '../cube/colors';

const EXPECTED_COLOR: Record<FaceLetter, string> = {
  U: FACE_COLORS.up,
  D: FACE_COLORS.down,
  L: FACE_COLORS.left,
  R: FACE_COLORS.right,
  F: FACE_COLORS.front,
  B: FACE_COLORS.back,
};

const ALL_FACES: FaceLetter[] = ['U', 'D', 'L', 'R', 'F', 'B'];

type Cell = readonly [0 | 1 | 2, 0 | 1 | 2];

/** The 5 cells that make up a face's own cross ("+" pattern). */
const CROSS_OWN_CELLS: Cell[] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, 2],
  [2, 1],
];

/**
 * For each face, the 4 side stickers (one per adjacent face) that must also
 * match their own face color for a strict cross per standard cube convention.
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
 * For each face, the 4 adjacent 3-cell "bands" that must match their own face
 * color when this face's entire layer is solved.
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

export interface RowRef {
  face: FaceLetter;
  row: 0 | 1 | 2;
}

/** Encode a row for set-membership comparison. */
export function rowKey(face: FaceLetter, row: 0 | 1 | 2): string {
  return `${face}${row}`;
}

export function faceIsUniform(grid: string[][], expected: string): boolean {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[r][c] !== expected) return false;
    }
  }
  return true;
}

export function rowIsUniform(grid: string[][], row: 0 | 1 | 2, expected: string): boolean {
  const strip = grid[row];
  return strip[0] === expected && strip[1] === expected && strip[2] === expected;
}

export function isCrossOn(net: CubeNet, face: FaceLetter): boolean {
  const own = EXPECTED_COLOR[face];
  const grid = net[face];
  for (const [r, c] of CROSS_OWN_CELLS) {
    if (grid[r][c] !== own) return false;
  }
  for (const { face: adj, cell } of CROSS_ADJACENT_CELLS[face]) {
    if (net[adj][cell[0]][cell[1]] !== EXPECTED_COLOR[adj]) return false;
  }
  return true;
}

export function isLayerOn(net: CubeNet, face: FaceLetter): boolean {
  if (!faceIsUniform(net[face], EXPECTED_COLOR[face])) return false;
  for (const { face: adj, cells } of LAYER_ADJACENT_BANDS[face]) {
    const expected = EXPECTED_COLOR[adj];
    for (const [r, c] of cells) {
      if (net[adj][r][c] !== expected) return false;
    }
  }
  return true;
}

export function isFaceOn(net: CubeNet, face: FaceLetter): boolean {
  return faceIsUniform(net[face], EXPECTED_COLOR[face]);
}

export function isRowOn(net: CubeNet, face: FaceLetter, row: 0 | 1 | 2): boolean {
  return rowIsUniform(net[face], row, EXPECTED_COLOR[face]);
}

/**
 * "Middle layer complete" in beginner-cube parlance: the top layer is fully
 * solved AND the four side-face middle rows (F/B/L/R row 1) are uniform in
 * each face's expected color. Equivalent to: the top two horizontal layers
 * of the cube are correct, with only the bottom layer remaining.
 */
export function isMiddleLayerOn(net: CubeNet): boolean {
  if (!isLayerOn(net, 'U')) return false;
  const sides: FaceLetter[] = ['F', 'B', 'L', 'R'];
  return sides.every((f) => isRowOn(net, f, 1));
}

/**
 * Snapshot of every accomplished sub-goal on the cube. Callers diff two of
 * these to compute newly-completed and newly-broken sets after a move.
 */
export interface DetectionSnapshot {
  faces: FaceLetter[];
  rows: RowRef[];
  crosses: FaceLetter[];
  layers: FaceLetter[];
}

export function detectAll(state: CubeState): DetectionSnapshot {
  const net = computeNet(state);
  const faces: FaceLetter[] = [];
  const rows: RowRef[] = [];
  const crosses: FaceLetter[] = [];
  const layers: FaceLetter[] = [];
  for (const f of ALL_FACES) {
    if (isFaceOn(net, f)) faces.push(f);
    for (const r of [0, 1, 2] as const) {
      if (isRowOn(net, f, r)) rows.push({ face: f, row: r });
    }
    if (isCrossOn(net, f)) crosses.push(f);
    if (isLayerOn(net, f)) layers.push(f);
  }
  return { faces, rows, crosses, layers };
}
