import type { Axis, CubeState, Vec3 } from '../types/cube';
import { applyMat3 } from './coordinates';
import { FACE_COLORS, type StickerSide } from './colors';

export type FaceLetter = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';

/**
 * For each face of the cube, a 3×3 grid of hex colors. Rows go top-to-bottom
 * as you would see the face laid flat in a standard unfolded cross diagram.
 */
export type FaceGrid = string[][];
export type CubeNet = Record<FaceLetter, FaceGrid>;

/** Outward normal of each cube face in cube-local coordinates. */
const FACE_NORMAL: Record<FaceLetter, Vec3> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

/**
 * How each face's 3×3 grid maps to cube-local coordinates. `row` runs top-to-bottom,
 * `col` left-to-right when the face is viewed as drawn in a standard unfolded
 * cross. Each entry is a function (row, col) → cube-local [x, y, z] of the cubie
 * whose sticker lands at (row, col) on that face.
 *
 * The conventions match the classic Singmaster orientation:
 *   - U viewed from above with B at the top of the grid, F at the bottom.
 *   - D viewed from below with F at the top, B at the bottom.
 *   - F/B/L/R viewed head-on: up-face at the top, down-face at the bottom.
 */
const CELL_COORD: Record<FaceLetter, (row: number, col: number) => Vec3> = {
  U: (row, col) => [col - 1, 1, row - 1],
  D: (row, col) => [col - 1, -1, 1 - row],
  F: (row, col) => [col - 1, 1 - row, 1],
  B: (row, col) => [1 - col, 1 - row, -1],
  L: (row, col) => [-1, 1 - row, col - 1],
  R: (row, col) => [1, 1 - row, 1 - col],
};

/** Which axis + sign a cube-local vector points along. */
function axisOf(v: Vec3): { axis: Axis; sign: 1 | -1 } | null {
  const ax = Math.round(v[0]);
  const ay = Math.round(v[1]);
  const az = Math.round(v[2]);
  const abs = [Math.abs(ax), Math.abs(ay), Math.abs(az)];
  if (abs[0] === 1 && abs[1] === 0 && abs[2] === 0) return { axis: 'x', sign: (ax >= 0 ? 1 : -1) };
  if (abs[1] === 1 && abs[0] === 0 && abs[2] === 0) return { axis: 'y', sign: (ay >= 0 ? 1 : -1) };
  if (abs[2] === 1 && abs[0] === 0 && abs[1] === 0) return { axis: 'z', sign: (az >= 0 ? 1 : -1) };
  return null;
}

const AXIS_SIDE: Record<Axis, { pos: StickerSide; neg: StickerSide }> = {
  x: { pos: 'right', neg: 'left' },
  y: { pos: 'up', neg: 'down' },
  z: { pos: 'front', neg: 'back' },
};

/**
 * Transpose of a 3×3 rotation matrix. Since our matrices are always orthogonal
 * (compositions of 90° turns), the transpose equals the inverse — which is
 * what we need to invert a cubie's rotation.
 */
function transpose3(m: readonly number[]): [
  number, number, number,
  number, number, number,
  number, number, number,
] {
  return [
    m[0], m[3], m[6],
    m[1], m[4], m[7],
    m[2], m[5], m[8],
  ];
}

/**
 * For a cubie whose rotation is R, find which of its *original* faces is now
 * pointing in the world/cube-local direction `worldFace`. Returns the sticker
 * side name (which tells us the color).
 */
function stickerFacingDirection(
  rotation: readonly number[],
  worldFace: Vec3,
): StickerSide | null {
  const invR = transpose3(rotation);
  const originalDir = applyMat3(invR as never, worldFace);
  const a = axisOf(originalDir);
  if (!a) return null;
  return a.sign === 1 ? AXIS_SIDE[a.axis].pos : AXIS_SIDE[a.axis].neg;
}

function findCubie(state: CubeState, pos: Vec3) {
  return state.cubies.find(
    (c) => c.position[0] === pos[0] && c.position[1] === pos[1] && c.position[2] === pos[2],
  );
}

/** Compute all six 3×3 face grids from the logical cube state. Accepts an
 *  optional palette so themes can retint the 2D net without touching cube
 *  logic. Defaults to the classic FACE_COLORS palette for callers (and tests)
 *  that don't care about theming. */
export function computeNet(
  state: CubeState,
  palette: Record<StickerSide, string> = FACE_COLORS,
): CubeNet {
  const faces: FaceLetter[] = ['U', 'D', 'L', 'R', 'F', 'B'];
  const net = {} as CubeNet;
  for (const face of faces) {
    const normal = FACE_NORMAL[face];
    const grid: FaceGrid = [];
    for (let row = 0; row < 3; row++) {
      const rowColors: string[] = [];
      for (let col = 0; col < 3; col++) {
        const coord = CELL_COORD[face](row, col);
        const cubie = findCubie(state, coord);
        // Center cubies (of a face) never rotate meaningfully in a face-only
        // move — but corner/edge cubies do. If we can't derive a color, fall
        // back to a neutral tone so the UI never crashes on a bad state.
        if (!cubie) {
          rowColors.push('#111');
          continue;
        }
        const side = stickerFacingDirection(cubie.rotation, normal);
        rowColors.push(side ? palette[side] : '#111');
      }
      grid.push(rowColors);
    }
    net[face] = grid;
  }
  return net;
}
