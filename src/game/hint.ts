import type { CubeState, Move } from '../types/cube';

/**
 * The signature a solver must implement. Given the current cube state, return
 * either the next recommended move or `null` if no hint is available. This is
 * a *placeholder* — no solver is wired up yet. Easy-mode helper arrows read
 * from `getHint()` and stay hidden while it returns null.
 *
 * When a real solver lands (beginner method, Kociemba, whatever), swap the
 * body of `getHint` to call it. Consumers don't have to change.
 */
export type HintProvider = (state: CubeState) => Move | null;

let provider: HintProvider = () => null;

/** Install a solver. Only one is active at a time. */
export function setHintProvider(fn: HintProvider) {
  provider = fn;
}

export function getHint(state: CubeState): Move | null {
  try {
    return provider(state);
  } catch {
    return null;
  }
}
