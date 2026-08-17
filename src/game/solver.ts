import type { CubeState, FaceLetter, Move } from '../types/cube';
import { applyMove, applyMoves, createSolvedCube } from '../cube/cubeState';
import { computeNet } from '../cube/net';
import { FACE_LETTERS, FACE_DEFS, invertMove } from '../cube/notation';
import { evaluateObjective } from './levels/evaluator';
import type { Level, Objective } from './levels/types';

/**
 * Hint system with two tiers, in order:
 *   1. Level fast path — if the player's current cube state matches any
 *      intermediate state on the level's canonical solution (the inverse of
 *      its setupMoves), return the next move on that path. O(1) after a
 *      per-level warmup, works for arbitrarily deep levels.
 *   2. BFS fallback — bounded, breadth-first over face turns; finds shortest
 *      solutions for objectives within a small move budget. Intended for
 *      shallow beginner objectives; not a general cube solver.
 *
 * The BFS budget is deliberately tight (depth 5, ~80k nodes) so a miss
 * returns in ~500ms rather than seconds. Levels with deep solutions rely on
 * the fast path when the player is following the intended solve.
 */

const TURNS: Move['turns'][] = [1, -1, 2];

/**
 * State-hash for the visited set + level-path lookup. 54 cell chars is
 * compact enough to hash cheaply and unique enough for our purposes (two
 * states hash-equal iff they paint the same net, which is the correct
 * equivalence for objectives that are defined over the net).
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
    if (face > lastFace) return true;
  }
  return false;
}

export interface SolverOptions {
  /** Maximum search depth. Beyond this we return null. Default 4. */
  maxDepth?: number;
  /** Cap on nodes explored — hard safety against pathological cases. */
  maxNodes?: number;
}

export function solveObjective(
  state: CubeState,
  objective: Objective,
  opts: SolverOptions = {},
): Move[] | null {
  // Defaults are tuned for hint UX: worst-case exhaustive search at depth 4
  // completes in a few hundred ms, so a missed BFS returns quickly rather
  // than making the "Hint…" button feel broken.
  const maxDepth = opts.maxDepth ?? 4;
  const maxNodes = opts.maxNodes ?? 30_000;

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

// ---------------------------------------------------------------------------
// Intended-solution fast path. Every level's setupMoves define a canonical
// solve: apply the inverse in reverse order. We precompute the sequence of
// (stateHash, nextMove) pairs once per level and cache; on hint request we
// hash the current state and, if it appears on the intended path, return the
// next move immediately.

interface IntendedStep {
  hash: string;
  next: Move;
}

const intendedCache = new Map<string, IntendedStep[]>();

function intendedSolutionSteps(level: Level): IntendedStep[] {
  const cached = intendedCache.get(level.id);
  if (cached) return cached;
  const solution = [...level.setupMoves].reverse().map(invertMove);
  const startingState = applyMoves(createSolvedCube(), level.setupMoves);
  const steps: IntendedStep[] = [];
  let cur = startingState;
  for (const move of solution) {
    steps.push({ hash: stateHash(cur), next: move });
    cur = applyMove(cur, move);
  }
  intendedCache.set(level.id, steps);
  return steps;
}

/**
 * Level-aware hint. Prefers the canonical solution when the player is on
 * that path; otherwise falls back to bounded BFS. Bounded BFS returns null
 * quickly (< ~800ms) when the objective is out of reach.
 */
export function hintForLevel(state: CubeState, level: Level): Move | null {
  const steps = intendedSolutionSteps(level);
  const hash = stateHash(state);
  const step = steps.find((s) => s.hash === hash);
  if (step) return step.next;
  return nextHintMove(state, level.objective);
}

/** Test-only: reset intended-solution cache between tests. */
export function _resetIntendedCacheForTest(): void {
  intendedCache.clear();
}
