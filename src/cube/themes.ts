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

/** Per-theme surface tuning applied to the sticker's MeshPhysicalMaterial.
 *  Palette alone doesn't visually distinguish packs when the surface
 *  treatment is identical — these knobs (roughness, clearcoat, iridescence,
 *  sheen) push each pack into a distinct corner of the material space so
 *  Classic reads as matte plastic, Glass as polished glass, etc. */
export interface ThemeMaterial {
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  /** Wet-look topcoat. 0 = none, 1 = full lacquer. Big differentiator. */
  clearcoat: number;
  /** Sharpness of the clearcoat highlight. Lower = tighter, wetter. */
  clearcoatRoughness: number;
  /** Thin-film shimmer (soap bubble / oil slick). 0 disables. */
  iridescence: number;
  /** Index of refraction for the iridescent film; only used if iridescence>0. */
  iridescenceIOR: number;
  /** Soft off-axis fabric-like sheen. 0 disables. */
  sheen: number;
  sheenColor: string;
}

/** Per-theme reticle (direction indicator) tint. The reticle overlay is a
 *  strong visual feature — letting each pack own its accent color prevents
 *  the cyan overlay from making every pack look the same. */
export interface ThemeReticle {
  color: string;
  /** Multiplier on the base emissive intensity. <1 dims so the sticker
   *  material shows through on glossy packs; >1 brightens for neon packs. */
  intensityScale: number;
}

export interface CubeTheme {
  id: ThemeId;
  name: string;
  colors: Record<StickerSide, string>;
  material: ThemeMaterial;
  reticle: ThemeReticle;
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
  {
    // Glassmorphism: canonical face identity preserved (each hue sits in the
    // same family as Classic) but pushed toward a jewel-tone, glossy read.
    // Low roughness + light metalness + high envMap yields sharp highlights
    // and reflective depth without losing the six-color legibility rule.
    id: 'glass',
    name: 'Glass',
    colors: {
      up: '#e8f4ff',
      down: '#ffd84a',
      front: '#3ad19a',
      back: '#3d8bff',
      left: '#ff9a3d',
      right: '#ff4d5e',
    },
    material: { roughness: 0.08, metalness: 0.25, envMapIntensity: 1.8 },
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
