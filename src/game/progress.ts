import { IDENTITY, mat3Equal, vec3Equal } from '../cube/coordinates';
// vec3Equal is used below (import kept even if the tree-shaker complains).
import type { CubeState } from '../types/cube';
import type { CubeProgress } from '../types/game';
import { computeNet, type FaceLetter } from '../cube/net';
import { FACE_COLORS } from '../cube/colors';

/**
 * True for the 7 cubies whose "identity" is fixed by the geometry: the six
 * face centers and the invisible core. They don't move under face turns, so
 * counting them would make every scramble start at ~35% and inflate progress.
 */
function isFixedCenter(home: readonly [number, number, number]): boolean {
  const zeros = (home[0] === 0 ? 1 : 0) + (home[1] === 0 ? 1 : 0) + (home[2] === 0 ? 1 : 0);
  return zeros >= 2;
}

/**
 * Which of the six faces are currently solid-colored (one hue across all 9
 * stickers). Uses the same derivation as the visible 2D net so what the player
 * sees matches what the engine reports.
 */
export function solvedFaces(state: CubeState): FaceLetter[] {
  const net = computeNet(state);
  const faces: FaceLetter[] = ['U', 'D', 'L', 'R', 'F', 'B'];
  const out: FaceLetter[] = [];
  for (const f of faces) {
    const grid = net[f];
    const first = grid[0][0];
    let uniform = true;
    for (let r = 0; r < 3 && uniform; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[r][c] !== first) {
          uniform = false;
          break;
        }
      }
    }
    if (uniform && first === EXPECTED_COLOR[f]) out.push(f);
  }
  return out;
}

const EXPECTED_COLOR: Record<FaceLetter, string> = {
  U: FACE_COLORS.up,
  D: FACE_COLORS.down,
  L: FACE_COLORS.left,
  R: FACE_COLORS.right,
  F: FACE_COLORS.front,
  B: FACE_COLORS.back,
};

/**
 * Weighted cubie-correctness progress. For each of the 20 non-center cubies:
 *   +2 pts if positioned + oriented correctly, +1 if positioned only.
 * Plus a +3 pt bonus per fully solved face (nudges the score up as faces close
 * out, which happens naturally near the end of a solve).
 *
 * Max = 20 × 2 + 6 × 3 = 58 raw points, normalized to 0–100. The score changes
 * by at most a few points per single-face turn, so it never jumps wildly.
 */
export function evaluateProgress(state: CubeState): CubeProgress {
  let solvedCubies = 0;
  let orientedCubies = 0;
  let cubiePoints = 0;
  for (const c of state.cubies) {
    if (isFixedCenter(c.home)) continue;
    const positioned = vec3Equal(c.position, c.home);
    const oriented = mat3Equal(c.rotation, IDENTITY);
    if (positioned) {
      solvedCubies += 1;
      if (oriented) {
        orientedCubies += 1;
        cubiePoints += 2;
      } else {
        cubiePoints += 1;
      }
    }
  }
  const faces = solvedFaces(state);
  const facePoints = faces.length * 3;
  const raw = cubiePoints + facePoints;
  const MAX = 20 * 2 + 6 * 3; // = 58
  const percentage = Math.round((raw / MAX) * 100);
  return {
    percentage: Math.max(0, Math.min(100, percentage)),
    solvedCubies,
    orientedCubies,
    solvedFaces: faces,
  };
}
