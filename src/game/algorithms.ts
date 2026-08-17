import type { Move } from '../types/cube';
import { parseSequence } from '../cube/notation';

/**
 * Named cube-solving triggers. Detection is exact (literal move sequence) so
 * that celebrating a "Sexy Move" only fires when the player actually executes
 * R U R' U'. Mirror/rotated variants can be added later; the current focus is
 * the repetitive core triggers speedcubers use most.
 */

export interface Algorithm {
  id: string;
  name: string;
  moves: Move[];
}

export const ALGORITHMS: Algorithm[] = [
  { id: 'sexy', name: 'Sexy Move', moves: parseSequence("R U R' U'") },
  { id: 'reverse-sexy', name: 'Reverse Sexy', moves: parseSequence("R U' R' U") },
  { id: 'sledgehammer', name: 'Sledgehammer', moves: parseSequence("R' F R F'") },
  { id: 'reverse-sledge', name: 'Reverse Sledge', moves: parseSequence("F R' F' R") },
  { id: 'sune', name: 'Sune', moves: parseSequence("R U R' U R U2 R'") },
  { id: 'anti-sune', name: 'Anti-Sune', moves: parseSequence("R' U' R U' R' U2 R") },
];

function movesEqual(a: Move, b: Move): boolean {
  return a.face === b.face && a.turns === b.turns;
}

function tailMatches(history: readonly Move[], seq: readonly Move[], endOffset = 0): boolean {
  const end = history.length - endOffset;
  if (end < seq.length) return false;
  for (let i = 0; i < seq.length; i++) {
    if (!movesEqual(history[end - seq.length + i], seq[i])) return false;
  }
  return true;
}

export interface AlgorithmMatch {
  algorithm: Algorithm;
  /** How many consecutive repetitions of the same algorithm end at the tail. */
  chain: number;
}

/**
 * Look at the tail of `history` and, if it exactly completes one of the known
 * algorithms, return that algorithm along with the current chain count (how
 * many back-to-back repetitions of the SAME algorithm end here).
 *
 * Returns null when the tail doesn't complete any known algorithm.
 */
export function detectAlgorithm(history: readonly Move[]): AlgorithmMatch | null {
  for (const algo of ALGORITHMS) {
    if (!tailMatches(history, algo.moves)) continue;
    let chain = 1;
    while (tailMatches(history, algo.moves, chain * algo.moves.length)) {
      chain++;
    }
    return { algorithm: algo, chain };
  }
  return null;
}
