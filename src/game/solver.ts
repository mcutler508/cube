import type { CubeState, FaceLetter, Move } from '../types/cube';
import { applyMove, applyMoves, createSolvedCube } from '../cube/cubeState';
import { computeNet } from '../cube/net';
import { FACE_LETTERS, FACE_DEFS, invertMove } from '../cube/notation';
import { evaluateObjective } from './levels/evaluator';
import type { Level, Objective } from './levels/types';
import { ALGORITHMS, type Algorithm } from './algorithms';
import { firstUnmetMilestone, type MilestoneKey } from './milestones';

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

/**
 * The generically-most-useful algorithm to reach for at each milestone. Used
 * as a fallback recommendation when the player has deviated from the level's
 * canonical solution path (which is nearly always, since most players don't
 * follow the setup-inverse verbatim). Pairs each layer-by-layer step with
 * the trigger a beginner-method solver would typically reach for.
 */
const MILESTONE_HINT_ALGORITHM: Record<MilestoneKey, string> = {
  whiteCross: 'sledgehammer', // edge-flip trigger
  firstLayer: 'sexy',         // corner-insertion trigger
  middleLayer: 'sexy',        // middle-edge insertion variant
  yellowCross: 'sune',        // OLL orientation
  solved: 'sune',             // last-layer orientation
};

/**
 * If the player is on the level's intended-solution path AND the next
 * few moves on that path exactly match one of our known algorithms,
 * return that algorithm. This lets the hint system recommend a specific
 * named trigger ("Try Sledgehammer") rather than a raw move.
 *
 * Returns null when the player has deviated from the intended path OR
 * when the next few moves don't match any known algorithm.
 */
export function recommendAlgorithmForLevel(
  state: CubeState,
  level: Level,
): Algorithm | null {
  const steps = intendedSolutionSteps(level);
  const hash = stateHash(state);
  const idx = steps.findIndex((s) => s.hash === hash);
  if (idx === -1) return null;
  const remaining: Move[] = [];
  for (let i = idx; i < steps.length; i++) remaining.push(steps[i].next);

  // Prefer longer matches (a Sune-length prefix beats a Sexy-length prefix).
  const sorted = [...ALGORITHMS].sort((a, b) => b.moves.length - a.moves.length);
  for (const algo of sorted) {
    if (algo.moves.length > remaining.length) continue;
    let match = true;
    for (let i = 0; i < algo.moves.length; i++) {
      if (
        algo.moves[i].face !== remaining[i].face ||
        algo.moves[i].turns !== remaining[i].turns
      ) {
        match = false;
        break;
      }
    }
    if (match) return algo;
  }
  return null;
}

/**
 * Best-effort algorithm recommendation for the hint UI. Tries the exact
 * intended-path match first; when the player has deviated, falls back to the
 * milestone-based generic trigger. Always returns an algorithm as long as
 * there's an unmet milestone, so hint tiers 3 (palette pulse) and 4 (preview)
 * always have something concrete to highlight.
 */
export function hintAlgorithmFor(state: CubeState, level: Level): Algorithm | null {
  const exact = recommendAlgorithmForLevel(state, level);
  if (exact) return exact;
  const milestone = firstUnmetMilestone(state);
  if (!milestone) return null;
  const fallbackId = MILESTONE_HINT_ALGORITHM[milestone.key];
  return ALGORITHMS.find((a) => a.id === fallbackId) ?? null;
}
