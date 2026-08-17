import type { Axis, Mat3, Vec3 } from '../types/cube';

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function axisIndex(axis: Axis): 0 | 1 | 2 {
  return axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
}

export function multiplyMat3(a: Mat3, b: Mat3): Mat3 {
  const [
    a00, a01, a02,
    a10, a11, a12,
    a20, a21, a22,
  ] = a;
  const [
    b00, b01, b02,
    b10, b11, b12,
    b20, b21, b22,
  ] = b;
  return [
    a00 * b00 + a01 * b10 + a02 * b20,
    a00 * b01 + a01 * b11 + a02 * b21,
    a00 * b02 + a01 * b12 + a02 * b22,

    a10 * b00 + a11 * b10 + a12 * b20,
    a10 * b01 + a11 * b11 + a12 * b21,
    a10 * b02 + a11 * b12 + a12 * b22,

    a20 * b00 + a21 * b10 + a22 * b20,
    a20 * b01 + a21 * b11 + a22 * b21,
    a20 * b02 + a21 * b12 + a22 * b22,
  ];
}

export function applyMat3(m: Mat3, v: Vec3): Vec3 {
  const [x, y, z] = v;
  return [
    m[0] * x + m[1] * y + m[2] * z,
    m[3] * x + m[4] * y + m[5] * z,
    m[6] * x + m[7] * y + m[8] * z,
  ];
}

/**
 * Rotation matrix for `quarterTurns` * 90° around the given axis.
 * Positive quarterTurns = counterclockwise as viewed from the +axis toward the origin
 * (standard right-hand rule for a right-handed coordinate system).
 */
export function rotationMatrix(axis: Axis, quarterTurns: number): Mat3 {
  const q = ((quarterTurns % 4) + 4) % 4;
  const c = q === 0 ? 1 : q === 2 ? -1 : 0;
  const s = q === 1 ? 1 : q === 3 ? -1 : 0;
  switch (axis) {
    case 'x':
      return [
        1, 0, 0,
        0, c, -s,
        0, s, c,
      ];
    case 'y':
      return [
        c, 0, s,
        0, 1, 0,
        -s, 0, c,
      ];
    case 'z':
      return [
        c, -s, 0,
        s, c, 0,
        0, 0, 1,
      ];
  }
}

export function mat3Equal(a: Mat3, b: Mat3): boolean {
  for (let i = 0; i < 9; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function vec3Equal(a: Vec3, b: Vec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
