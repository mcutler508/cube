import type { CubeState, FaceLetter, Move } from '../types/cube';
import { applyMove } from '../cube/cubeState';
import { computeNet } from '../cube/net';
import { FACE_LETTERS, FACE_DEFS } from '../cube/notation';
import { evaluateObjective } from './levels/evaluator';
import type { Objective } from './levels/types';

/**
 * Bounded BFS solver: shortest sequence of face turns from `state` that
 * satisfies `objective`. Returns null when no solution exists within
 * `maxDepth`. Intended for hints on shallow beginner levels — max useful
 * depth is around 5–6; deeper searches are exponential and should be replaced
 * by a real cube solver (Kociemba, etc.) if we ever need them.
 */

const TURNS: Move['turns'][] = [1, -1, 2];

/**
 * State-hash for the visited set. 54 cell chars is compact enough to hash
 * cheaply and unique enough for our purposes (two states hash-equal iff they
 * paint the same net, which is the correct equivalence for objectives that
 * are defined over the net).
 */
function stateHash(state: CubeState): string {
  const net = computeNet(state);
  let s = '';
  for (const f of ['U', 'D', 'L', 'R', 'F', 'B'] as FaceLetter[]) {
    const g = net[f];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) s += g[r][c];
    }
  }
  return s;
}

interface Node {
  state: CubeState;
  path: Move[];
  lastFace: FaceLetter | null;
  lastAxis: 'x' | 'y' | 'z' | null;
}

/**
 * Skip moves that would trivially collapse with the previous move. Same-face
 * as last is always redundant (F then F' cancels; F then F2 = F'; etc.).
 * Same-axis after last with an intermediate face already used is also
 * redundant (F B F reduces to some F2 or similar canonical form). This
 * pruning halves the effective branch factor without dropping any shortest
 * solutions.
 */
function shouldSkip(face: FaceLetter, lastFace: FaceLetter | null, lastAxis: 'x' | 'y' | 'z' | null): boolean {
  if (lastFace === face) return true;
  const axis = FACE_DEFS[face].axis;
  if (lastAxis === axis && lastFace !== null) {
    // Same axis, different face → this is an opposite-face pair (e.g. F then B).
    // These commute, so we canonicalize by only allowing the alphabetically
    // earlier face after the later one to avoid exploring both orderings.
    if (face > lastFace) return true;
  }
  return false;
}

export interface SolverOptions {
  /** Maximum search depth. Beyond this we return null. Default 6. */
  maxDepth?: number;
  /** Cap on nodes explored — hard safety against pathological cases. */
  maxNodes?: number;
}

export function solveObjective(
  state: CubeState,
  objective: Objective,
  opts: SolverOptions = {},
): Move[] | null {
  const maxDepth = opts.maxDepth ?? 6;
  const maxNodes = opts.maxNodes ?? 500_000;

  if (evaluateObjective(state, objective)) return [];

  const visited = new Set<string>();
  visited.add(stateHash(state));

  let frontier: Node[] = [
    { state, path: [], lastFace: null, lastAxis: null },
  ];
  let explored = 0;

  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: Node[] = [];
    for (const node of frontier) {
      for (const face of FACE_LETTERS) {
        if (shouldSkip(face, node.lastFace, node.lastAxis)) continue;
        for (const turns of TURNS) {
          const move: Move = { face, turns };
          const nextState = applyMove(node.state, move);
          explored++;
          if (explored > maxNodes) return null;

          if (evaluateObjective(nextState, objective)) {
            return [...node.path, move];
          }

          const hash = stateHash(nextState);
          if (visited.has(hash)) continue;
          visited.add(hash);

          next.push({
            state: nextState,
            path: [...node.path, move],
            lastFace: face,
            lastAxis: FACE_DEFS[face].axis,
          });
        }
      }
    }
    frontier = next;
    if (frontier.length === 0) return null;
  }
  return null;
}

/** Convenience: just the first move of the shortest solution, or null. */
export function nextHintMove(
  state: CubeState,
  objective: Objective,
  opts: SolverOptions = {},
): Move | null {
  const path = solveObjective(state, objective, opts);
  if (!path || path.length === 0) return null;
  return path[0];
}
