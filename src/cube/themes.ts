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
    // Iridescent holo, tuned for legibility — dielectric (metalness 0.4)
    // so base color stays visible instead of being replaced by iridescence.
    // Thickness range narrowed so shimmer shifts within a band around each
    // hue rather than sweeping the whole spectrum. Palette saturated hard
    // to survive the clearcoat + reflection load.
    id: 'amber-mosaic',
    name: 'Amber Mosaic',
    colors: {
      up: '#ffffff',
      down: '#ffe000',
      front: '#00c26a',
      back: '#1f5eff',
      left: '#ff8a1a',
      right: '#ff2a3a',
    },
    material: {
      roughness: 0.32,
      metalness: 0.4,
      envMapIntensity: 1.9,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      iridescence: 0.85,
      iridescenceIOR: 1.8,
      iridescenceThicknessRange: [220, 520],
      sheen: 0,
      sheenColor: '#ffffff',
      ior: 1.5,
      anisotropy: 0.6,
      anisotropyRotation: Math.PI / 4,
      specularIntensity: 0.9,
      specularColor: '#ffe0f0',
    },
    reticle: { color: '#ffc27a', intensityScale: 0.5 },
  },
  {
    // Polished glass gem — clearcoat + fresnel carry the "shiny" read,
    // but base roughness lifted to 0.12 so the diffuse layer transmits
    // color instead of the sticker acting as a mirror. envMap dialed
    // back from over-saturation; iridescence kept subtle so it's
    // "sparkle" not "prism". Palette pushed toward jewel-tone saturation.
    id: 'glass',
    name: 'Glass',
    colors: {
      up: '#ffffff',
      down: '#ffd200',
      front: '#00c689',
      back: '#2278ff',
      left: '#ff8a1a',
      right: '#ff2d4a',
    },
    material: {
      roughness: 0.12,
      metalness: 0,
      envMapIntensity: 1.4,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      iridescence: 0.2,
      iridescenceIOR: 1.5,
      iridescenceThicknessRange: [200, 500],
      sheen: 0,
      sheenColor: '#ffffff',
      ior: 1.6,
      anisotropy: 0.3,
      anisotropyRotation: Math.PI / 6,
      specularIntensity: 1,
      specularColor: '#eaf5ff',
    },
    reticle: { color: '#ffffff', intensityScale: 0.35 },
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
