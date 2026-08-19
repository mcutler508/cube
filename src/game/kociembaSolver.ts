import Cube from 'cubejs';
import type { CubeState, Move } from '../types/cube';
import { computeNet } from '../cube/net';
import { parseSequence } from '../cube/notation';
import type { StickerSide } from '../cube/colors';

/**
 * Kociemba two-phase solver — wraps the `cubejs` library and gives us a
 * "solve from any state" capability. The current hint pipeline's BFS only
 * looks 5 moves deep, so it goes silent once the player wanders off the
 * canonical solve path. This module fills that gap.
 *
 * Init cost is ~4s of blocking JS while pruning tables are built; we
 * schedule it on requestIdleCallback so page load is unaffected. Until
 * init completes, calls return null and the caller falls back to the
 * older hint tiers.
 */

const FACE_PALETTE: Record<StickerSide, string> = {
  up: 'U',
  down: 'D',
  right: 'R',
  left: 'L',
  front: 'F',
  back: 'B',
};

let solverReady = false;
let solverInitStarted = false;

function initNow(): void {
  if (solverReady || typeof window === 'undefined') return;
  Cube.initSolver();
  solverReady = true;
}

/**
 * Kick off pruning-table generation. Safe to call many times — subsequent
 * calls are no-ops. Deliberately scheduled on idle so the ~4s of blocking
 * work never lands on the page-load critical path.
 */
export function warmKociembaSolver(): void {
  if (solverReady || solverInitStarted) return;
  solverInitStarted = true;
  const w = typeof window !== 'undefined' ? (window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  }) : undefined;
  const schedule = w?.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 400));
  schedule(() => initNow(), { timeout: 3000 });
}

export function isKociembaReady(): boolean {
  return solverReady;
}

/**
 * Convert a CubeState into the 54-char facelet string cubejs expects
 * (URFDLB order, 9 chars per face, each char one of U/R/F/D/L/B).
 *
 * We reuse `computeNet` with a custom palette that maps each sticker side
 * directly to its face letter, avoiding a redundant hex-color round-trip.
 */
function toFaceletString(state: CubeState): string {
  const net = computeNet(state, FACE_PALETTE);
  const order = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
  let s = '';
  for (const face of order) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) s += net[face][r][c];
    }
  }
  return s;
}

/**
 * Return the first move of a full solve from `state`, or null if the
 * solver isn't ready yet or the state can't be solved (should never
 * happen for a valid cube). Callers should treat null as "no Kociemba
 * hint available; try the next tier."
 */
export function kociembaNextMove(state: CubeState): Move | null {
  if (!solverReady) return null;
  try {
    const facelets = toFaceletString(state);
    const cube = Cube.fromString(facelets);
    if (cube.isSolved()) return null;
    const solution = cube.solve();
    if (!solution) return null;
    const moves = parseSequence(solution);
    return moves.length > 0 ? moves[0] : null;
  } catch {
    return null;
  }
}
