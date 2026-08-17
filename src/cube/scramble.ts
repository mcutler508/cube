import type { FaceLetter, Move } from '../types/cube';
import { FACE_LETTERS, oppositeFace } from './notation';

function randomInt(rng: () => number, max: number): number {
  return Math.floor(rng() * max);
}

/**
 * Generate a random scramble. Skips a move whose face matches the immediately
 * previous move, and skips a move whose face is opposite to the previous
 * move AND matches the one before that (avoids trivial cancels like R L R).
 */
export function generateScramble(length = 22, rng: () => number = Math.random): Move[] {
  const moves: Move[] = [];
  let prev: FaceLetter | null = null;
  let prevPrev: FaceLetter | null = null;

  while (moves.length < length) {
    const face = FACE_LETTERS[randomInt(rng, FACE_LETTERS.length)];
    if (face === prev) continue;
    if (prev !== null && face === oppositeFace(prev) && face === prevPrev) continue;
    const turnOptions: Move['turns'][] = [1, -1, 2];
    const turns = turnOptions[randomInt(rng, turnOptions.length)];
    moves.push({ face, turns });
    prevPrev = prev;
    prev = face;
  }
  return moves;
}
