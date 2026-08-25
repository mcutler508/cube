import type { CubeState, Cubie } from '../types/cube';
import { IDENTITY, mat3Equal, vec3Equal } from './coordinates';

export function isSolved(state: CubeState): boolean {
  for (const c of state.cubies) {
    if (!vec3Equal(c.position, c.home)) return false;
    if (!mat3Equal(c.rotation, IDENTITY)) return false;
  }
  return true;
}

function isCorner(c: Cubie): boolean {
  return c.home[0] !== 0 && c.home[1] !== 0 && c.home[2] !== 0;
}

/**
 * 2x2 solved check. Only the 8 corner cubies are relevant on a 2x2 — the
 * engine still tracks edges + centers underneath, but the player can neither
 * see them nor turn a middle slice to move them, so their state has no
 * bearing on whether the cube "looks solved" to a 2x2 player.
 *
 * Because face turns (R, U, F, ...) leave the invisible center cubies at
 * their home positions (they only rotate in place around the layer axis),
 * we still use the standard "home position + identity rotation" check per
 * corner — the invisible centers effectively anchor the reference frame.
 */
export function isSolved2x2(state: CubeState): boolean {
  for (const c of state.cubies) {
    if (!isCorner(c)) continue;
    if (!vec3Equal(c.position, c.home)) return false;
    if (!mat3Equal(c.rotation, IDENTITY)) return false;
  }
  return true;
}
