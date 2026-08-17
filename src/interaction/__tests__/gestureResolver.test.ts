import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { resolveLayerTurn } from '../gestureResolver';
import { applyMove, createSolvedCube } from '../../cube/cubeState';
import type { Vec3 } from '../../types/cube';

/**
 * Behavioral contract: a drag on the touched face should turn a layer such
 * that the touched cubie moves *in the direction of the drag* on its next
 * position.
 */
function assertDragMovesCubieToward(
  faceNormal: [number, number, number],
  drag: [number, number, number],
  cubiePos: Vec3,
  expectedFacePrefix?: string,
) {
  const move = resolveLayerTurn(
    new THREE.Vector3(...faceNormal),
    new THREE.Vector3(...drag),
    cubiePos,
  );
  expect(move).not.toBeNull();
  if (expectedFacePrefix) {
    expect(move!.face).toBe(expectedFacePrefix);
  }
  const before = createSolvedCube();
  const after = applyMove(before, move!);
  const beforeCubie = before.cubies.find(
    (c) => c.position[0] === cubiePos[0] && c.position[1] === cubiePos[1] && c.position[2] === cubiePos[2],
  )!;
  const afterCubie = after.cubies.find((c) => c.id === beforeCubie.id)!;

  const delta: Vec3 = [
    afterCubie.position[0] - beforeCubie.position[0],
    afterCubie.position[1] - beforeCubie.position[1],
    afterCubie.position[2] - beforeCubie.position[2],
  ];
  const dot = delta[0] * drag[0] + delta[1] * drag[1] + delta[2] * drag[2];
  expect(dot).toBeGreaterThan(0);
}

describe('resolveLayerTurn', () => {
  it('dragging +X on top face at z=1 rotates the front layer (F)', () => {
    assertDragMovesCubieToward([0, 1, 0], [1, 0, 0], [0, 1, 1], 'F');
  });

  it('dragging -X on top face at z=1 rotates the front layer the other way (F\')', () => {
    const move = resolveLayerTurn(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-1, 0, 0),
      [0, 1, 1],
    );
    expect(move).toEqual({ face: 'F', turns: -1 });
  });

  it('dragging +Z on top face at x=1 rotates the right layer (R)', () => {
    assertDragMovesCubieToward([0, 1, 0], [0, 0, 1], [1, 1, 0], 'R');
  });

  it('dragging +Y on front face at x=1 turns the right layer upward', () => {
    assertDragMovesCubieToward([0, 0, 1], [0, 1, 0], [1, 0, 1], 'R');
  });

  it('dragging on middle-slice cubie returns null (no face turn possible)', () => {
    const move = resolveLayerTurn(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(1, 0, 0),
      [0, 1, 0], // z=0 = middle slice
    );
    expect(move).toBeNull();
  });

  it('degenerate drag (no in-plane component) returns null', () => {
    const move = resolveLayerTurn(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0.9, 0),
      [1, 1, 1],
    );
    expect(move).toBeNull();
  });

  it('the direction of rotation always drags the touched cubie toward the swipe', () => {
    const cases: Array<[[number, number, number], [number, number, number], Vec3]> = [
      [[0, 1, 0], [1, 0, 0], [0, 1, 1]],
      [[0, 1, 0], [-1, 0, 0], [0, 1, 1]],
      [[0, 1, 0], [0, 0, 1], [1, 1, 0]],
      [[0, 0, 1], [1, 0, 0], [0, 1, 1]],
      [[0, 0, 1], [0, 1, 0], [1, 0, 1]],
      [[1, 0, 0], [0, 1, 0], [1, 0, 1]],
      [[1, 0, 0], [0, 0, 1], [1, 1, 0]],
      [[-1, 0, 0], [0, 1, 0], [-1, 0, 1]],
      [[0, -1, 0], [1, 0, 0], [0, -1, 1]],
      [[0, 0, -1], [1, 0, 0], [0, 1, -1]],
    ];
    for (const [n, d, pos] of cases) {
      assertDragMovesCubieToward(n, d, pos);
    }
  });
});
