export type Axis = 'x' | 'y' | 'z';

export type Vec3 = readonly [number, number, number];

// Row-major 3x3 integer matrix. Because all rotations are multiples of 90°,
// entries are always integers in {-1, 0, 1} which sidesteps floating-point drift.
export type Mat3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

export type FaceLetter = 'R' | 'L' | 'U' | 'D' | 'F' | 'B';

export interface Move {
  face: FaceLetter;
  // 1 = quarter turn CW (as viewed from that face)
  // -1 = quarter turn CCW ("prime")
  // 2 = half turn (either direction)
  turns: 1 | -1 | 2;
}

export interface Cubie {
  /** Stable identifier — the cubie's home slot (initial position packed 0..26). */
  id: number;
  /** Position the cubie started at when the cube was solved. */
  home: Vec3;
  /** Current integer position in {-1, 0, 1}^3. */
  position: Vec3;
  /** Rotation from the cubie's home orientation to its current orientation. */
  rotation: Mat3;
}

export interface CubeState {
  cubies: Cubie[];
}
