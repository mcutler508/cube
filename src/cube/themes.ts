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
 *  treatment is identical — these knobs push each pack into a distinct
 *  corner of the material space so Classic reads as matte plastic, Glass as
 *  polished gem, Amber as iridescent oil-slick, etc. */
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
  /** Thin-film thickness range in nm. Default [100,400]; widening pushes
   *  the iridescent color shift through more of the visible spectrum. Higher
   *  values = deeper rainbow. Only used when iridescence > 0. */
  iridescenceThicknessRange: [number, number];
  /** Index of refraction — 1.5 is glass, 1.4 plastic, 2.4 diamond. Drives
   *  fresnel falloff and edge brightening on physical materials. */
  ior: number;
  /** Directional stretching of the specular highlight (brushed-metal /
   *  oil-streak look). 0 disables. */
  anisotropy: number;
  /** Rotation of the anisotropic highlight in radians. */
  anisotropyRotation: number;
  /** Strength of the specular reflection (0-1). Cranks the highlight
   *  brightness independently of clearcoat. */
  specularIntensity: number;
  specularColor: string;
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
    // Premium matte plastic — high roughness, no clearcoat, subtle white
    // sheen for that soft off-axis fabric bloom. Reads as vintage Rubik's
    // tile with a modern satin finish.
    id: 'classic',
    name: 'Classic',
    colors: { ...FACE_COLORS },
    material: {
      roughness: 0.6,
      metalness: 0.02,
      envMapIntensity: 0.45,
      clearcoat: 0,
      clearcoatRoughness: 1,
      iridescence: 0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
      sheen: 0.6,
      sheenColor: '#ffe8d6',
      ior: 1.4,
      anisotropy: 0,
      anisotropyRotation: 0,
      specularIntensity: 0.4,
      specularColor: '#ffffff',
    },
    reticle: { color: '#7ee9ff', intensityScale: 1.0 },
  },
  {
    // Full-tilt iridescent oil-slick — clearcoat locked, iridescence at 1,
    // anisotropic streaks for the rainbow smear. This should look like a
    // holographic sticker under a spotlight.
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
    material: {
      // Roughness kept modest so the shimmer isn't washed out by a mirror
      // reflection of the envMap. Metalness at 0.8 lets iridescence work as
      // the dominant color contribution — the base tint becomes a bias, not
      // a wall. Thickness range widened dramatically so a small viewing-angle
      // change sweeps through half the visible spectrum.
      roughness: 0.28,
      metalness: 0.8,
      envMapIntensity: 3.2,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      iridescence: 1,
      iridescenceIOR: 2.2,
      iridescenceThicknessRange: [280, 780],
      sheen: 0,
      sheenColor: '#ffffff',
      ior: 1.6,
      anisotropy: 0.9,
      anisotropyRotation: Math.PI / 4,
      specularIntensity: 1,
      specularColor: '#ffddee',
    },
    reticle: { color: '#ffc27a', intensityScale: 0.4 },
  },
  {
    // Polished glass gem — near-zero roughness, ior pushed to sapphire
    // territory, clearcoat maxed, envMap cranked, anisotropic streak for
    // that jewel-facet highlight. Reticle nearly disabled so the tile's
    // own reflections carry the show.
    id: 'glass',
    name: 'Glass',
    colors: {
      up: '#f5faff',
      down: '#ffe066',
      front: '#4ae3ac',
      back: '#4a9dff',
      left: '#ffab52',
      right: '#ff5f70',
    },
    material: {
      roughness: 0.015,
      metalness: 0,
      envMapIntensity: 4.5,
      clearcoat: 1,
      clearcoatRoughness: 0,
      iridescence: 0.6,
      iridescenceIOR: 2.0,
      iridescenceThicknessRange: [200, 600],
      sheen: 0,
      sheenColor: '#ffffff',
      ior: 2.0,
      anisotropy: 0.55,
      anisotropyRotation: Math.PI / 6,
      specularIntensity: 1,
      specularColor: '#eaf5ff',
    },
    reticle: { color: '#ffffff', intensityScale: 0.25 },
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
