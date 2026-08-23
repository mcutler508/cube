import * as THREE from 'three';
import type { FaceLetter } from '../types/cube';

/**
 * Pre-rendered canvas textures for the U/D/R/L/F/B labels shown on center
 * stickers during guided drills. Six tiny transparent canvases with a single
 * white letter each — reused across every mount so we allocate at most once
 * per label per session.
 *
 * The letter is drawn white on transparent so a plane using it as an alpha
 * map + emissive map reads as a subtle white glow on any sticker color.
 */

const CACHE: Partial<Record<FaceLetter, THREE.CanvasTexture>> = {};

const TEXTURE_SIZE = 128;

export function getCenterLabelTexture(face: FaceLetter): THREE.CanvasTexture {
  const cached = CACHE[face];
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 78px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(face, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2 + 3);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  CACHE[face] = tex;
  return tex;
}
