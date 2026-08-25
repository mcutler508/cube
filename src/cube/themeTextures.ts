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
// Graffiti Collage — the 2x2's signature look. Each face is a 1024² collage
// of BIG type stamps, halftone dots, stripes, tiny icon-like shapes, and
// spray speckles. Louder than base graffiti (more layers, bigger stamps,
// contrasting pattern strips) but with a critical constraint: the primary
// face color must dominate every 42%-sized sticker crop so lineup-by-color
// still works. We enforce that by (a) painting the base color first, (b)
// keeping every overlay semi-transparent, (c) restricting overlays to bands
// that occupy at most ~40% of the canvas area.
// ---------------------------------------------------------------------------

const COLLAGE_BG: Record<StickerSide, string> = {
  up: '#f4f2ea',
  down: '#ffcf1a',
  front: '#12a05a',
  back: '#1f5fd6',
  left: '#f57a1e',
  right: '#e5303f',
};

/** Contrast accent per face — used for text fills and shape outlines. */
const COLLAGE_ACCENT: Record<StickerSide, string> = {
  up: '#ff2f7a',
  down: '#3a1a90',
  front: '#00e5b5',
  back: '#ffb200',
  left: '#0088ff',
  right: '#00c86e',
};

/** A second accent so each face carries two overlay hues, not just one. */
const COLLAGE_ACCENT_2: Record<StickerSide, string> = {
  up: '#111827',
  down: '#e5303f',
  front: '#f4f2ea',
  back: '#ff2f7a',
  left: '#ffcf1a',
  right: '#111827',
};

const COLLAGE_TAGS: Record<StickerSide, readonly string[]> = {
  up: ['SKY', 'HI', 'CLOUD9'],
  down: ['GOLD', '24K', 'SHINE'],
  front: ['GO', 'GREEN', 'FRESH'],
  back: ['DEEP', 'BLU', 'DIVE'],
  left: ['ZEST', 'HOT', 'ORNJ'],
  right: ['RED', 'HOT', 'FIRE'],
};

function drawCollageIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  which: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.07);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = size;
  switch (which % 6) {
    case 0: {
      // Star burst
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = i % 2 === 0 ? s * 0.5 : s * 0.22;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 1: {
      // Lightning bolt
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.5);
      ctx.lineTo(-s * 0.35, s * 0.05);
      ctx.lineTo(-s * 0.05, s * 0.05);
      ctx.lineTo(-s * 0.2, s * 0.5);
      ctx.lineTo(s * 0.35, -s * 0.05);
      ctx.lineTo(s * 0.05, -s * 0.05);
      ctx.lineTo(s * 0.2, -s * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 2: {
      // Smiley
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.15, -s * 0.1, s * 0.06, 0, Math.PI * 2);
      ctx.arc(s * 0.15, -s * 0.1, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, s * 0.05, s * 0.22, 0, Math.PI);
      ctx.stroke();
      break;
    }
    case 3: {
      // Heart
      ctx.beginPath();
      ctx.moveTo(0, s * 0.4);
      ctx.bezierCurveTo(s * 0.6, -s * 0.05, s * 0.25, -s * 0.5, 0, -s * 0.1);
      ctx.bezierCurveTo(-s * 0.25, -s * 0.5, -s * 0.6, -s * 0.05, 0, s * 0.4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 4: {
      // Concentric rings
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 5: {
      // Arrow
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, 0);
      ctx.lineTo(s * 0.4, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.4, 0);
      ctx.lineTo(s * 0.15, -s * 0.25);
      ctx.lineTo(s * 0.15, s * 0.25);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function buildCollageFace(side: StickerSide): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('themeTextures: 2d canvas context unavailable');

  const bg = COLLAGE_BG[side];
  const accent = COLLAGE_ACCENT[side];
  const accent2 = COLLAGE_ACCENT_2[side];
  const accentRgb = hexToRgb(accent);
  const accent2Rgb = hexToRgb(accent2);
  const tags = COLLAGE_TAGS[side];
  const rand = seededRandom(SIDE_SEED[side] * 7 + 13);

  // 1. Base face color — the dominant read.
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // 2. Two narrow diagonal stripe bands, low-opacity accent2. Adds pattern
  // without dominating the color. Each band is ~size*0.12 wide.
  for (let band = 0; band < 2; band++) {
    const angle = -0.4 + rand() * 0.8;
    const cx = size * 0.5;
    const cy = size * (0.25 + band * 0.5 + (rand() - 0.5) * 0.15);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = `rgba(${accent2Rgb.r},${accent2Rgb.g},${accent2Rgb.b},0.18)`;
    ctx.fillRect(-size, -size * 0.06, size * 2, size * 0.12);
    // Diagonal hatching over the band for texture.
    ctx.strokeStyle = `rgba(${accent2Rgb.r},${accent2Rgb.g},${accent2Rgb.b},0.35)`;
    ctx.lineWidth = 3;
    for (let sx = -size; sx < size; sx += 22) {
      ctx.beginPath();
      ctx.moveTo(sx, -size * 0.06);
      ctx.lineTo(sx + 40, size * 0.06);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Halftone dot cluster in one corner — a classic collage motif.
  {
    const gx = rand() < 0.5 ? size * 0.15 : size * 0.75;
    const gy = rand() < 0.5 ? size * 0.15 : size * 0.75;
    for (let i = 0; i < 90; i++) {
      const dx = (i % 12) * 22;
      const dy = Math.floor(i / 12) * 22;
      const r = 3 + rand() * 6;
      ctx.fillStyle = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.55)`;
      ctx.beginPath();
      ctx.arc(gx + dx, gy + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Big chunky tag stamps — the loudest layer. Each stamp gets black
  // outline + accent fill + a couple of drip streaks.
  const stamps = 4;
  for (let i = 0; i < stamps; i++) {
    const tag = tags[i % tags.length];
    const cx = 150 + rand() * (size - 300);
    const cy = 200 + rand() * (size - 400);
    const angle = -0.3 + rand() * 0.6;
    const font = 160 + Math.floor(rand() * 90);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.font = `900 ${font}px "Impact", "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 16;
    ctx.strokeStyle = 'rgba(10,10,10,0.92)';
    ctx.strokeText(tag, 0, 0);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeText(tag, -2, -2);
    ctx.fillStyle = accent;
    ctx.fillText(tag, 0, 0);
    for (let d = 0; d < 2; d++) {
      const dx = -font * 0.35 + rand() * font * 0.7;
      const dyStart = font * 0.25 + rand() * 10;
      const len = 40 + rand() * 90;
      const g = ctx.createLinearGradient(0, dyStart, 0, dyStart + len);
      g.addColorStop(0, accent);
      g.addColorStop(1, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(dx, dyStart, 6 + rand() * 4, len);
    }
    ctx.restore();
  }

  // 5. A handful of icon-like shapes scattered around — pretend "stickers
  // on stickers". Alternating between the two accent colors so the collage
  // feels curated, not monochromatic-with-tags.
  const icons = 6;
  for (let i = 0; i < icons; i++) {
    const x = 100 + rand() * (size - 200);
    const y = 100 + rand() * (size - 200);
    const s = 60 + rand() * 60;
    const color = i % 2 === 0 ? accent : accent2;
    // Halve alpha for icons that landed on/near a stamp so they don't
    // become unreadable clutter. Cheap heuristic: just apply globalAlpha.
    ctx.save();
    ctx.globalAlpha = 0.78;
    drawCollageIcon(ctx, x, y, s, color, Math.floor(rand() * 6));
    ctx.restore();
  }

  // 6. Spray speckle field — accent1, low alpha. Ties the layers together.
  for (let i = 0; i < 1400; i++) {
    const alpha = 0.12 + rand() * 0.28;
    ctx.fillStyle = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${alpha})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }

  // 7. Faint scratches for surface grain.
  ctx.strokeStyle = 'rgba(0,0,0,0.10)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.moveTo(rand() * size, rand() * size);
    ctx.lineTo(rand() * size, rand() * size);
    ctx.stroke();
  }

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------------------
// Holographic — the "peacock foil" sticker look. Two maps working together:
//   - normalMap: fine radial grooves radiating from the sticker's center,
//     giving the surface visible directional texture (the "hair lines" you
//     see on real holo stickers / trading cards).
//   - anisotropyMap: per-pixel direction of maximum specular stretch, set
//     to the tangent of the radial pattern so highlights sweep around in
//     concentric arcs as the cube rotates.
// Combined with high iridescence in the theme material, the result is a
// prismatic rainbow shift that follows the grooves.
// ---------------------------------------------------------------------------

function buildHoloNormal(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('themeTextures: 2d canvas context unavailable');
  const img = ctx.createImageData(size, size);

  const cx = size / 2;
  const cy = size / 2;
  // Number of angular grooves around the full circle. Higher = finer hair.
  const grooves = 96;
  // Wave modulation strength — organic wobble in the otherwise-perfect
  // sunburst so the pattern doesn't read as too mechanical.
  const wobble = 0.7;

  const heightAt = (x: number, y: number): number => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    // Fine radial ridges + slow radial modulation so it doesn't strobe.
    return (
      0.5 * Math.sin(angle * grooves + Math.sin(r * 0.06) * wobble) +
      0.15 * Math.sin(r * 0.9)
    );
  };

  const strength = 12;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hL = heightAt(x - 1, y);
      const hR = heightAt(x + 1, y);
      const hU = heightAt(x, y - 1);
      const hD = heightAt(x, y + 1);
      const dhdx = (hR - hL) * strength;
      const dhdy = (hD - hU) * strength;
      const nx = -dhdx;
      const ny = -dhdy;
      const nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const i = (y * size + x) * 4;
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

function buildHoloAnisotropy(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('themeTextures: 2d canvas context unavailable');
  const img = ctx.createImageData(size, size);
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      // Anisotropy vector = tangent to the radial pattern (perpendicular to
      // the radius). Degenerate case at exact center: pick an arbitrary
      // stable direction so we don't ship NaN pixels.
      let tx: number;
      let ty: number;
      if (r < 1) {
        tx = 1;
        ty = 0;
      } else {
        tx = -dy / r;
        ty = dx / r;
      }
      const i = (y * size + x) * 4;
      img.data[i] = (tx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ty * 0.5 + 0.5) * 255;
      img.data[i + 2] = 255; // full anisotropy strength across the sticker
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

/** Optional normal map for the given theme. Currently only used by the
 *  holographic theme (fine radial grooves). */
export function getStickerNormalMap(themeId: ThemeId): THREE.Texture | null {
  if (themeId !== 'holographic') return null;
  const key = 'holo-normal';
  const cached = cache.get(key);
  if (cached) return cached;
  const t = buildHoloNormal();
  cache.set(key, t);
  return t;
}

/** Optional anisotropy direction map for the given theme. Currently only
 *  used by the holographic theme (tangent-to-radius field). */
export function getStickerAnisotropyMap(themeId: ThemeId): THREE.Texture | null {
  if (themeId !== 'holographic') return null;
  const key = 'holo-anisotropy';
  const cached = cache.get(key);
  if (cached) return cached;
  const t = buildHoloAnisotropy();
  cache.set(key, t);
  return t;
}

/** Optional base color map for the given (theme, side). Returns null when
 *  the theme uses solid color (existing themes). */
export function getStickerMap(
  themeId: ThemeId,
  side: StickerSide,
): THREE.Texture | null {
  if (themeId === 'graffiti') {
    const key = `graffiti-${side}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const t = buildGraffitiFace(side);
    cache.set(key, t);
    return t;
  }
  if (themeId === 'graffiti-collage') {
    const key = `graffiti-collage-${side}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const t = buildCollageFace(side);
    cache.set(key, t);
    return t;
  }
  return null;
}
