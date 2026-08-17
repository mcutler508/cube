import type { Axis, FaceLetter, Move } from '../types/cube';

/**
 * Face → (rotation axis, layer coordinate on that axis, base quarter turns for a
 * clockwise (unprimed) turn as viewed from that face). The sign is the tricky bit:
 * a clockwise turn viewed from +X is a negative rotation about +X under the
 * right-hand rule; a clockwise turn viewed from -X is a positive rotation about +X.
 */
export const FACE_DEFS: Record<FaceLetter, {
  axis: Axis;
  layer: -1 | 1;
  baseTurns: 1 | -1;
}> = {
  R: { axis: 'x', layer: 1, baseTurns: -1 },
  L: { axis: 'x', layer: -1, baseTurns: 1 },
  U: { axis: 'y', layer: 1, baseTurns: -1 },
  D: { axis: 'y', layer: -1, baseTurns: 1 },
  F: { axis: 'z', layer: 1, baseTurns: -1 },
  B: { axis: 'z', layer: -1, baseTurns: 1 },
};

export const FACE_LETTERS: FaceLetter[] = ['R', 'L', 'U', 'D', 'F', 'B'];

const OPPOSITE: Record<FaceLetter, FaceLetter> = {
  R: 'L', L: 'R', U: 'D', D: 'U', F: 'B', B: 'F',
};

export function oppositeFace(face: FaceLetter): FaceLetter {
  return OPPOSITE[face];
}

export function invertMove(move: Move): Move {
  if (move.turns === 2) return move;
  return { face: move.face, turns: (-move.turns) as 1 | -1 };
}

export function formatMove(move: Move): string {
  if (move.turns === 2) return `${move.face}2`;
  return move.turns === 1 ? move.face : `${move.face}'`;
}

export function parseMove(token: string): Move {
  const face = token[0] as FaceLetter;
  if (!FACE_LETTERS.includes(face)) {
    throw new Error(`Unknown face: ${token}`);
  }
  const rest = token.slice(1);
  if (rest === '') return { face, turns: 1 };
  if (rest === "'") return { face, turns: -1 };
  if (rest === '2') return { face, turns: 2 };
  throw new Error(`Unknown modifier in move: ${token}`);
}

export function parseSequence(sequence: string): Move[] {
  return sequence
    .split(/\s+/)
    .filter(Boolean)
    .map(parseMove);
}

export function formatSequence(moves: Move[]): string {
  return moves.map(formatMove).join(' ');
}
