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

/** Per-theme material tuning for the sticker's MeshStandardMaterial. Palette
 *  alone doesn't visually distinguish themes when the surface treatment is
 *  identical — these knobs give each theme its own tactile feel. */
export interface ThemeMaterial {
  roughness: number;
  metalness: number;
  envMapIntensity: number;
}

export interface CubeTheme {
  id: ThemeId;
  name: string;
  colors: Record<StickerSide, string>;
  material: ThemeMaterial;
}

export const THEMES: readonly CubeTheme[] = [
  {
    id: 'classic',
    name: 'Classic',
    colors: { ...FACE_COLORS },
    material: { roughness: 0.42, metalness: 0.04, envMapIntensity: 0.6 },
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
    material: { roughness: 0.15, metalness: 0.6, envMapIntensity: 1.4 },
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
