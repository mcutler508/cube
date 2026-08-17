import type { Vec3 } from '../types/cube';

// A restrained, slightly-desaturated palette that reads well on a dark background
// while still being recognizable as classic Rubik's colors.
export const FACE_COLORS = {
  right: '#d62828',  // red (+X)
  left: '#f77f00',   // orange (-X)
  up: '#f8f8f2',     // white (+Y)
  down: '#f6c000',   // yellow (-Y)
  front: '#2a9d5c',  // green (+Z)
  back: '#1e5fb8',   // blue (-Z)
} as const;

export type StickerSide = keyof typeof FACE_COLORS;

/** Which stickers a cubie starts with, based on its home position. */
export function stickersForHome(home: Vec3): StickerSide[] {
  const s: StickerSide[] = [];
  if (home[0] === 1) s.push('right');
  if (home[0] === -1) s.push('left');
  if (home[1] === 1) s.push('up');
  if (home[1] === -1) s.push('down');
  if (home[2] === 1) s.push('front');
  if (home[2] === -1) s.push('back');
  return s;
}
