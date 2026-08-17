import type { Cubie, CubeState, Move, Vec3 } from '../types/cube';
import {
  IDENTITY,
  applyMat3,
  axisIndex,
  multiplyMat3,
  rotationMatrix,
} from './coordinates';
import { FACE_DEFS } from './notation';

function packId(x: number, y: number, z: number): number {
  return (x + 1) * 9 + (y + 1) * 3 + (z + 1);
}

/**
 * Build a fresh solved cube. The center cubie at (0,0,0) is included in the
 * model for completeness but the rendering layer skips it — this keeps ID
 * indexing (0..26) simple and lets us always look a cubie up by position.
 */
export function createSolvedCube(): CubeState {
  const cubies: Cubie[] = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const pos: Vec3 = [x, y, z];
        cubies.push({
          id: packId(x, y, z),
          home: pos,
          position: pos,
          rotation: IDENTITY,
        });
      }
    }
  }
  return { cubies };
}

/**
 * The set of cubies that participate in a given face move. Used by the
 * animation layer to group affected cubies visually.
 */
export function cubiesForMove(state: CubeState, move: Move): Cubie[] {
  const { axis, layer } = FACE_DEFS[move.face];
  const idx = axisIndex(axis);
  return state.cubies.filter((c) => c.position[idx] === layer);
}

export function applyMove(state: CubeState, move: Move): CubeState {
  const { axis, layer, baseTurns } = FACE_DEFS[move.face];
  const turns =
    move.turns === 2 ? 2 * baseTurns : (move.turns as 1 | -1) * baseTurns;
  const rot = rotationMatrix(axis, turns);
  const idx = axisIndex(axis);
  return {
    cubies: state.cubies.map((c) =>
      c.position[idx] === layer
        ? {
            ...c,
            position: applyMat3(rot, c.position),
            rotation: multiplyMat3(rot, c.rotation),
          }
        : c,
    ),
  };
}

export function applyMoves(state: CubeState, moves: Move[]): CubeState {
  return moves.reduce(applyMove, state);
}

export function cloneCube(state: CubeState): CubeState {
  return {
    cubies: state.cubies.map((c) => ({
      id: c.id,
      home: c.home,
      position: c.position,
      rotation: c.rotation,
    })),
  };
}
