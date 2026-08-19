import * as THREE from 'three';

/**
 * Direction-indicator styles that overlay every sticker to hint at drag axes.
 * Selected via Settings > Direction indicator. Each style is drawn
 * procedurally onto a small canvas at load time and used as both the alpha
 * mask and emissive map on a single plane per sticker (see Sticker.tsx).
 *
 * Adding a style: append to STYLE_IDS, add a case to `drawReticle`, and add
 * a metadata entry to RETICLE_STYLES.
 */

export const STYLE_IDS = [
  'hud',
  'scan',
  'ink',
  'arcade',
  'circuit',
  'compass',
] as const;

export type ReticleStyleId = (typeof STYLE_IDS)[number];

export interface ReticleStyle {
  id: ReticleStyleId;
  label: string;
  description: string;
}

export const RETICLE_STYLES: ReticleStyle[] = [
  { id: 'hud',     label: 'HUD Crosshair', description: 'Corner brackets and center cross' },
  { id: 'scan',    label: 'Scan Lines',    description: 'Dashed axes with a bright core' },
  { id: 'ink',     label: 'Ink Brush',     description: 'Tapered brush-stroke bars' },
  { id: 'arcade',  label: 'Energy Arrows', description: 'Chevrons cueing each spin axis' },
  { id: 'circuit', label: 'Neon Circuit',  description: 'Traces with endpoint pads' },
  { id: 'compass', label: 'Compass',       description: 'Rhombus frame with cardinal pips' },
];

export const DEFAULT_RETICLE_STYLE_ID: ReticleStyleId = 'hud';

/** Coerce an arbitrary string (e.g. from persisted settings) to a known id. */
export function resolveReticleStyle(id: string): ReticleStyleId {
  return (STYLE_IDS as readonly string[]).includes(id)
    ? (id as ReticleStyleId)
    : DEFAULT_RETICLE_STYLE_ID;
}

const TEXTURE_SIZE = 256;
const LOGICAL_SIZE = 100;

/**
 * Paint the reticle for `style` in a 100x100 logical coordinate space.
 * Caller must have already scaled the context so 1 logical unit == 1 canvas
 * unit (or applied ctx.scale). Fills are opaque white; the material uses this
 * as an alpha/emissive mask and tints via material.emissive.
 */
export function drawReticle(
  ctx: CanvasRenderingContext2D,
  style: ReticleStyleId,
): void {
  ctx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);

  switch (style) {
    case 'hud':     drawHud(ctx); return;
    case 'scan':    drawScan(ctx); return;
    case 'ink':     drawInk(ctx); return;
    case 'arcade':  drawArcade(ctx); return;
    case 'circuit': drawCircuit(ctx); return;
    case 'compass': drawCompass(ctx); return;
  }
}

// ---------- individual painters ----------

function drawHud(ctx: CanvasRenderingContext2D): void {
  ctx.lineWidth = 1.8;
  strokePath(ctx, [[14, 22], [14, 14], [22, 14]]);
  strokePath(ctx, [[86, 22], [86, 14], [78, 14]]);
  strokePath(ctx, [[14, 78], [14, 86], [22, 86]]);
  strokePath(ctx, [[86, 78], [86, 86], [78, 86]]);
  strokeLine(ctx, 30, 50, 70, 50);
  strokeLine(ctx, 50, 30, 50, 70);
  ctx.lineWidth = 1.4;
  strokeLine(ctx, 6, 50, 11, 50);
  strokeLine(ctx, 89, 50, 94, 50);
  strokeLine(ctx, 50, 6, 50, 11);
  strokeLine(ctx, 50, 89, 50, 94);
  fillCircle(ctx, 50, 50, 1.6);
}

function drawScan(ctx: CanvasRenderingContext2D): void {
  ctx.lineWidth = 1.6;
  ctx.setLineDash([6, 4]);
  ctx.globalAlpha = 0.6;
  strokeLine(ctx, 14, 50, 86, 50);
  strokeLine(ctx, 50, 14, 50, 86);
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2.4;
  strokeLine(ctx, 42, 50, 58, 50);
  strokeLine(ctx, 50, 42, 50, 58);
  fillCircle(ctx, 50, 50, 1.8);
}

function drawInk(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(15, 50);
  ctx.quadraticCurveTo(25, 47, 50, 46);
  ctx.quadraticCurveTo(75, 47, 85, 50);
  ctx.quadraticCurveTo(75, 53, 50, 54);
  ctx.quadraticCurveTo(25, 53, 15, 50);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(50, 15);
  ctx.quadraticCurveTo(47, 25, 46, 50);
  ctx.quadraticCurveTo(47, 75, 50, 85);
  ctx.quadraticCurveTo(53, 75, 54, 50);
  ctx.quadraticCurveTo(53, 25, 50, 15);
  ctx.closePath();
  ctx.fill();
}

function drawArcade(ctx: CanvasRenderingContext2D): void {
  fillPolygon(ctx, [[60, 46], [78, 46], [78, 42], [88, 50], [78, 58], [78, 54], [60, 54]]);
  fillPolygon(ctx, [[40, 46], [22, 46], [22, 42], [12, 50], [22, 58], [22, 54], [40, 54]]);
  fillPolygon(ctx, [[46, 40], [46, 22], [42, 22], [50, 12], [58, 22], [54, 22], [54, 40]]);
  fillPolygon(ctx, [[46, 60], [46, 78], [42, 78], [50, 88], [58, 78], [54, 78], [54, 60]]);
  fillCircle(ctx, 50, 50, 2.4);
}

function drawCircuit(ctx: CanvasRenderingContext2D): void {
  ctx.lineWidth = 1.2;
  strokeLine(ctx, 50, 50, 18, 50);
  strokeLine(ctx, 50, 50, 82, 50);
  strokeLine(ctx, 50, 50, 50, 18);
  strokeLine(ctx, 50, 50, 50, 82);
  fillRoundedRect(ctx, 15, 47, 6, 6, 1);
  fillRoundedRect(ctx, 79, 47, 6, 6, 1);
  fillRoundedRect(ctx, 47, 15, 6, 6, 1);
  fillRoundedRect(ctx, 47, 79, 6, 6, 1);
  fillCircle(ctx, 50, 50, 3);
}

function drawCompass(ctx: CanvasRenderingContext2D): void {
  ctx.lineWidth = 1.4;
  ctx.save();
  ctx.translate(50, 50);
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-24, -24, 48, 48);
  ctx.restore();
  strokeLine(ctx, 42, 50, 58, 50);
  strokeLine(ctx, 50, 42, 50, 58);
  fillCircle(ctx, 50, 17, 2);
  fillCircle(ctx, 50, 83, 2);
  fillCircle(ctx, 17, 50, 2);
  fillCircle(ctx, 83, 50, 2);
}

// ---------- primitive helpers ----------

function strokeLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function strokePath(
  ctx: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
): void {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
}

function fillPolygon(
  ctx: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
): void {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function fillCircle(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

// ---------- texture cache ----------

const textureCache = new Map<ReticleStyleId, THREE.CanvasTexture>();

/**
 * Return a cached CanvasTexture for the given style, building it on first
 * request. Safe to call every render — cached refs are stable.
 */
export function getReticleTexture(style: ReticleStyleId): THREE.CanvasTexture {
  const cached = textureCache.get(style);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('reticleStyles: 2d canvas context unavailable');
  }
  const scale = TEXTURE_SIZE / LOGICAL_SIZE;
  ctx.scale(scale, scale);
  drawReticle(ctx, style);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  textureCache.set(style, texture);
  return texture;
}
