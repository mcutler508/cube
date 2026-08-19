import { useGameStore } from '../store/gameStore';
import { FACE_COLORS, type StickerSide } from './colors';

/**
 * Themes only affect *rendering*. Face identity is `StickerSide` — cube state,
 * detections, progress, and solver logic never touch these hex values.
 *
 * Pre-existing debt: `game/detections.ts` still compares `FACE_COLORS[side]`
 * hex strings to check face identity on the 2D net. That's unrelated to
 * theming (all six identity checks reference the same constant), but it means
 * we cannot palette-swap detections. Left as-is; not part of this migration.
 */
export type ThemeId = string;

export interface CubeTheme {
  id: ThemeId;
  name: string;
  colors: Record<StickerSide, string>;
}

export const THEMES: readonly CubeTheme[] = [
  {
    id: 'classic',
    name: 'Classic',
    colors: { ...FACE_COLORS },
  },
  {
    id: 'amber-mosaic',
    name: 'Amber Mosaic',
    colors: {
      up: '#d4b8ff',
      down: '#ffd54a',
      front: '#26c6b8',
      back: '#4a6fff',
      left: '#ffa726',
      right: '#ff5a2c',
    },
  },
];

/** Resolve a themeId to a theme object, falling back to the first theme
 *  (Classic) when the id is unknown or was removed after being persisted. */
export function getThemeById(id: ThemeId): CubeTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** React hook returning the currently-active theme, kept in sync with the
 *  user's persisted `settings.themeId`. */
export function useActiveTheme(): CubeTheme {
  const id = useGameStore((s) => s.settings.themeId);
  return getThemeById(id);
}
