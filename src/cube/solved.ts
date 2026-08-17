import type { CubeState } from '../types/cube';
import { IDENTITY, mat3Equal, vec3Equal } from './coordinates';

export function isSolved(state: CubeState): boolean {
  for (const c of state.cubies) {
    if (!vec3Equal(c.position, c.home)) return false;
    if (!mat3Equal(c.rotation, IDENTITY)) return false;
  }
  return true;
}
