import * as THREE from 'three';
import type { Mat3 } from '../types/cube';

const tmpMatrix4 = new THREE.Matrix4();

/**
 * Convert a row-major integer 3x3 matrix into a three.js Quaternion. Because
 * every cube rotation is a multiple of 90°, the input is always an orthogonal
 * matrix with unit determinant — safe to pass through Matrix4/Quaternion
 * decomposition without any special-casing.
 */
export function mat3ToQuaternion(m: Mat3, out?: THREE.Quaternion): THREE.Quaternion {
  tmpMatrix4.set(
    m[0], m[1], m[2], 0,
    m[3], m[4], m[5], 0,
    m[6], m[7], m[8], 0,
    0, 0, 0, 1,
  );
  const q = out ?? new THREE.Quaternion();
  return q.setFromRotationMatrix(tmpMatrix4);
}
