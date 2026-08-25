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
  /** Light transmission through the sticker body (0 = opaque, 1 = fully
   *  transparent glass). Drives the frosted-glass look. Attenuation color
   *  is derived from the sticker's base color so light that passes through
   *  picks up the face tint. */
  transmission?: number;
  /** Effective body thickness for transmission, in world units. Larger =
   *  more attenuation (deeper tint). Only meaningful when transmission > 0. */
  thickness?: number;
  /** Distance over which transmitted light is fully absorbed by the base
   *  color. Smaller = more saturated color. Only meaningful when
   *  transmission > 0. Defaults to Infinity (no absorption). */
  attenuationDistance?: number;
  /** Default emissive intensity applied when the sticker is idle (not the
   *  animated hint pulse). Used by "glowing" themes like frosted glass to
   *  give the sticker an inner light source — the emissive color is the
   *  sticker's own face color, so each face glows in its own hue. */
  baseEmissiveIntensity?: number;
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
  {
    // Frosted glass — real light transmission (0.82) so the sticker body
    // reads as a translucent wafer rather than a painted plate. Attenuation
    // through the base color gives every face its tint from the inside out.
    // Roughness 0.38 + a low-frequency noise `roughnessMap` (see
    // themeTextures.ts) breaks up highlights the way sandblasted glass does.
    // Palette is desaturated jewel tones — the transmission needs headroom;
    // saturated Rubik's colors would come out muddy through the diffusion.
    id: 'frosted',
    name: 'Frosted Glass',
    colors: {
      up: '#f0f4ee',
      down: '#e8c765',
      front: '#5aa88a',
      back: '#4a7ea8',
      left: '#d88a68',
      right: '#c85a70',
    },
    material: {
      // Rough, low-reflection surface so the base material reads as diffuse
      // frost, not lacquer. The mirror-y look came from cranked
      // envMap/clearcoat; both stripped back. `sheen` adds the soft fabric
      // bloom that real sandblasted glass has when grazing light hits it.
      roughness: 0.55,
      metalness: 0,
      envMapIntensity: 0.35,
      clearcoat: 0,
      clearcoatRoughness: 1,
      iridescence: 0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
      sheen: 0.5,
      sheenColor: '#ffffff',
      ior: 1.45,
      anisotropy: 0,
      anisotropyRotation: 0,
      specularIntensity: 0.4,
      specularColor: '#ffffff',
      // Mild transmission so the material reads as glass, not paint. Kept
      // moderate because what's behind each sticker is the black cubie body
      // — high transmission would just show a dark tinted hole.
      transmission: 0.55,
      thickness: 0.4,
      attenuationDistance: 0.35,
      // The actual "glow" — each sticker emits its own face color at low
      // intensity, so it reads as frosted glass with a colored LED behind
      // it. The frost roughness diffuses the emissive into a soft bloom.
      baseEmissiveIntensity: 0.55,
    },
    reticle: { color: '#ffffff', intensityScale: 1.4 },
  },
  {
    // Graffiti — each face is a densely-painted 1024² "wall" of tags, drips,
    // and spray speckles over the vibrant face color (see themeTextures.ts).
    // Each sticker samples a random ~42% crop of its face texture so no two
    // stickers on the same face look identical, while the face color still
    // dominates every crop. Matte surface (roughness 0.78, no clearcoat) so
    // it reads as spray paint on concrete, not lacquered plastic.
    id: 'graffiti',
    name: 'Graffiti',
    colors: {
      up: '#f0efe8',
      down: '#ffcf1a',
      front: '#12a05a',
      back: '#1f5fd6',
      left: '#f57a1e',
      right: '#e5303f',
    },
    material: {
      roughness: 0.78,
      metalness: 0,
      envMapIntensity: 0.55,
      clearcoat: 0,
      clearcoatRoughness: 1,
      iridescence: 0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
      sheen: 0.2,
      sheenColor: '#a09080',
      ior: 1.4,
      anisotropy: 0,
      anisotropyRotation: 0,
      specularIntensity: 0.6,
      specularColor: '#ffffff',
    },
    reticle: { color: '#ffffff', intensityScale: 1.2 },
  },
  {
    // Graffiti Collage — the 2x2 signature theme. Face textures are 1024²
    // multi-layer collages (halftone dots, stripe bands, chunky tag stamps,
    // scattered icon shapes, spray speckles) painted over the primary face
    // color. Every ~42% sticker crop still shows the face color as the
    // dominant read (>50% of pixel area) so lineup-by-color remains
    // trivially readable — see comments in themeTextures.ts for the layer
    // budget rationale. Matte surface treatment matches 'graffiti' so it
    // reads as sticker-on-cube, not lacquered plastic.
    id: 'graffiti-collage',
    name: 'Graffiti Collage',
    colors: {
      up: '#f4f2ea',
      down: '#ffcf1a',
      front: '#12a05a',
      back: '#1f5fd6',
      left: '#f57a1e',
      right: '#e5303f',
    },
    material: {
      roughness: 0.78,
      metalness: 0,
      envMapIntensity: 0.55,
      clearcoat: 0,
      clearcoatRoughness: 1,
      iridescence: 0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
      sheen: 0.2,
      sheenColor: '#a09080',
      ior: 1.4,
      anisotropy: 0,
      anisotropyRotation: 0,
      specularIntensity: 0.6,
      specularColor: '#ffffff',
    },
    reticle: { color: '#ffffff', intensityScale: 1.2 },
  },
  {
    // Holographic — peacock-foil sticker material. Three layers doing the
    // work together (see themeTextures.ts):
    //   1. normalMap = fine radial grooves so the surface has visible "hair
    //      lines" that catch light like real holo cards / trading foils.
    //   2. anisotropyMap = per-pixel tangent-to-radius direction, so the
    //      stretched specular highlight sweeps in concentric arcs across
    //      the sticker as the cube rotates instead of forming a single
    //      linear streak.
    //   3. iridescence maxed out with a wide thickness range so the color
    //      sweeps through the full visible spectrum as view angle changes.
    // Base colors are the classic muted palette — high metalness would
    // wash saturated hues into gray, so we keep face identity by pushing
    // through the iridescent shift.
    id: 'holographic',
    name: 'Holographic',
    colors: {
      up: '#f8f8f2',
      down: '#f6c000',
      front: '#2a9d5c',
      back: '#1e5fb8',
      left: '#f77f00',
      right: '#d62828',
    },
    material: {
      roughness: 0.28,
      metalness: 0.85,
      envMapIntensity: 2.2,
      clearcoat: 0.4,
      clearcoatRoughness: 0.12,
      iridescence: 1.0,
      iridescenceIOR: 1.85,
      iridescenceThicknessRange: [100, 850],
      sheen: 0,
      sheenColor: '#ffffff',
      ior: 1.6,
      anisotropy: 1.0,
      anisotropyRotation: 0,
      specularIntensity: 1.0,
      specularColor: '#ffffff',
    },
    reticle: { color: '#ffffff', intensityScale: 1.1 },
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
