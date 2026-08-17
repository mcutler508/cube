import * as THREE from 'three';
import type { Cubie, Move } from '../types/cube';
import { CUBIE_SPACING } from '../cube/geometry';
import { FACE_DEFS } from '../cube/notation';
import { mat3ToQuaternion } from './orientation';

export interface RunningAnimation {
  move: Move;
  /** Cubie ids that participate in this turn — stable during animation. */
  cubieIds: Set<number>;
  /** Cube-local axis of rotation (positive direction). */
  axis: THREE.Vector3;
  /** Total signed radians to rotate about the axis (right-hand rule). */
  targetAngle: number;
  duration: number;
  elapsed: number;
  /** The pre-animation transform for each affected cubie (position + quaternion). */
  baseTransforms: Map<number, { position: THREE.Vector3; quaternion: THREE.Quaternion }>;
  onDone: () => void;
}

/**
 * Which cubies participate in a layer turn, the axis to rotate about, and the
 * pre-move transforms — shared by animated turns and live-drag turns. `axis`
 * is unit-length and always points in the positive coordinate direction of
 * the face's rotation axis; `targetAngle` carries the sign.
 */
export function planLayerCubies(cubies: Cubie[], move: Move): {
  cubieIds: Set<number>;
  axis: THREE.Vector3;
  baseTransforms: Map<number, { position: THREE.Vector3; quaternion: THREE.Quaternion }>;
  targetAngle: number;
} {
  const def = FACE_DEFS[move.face];
  const axisVec = new THREE.Vector3(
    def.axis === 'x' ? 1 : 0,
    def.axis === 'y' ? 1 : 0,
    def.axis === 'z' ? 1 : 0,
  );
  const idx = def.axis === 'x' ? 0 : def.axis === 'y' ? 1 : 2;
  const cubieIds = new Set<number>();
  const baseTransforms = new Map<
    number,
    { position: THREE.Vector3; quaternion: THREE.Quaternion }
  >();
  for (const c of cubies) {
    if (c.position[idx] !== def.layer) continue;
    cubieIds.add(c.id);
    baseTransforms.set(c.id, {
      position: new THREE.Vector3(
        c.position[0] * CUBIE_SPACING,
        c.position[1] * CUBIE_SPACING,
        c.position[2] * CUBIE_SPACING,
      ),
      quaternion: mat3ToQuaternion(c.rotation),
    });
  }
  const quarterTurns = (move.turns === 2 ? 2 : move.turns) * def.baseTurns;
  return {
    cubieIds,
    axis: axisVec,
    baseTransforms,
    targetAngle: quarterTurns * (Math.PI / 2),
  };
}

/**
 * Given a move + the *current* cube state (pre-move), determine which world axis
 * to spin, by how much, and which cubies are affected. Also records base
 * transforms so the animator can compute per-frame positions/rotations without
 * any dependency on prior React renders.
 */
export function planLayerAnimation(
  cubies: Cubie[],
  move: Move,
  duration: number,
  onDone: () => void,
): RunningAnimation {
  const plan = planLayerCubies(cubies, move);
  return {
    move,
    cubieIds: plan.cubieIds,
    axis: plan.axis,
    targetAngle: plan.targetAngle,
    duration,
    elapsed: 0,
    baseTransforms: plan.baseTransforms,
    onDone,
  };
}

// Fast, physical-feeling easing. Slightly overshoots at the very end perceptually
// due to the cubic ramp, but snaps to exactly 1.0 at t=1.
export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
