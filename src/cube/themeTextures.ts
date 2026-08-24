import * as THREE from 'three';
import type { StickerSide } from './colors';
import type { ThemeId } from './themes';

/**
 * Procedural CanvasTextures used by the "frosted" and "graffiti" themes.
 * Follows the same lazy-cached pattern as reticleStyles.ts — textures are
 * built on first request and reused for every sticker mount thereafter.
 *
 * Kept in a separate module from themes.ts so themes.ts stays pure data
 * (no THREE dependency, safe for tests / SSR that don't have `document`).
 */

const cache = new Map<string, THREE.CanvasTexture>();

// ---------------------------------------------------------------------------
// Frosted glass — a soft low-frequency noise map used as `roughnessMap`.
// The base roughness in the theme sets the average frost; this map wobbles
// it locally so highlights break up like real sandblasted glass instead of
// reading as a uniform matte plane.
// ---------------------------------------------------------------------------

function buildFrostedRoughness(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('themeTextures: 2d canvas context unavailable');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      // Two overlapping sine bands + fine grain. The sines give the eye a
      // sense of "seeded frost patterns"; the grain hides the sine banding.
      let n = 0;
      n += Math.sin(u * 22.0 + v * 13.7) * 0.5;
      n += Math.sin(u * 47.3 - v * 31.1 + 1.7) * 0.3;
      n += (Math.random() - 0.5) * 0.4;
      const val = Math.max(0, Math.min(255, 128 + n * 127 * 0.6));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------------------
// Graffiti — one 1024² "wall" per face, densely covered with tag stamps,
// drips, scratches, and spray speckles over the face color. Every sticker
// samples a random ~42% crop of its face texture (see Sticker.tsx), so:
//   - The face color is still the dominant read on every sticker.
//   - No two stickers on the same face show the exact same crop.
//   - The look is "graffiti-covered colored tile", not "black wall".
// ---------------------------------------------------------------------------

/** Per-face background (the color that identifies the face). Uses the
 *  vibrant palette rather than the muted classic set — graffiti is loud. */
const GRAFFITI_BG: Record<StickerSide, string> = {
  up: '#f0efe8',
  down: '#ffcf1a',
  front: '#12a05a',
  back: '#1f5fd6',
  left: '#f57a1e',
  right: '#e5303f',
};

/** Contrast color for tag fills / speckles on each face. Picked to pop
 *  against the background without being pure black — real spray paint is
 *  never true black either. */
const GRAFFITI_ACCENT: Record<StickerSide, string> = {
  up: '#ff2f7a',
  down: '#3a1a90',
  front: '#00e5b5',
  back: '#ffb200',
  left: '#0088ff',
  right: '#00c86e',
};

const GRAFFITI_TAGS: Record<StickerSide, readonly string[]> = {
  up: ['RIP', 'OK', 'X'],
  down: ['ZEN', 'YZ', '$'],
  front: ['REX', 'GO', '!'],
  back: ['MOB', 'BB', '*'],
  left: ['KID', 'OR', '?'],
  right: ['ACE', 'RR', '#'],
};

function hexToRgb(h: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

/**
 * Simple seeded RNG so the same face always paints the same layout across
 * page reloads (would be jarring if the graffiti danced around on refresh).
 */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const SIDE_SEED: Record<StickerSide, number> = {
  up: 101, down: 202, front: 303, back: 404, left: 505, right: 606,
};

function buildGraffitiFace(side: StickerSide): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('themeTextures: 2d canvas context unavailable');

  const bg = GRAFFITI_BG[side];
  const accent = GRAFFITI_ACCENT[side];
  const accentRgb = hexToRgb(accent);
  const tags = GRAFFITI_TAGS[side];
  const rand = seededRandom(SIDE_SEED[side]);

  // 1. Base face color.
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // 2. Subtle grunge — very light dark/light dots. Keeps face color dominant.
  for (let i = 0; i < 6000; i++) {
    const a = 0.03 + rand() * 0.07;
    const lum = rand() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${lum},${lum},${lum},${a})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }

  // 3. Faint scratches for wall texture.
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.moveTo(rand() * size, rand() * size);
    ctx.lineTo(rand() * size, rand() * size);
    ctx.stroke();
  }

  // 4. Tag stamps scattered across the canvas so every 42% crop lands on at
  // least one legible fragment. Chunky sans-serif with black outline + accent
  // fill + a couple of drips below each. Kept small enough (~180px) that face
  // color still shows around them.
  const stamps = 7;
  for (let i = 0; i < stamps; i++) {
    const tag = tags[i % tags.length];
    const cx = 100 + rand() * (size - 200);
    const cy = 140 + rand() * (size - 240);
    const angle = -0.25 + rand() * 0.5;
    const font = 140 + Math.floor(rand() * 80);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.font = `900 ${font}px "Impact", "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    // Chunky black outline
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(12,12,12,0.92)';
    ctx.strokeText(tag, 0, 0);
    // Highlight ridge (cheap fake 3D)
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeText(tag, -2, -2);
    // Fill
    ctx.fillStyle = accent;
    ctx.fillText(tag, 0, 0);
    // Drips
    for (let d = 0; d < 2 + Math.floor(rand() * 2); d++) {
      const dx = -font * 0.35 + rand() * font * 0.7;
      const dyStart = font * 0.25 + rand() * 10;
      const len = 30 + rand() * 80;
      const g = ctx.createLinearGradient(0, dyStart, 0, dyStart + len);
      g.addColorStop(0, accent);
      g.addColorStop(1, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(dx, dyStart, 5 + rand() * 3, len);
    }
    ctx.restore();
  }

  // 5. Spray speckle field across the whole canvas, in accent color.
  // Semi-transparent so face color still shows through.
  for (let i = 0; i < 1500; i++) {
    const alpha = 0.15 + rand() * 0.35;
    ctx.fillStyle = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${alpha})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Optional roughness map for the given theme. Returns null when the theme
 *  wants a uniform roughness (existing themes). */
export function getStickerRoughnessMap(themeId: ThemeId): THREE.Texture | null {
  if (themeId !== 'frosted') return null;
  const key = 'frosted-roughness';
  const cached = cache.get(key);
  if (cached) return cached;
  const t = buildFrostedRoughness();
  cache.set(key, t);
  return t;
}

/** Optional base color map for the given (theme, side). Returns null when
 *  the theme uses solid color (existing themes). */
export function getStickerMap(
  themeId: ThemeId,
  side: StickerSide,
): THREE.Texture | null {
  if (themeId !== 'graffiti') return null;
  const key = `graffiti-${side}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const t = buildGraffitiFace(side);
  cache.set(key, t);
  return t;
}
