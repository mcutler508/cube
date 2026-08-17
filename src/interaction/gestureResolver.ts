import * as THREE from 'three';
import type { Axis, FaceLetter, Move, Vec3 } from '../types/cube';

/**
 * Round a nearly-axis-aligned unit vector to the exact axis and sign it points to.
 * Returns { axis, sign } where axis is 'x'|'y'|'z' and sign is +1 or -1.
 */
export function toAxisSign(v: THREE.Vector3): { axis: Axis; sign: 1 | -1 } {
  const ax = Math.abs(v.x);
  const ay = Math.abs(v.y);
  const az = Math.abs(v.z);
  if (ax >= ay && ax >= az) return { axis: 'x', sign: v.x >= 0 ? 1 : -1 };
  if (ay >= az) return { axis: 'y', sign: v.y >= 0 ? 1 : -1 };
  return { axis: 'z', sign: v.z >= 0 ? 1 : -1 };
}

const AXIS_TO_INDEX: Record<Axis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };

/**
 * Which face letter corresponds to `layerAxis` at `layerCoord` (∈ {-1, +1}).
 */
export function faceForLayer(layerAxis: Axis, layerCoord: -1 | 1): FaceLetter {
  if (layerAxis === 'x') return layerCoord === 1 ? 'R' : 'L';
  if (layerAxis === 'y') return layerCoord === 1 ? 'U' : 'D';
  return layerCoord === 1 ? 'F' : 'B';
}

/**
 * Given the face the user is touching, a drag vector in *cube-local* space
 * (on the plane of that face), and the touched cubie's cube-local position,
 * decide which face-move to perform. Returns null if the drag is on the
 * center slice (no valid face turn) or degenerate.
 */
export function resolveLayerTurn(
  faceNormalLocal: THREE.Vector3,
  dragLocal: THREE.Vector3,
  cubiePosition: Vec3,
): Move | null {
  const face = toAxisSign(faceNormalLocal);

  // Project drag onto the plane perpendicular to the face normal.
  // Because faceNormalLocal is axis-aligned, this is just zeroing that component.
  const drag = dragLocal.clone();
  (drag as unknown as Record<'x' | 'y' | 'z', number>)[face.axis] = 0;

  if (drag.lengthSq() < 1e-8) return null;

  // Dominant in-plane axis of the drag.
  const dragAxis = toAxisSign(drag);
  if (dragAxis.axis === face.axis) return null; // shouldn't happen after projection

  // The rotation axis is the axis that is neither the face normal nor the drag.
  const rotAxis: Axis = (['x', 'y', 'z'] as Axis[]).find(
    (a) => a !== face.axis && a !== dragAxis.axis,
  )!;
  const rotIdx = AXIS_TO_INDEX[rotAxis];
  const layerCoord = cubiePosition[rotIdx];
  if (layerCoord === 0) return null; // center slice — no face turn possible

  // Determine rotation sign: rotationVector = faceNormal × dragDir (in local space).
  // Then compare its sign along rotAxis.
  const faceVec = new THREE.Vector3(
    face.axis === 'x' ? face.sign : 0,
    face.axis === 'y' ? face.sign : 0,
    face.axis === 'z' ? face.sign : 0,
  );
  const dragVec = new THREE.Vector3(
    dragAxis.axis === 'x' ? dragAxis.sign : 0,
    dragAxis.axis === 'y' ? dragAxis.sign : 0,
    dragAxis.axis === 'z' ? dragAxis.sign : 0,
  );
  const rotVec = new THREE.Vector3().crossVectors(faceVec, dragVec);
  // Component along the (positive) rotAxis axis: this is ±1.
  const rotSignAlongAxis: 1 | -1 =
    rotAxis === 'x'
      ? (rotVec.x >= 0 ? 1 : -1)
      : rotAxis === 'y'
        ? (rotVec.y >= 0 ? 1 : -1)
        : (rotVec.z >= 0 ? 1 : -1);

  const face_ = faceForLayer(rotAxis, layerCoord as 1 | -1);

  // The face's "base turn" convention (see FACE_DEFS) says a `turns: 1` move
  // is a certain sign of rotation about the positive axis. We want the sign
  // that matches rotSignAlongAxis.
  //
  // From FACE_DEFS: R, U, F all have baseTurns = -1 (they rotate the layer by
  // -1 quarter turn about +X/+Y/+Z under turns=1). L, D, B have baseTurns = +1.
  // So the actual signed quarter-turn about the +axis for a move { face, turns: 1 }
  // equals baseTurns[face]. To realize a desired rotSignAlongAxis, pick
  // turns = rotSignAlongAxis * baseTurns[face] ∈ {-1, +1}.
  const baseTurns = ({
    R: -1, L: 1, U: -1, D: 1, F: -1, B: 1,
  } as const)[face_];
  const turns: 1 | -1 = (rotSignAlongAxis * baseTurns) as 1 | -1;

  return { face: face_, turns };
}
