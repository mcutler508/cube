/**
 * Play-field background catalog. The cube canvas renders with a transparent
 * clear color; the level view's outer div paints one of these backgrounds
 * behind the canvas so the cube composites onto it. Solid backgrounds are
 * cheap; image backgrounds are served from /public/backgrounds/.
 */

export type BackgroundKind = 'solid' | 'image';

export interface CubeBackground {
  id: string;
  label: string;
  kind: BackgroundKind;
  /** Fallback solid color even for image backgrounds — painted while the
   *  image is still loading and used behind any transparent PNG regions. */
  color: string;
  /** Image URL (public path) when kind === 'image'. */
  src?: string;
  /**
   * Optional CSS layer(s) painted above the image but below the game HUD.
   * Used to add a vignette that blends the image into the surrounding color
   * and darkens edges for foreground legibility.
   */
  overlay?: string;
  /**
   * CSS `background-size` for the image layer. Defaults to `cover` (fills
   * viewport, may upscale). Use `contain` for lower-resolution sources so
   * the image renders close to native pixel density and stays sharp.
   */
  size?: string;
}

/**
 * Vignette painted above the starfield: transparent at the center so the
 * cube gets the cleanest read, hardening to the background color at the
 * edges so the letterboxed sides blend seamlessly into the image.
 */
const STARFIELD_OVERLAY =
  'radial-gradient(ellipse 70% 90% at center, rgba(5,7,22,0) 0%, rgba(5,7,22,0) 45%, rgba(5,7,22,0.85) 90%, rgba(5,7,22,1) 100%)';

export const BACKGROUNDS: CubeBackground[] = [
  {
    id: 'graphite',
    label: 'Graphite',
    kind: 'solid',
    color: '#0d0f13',
  },
  {
    id: 'starfield',
    label: 'Starfield',
    kind: 'image',
    color: '#050716',
    src: '/backgrounds/starfield.png',
    overlay: STARFIELD_OVERLAY,
    // Source is 1024x1024. `contain` renders it at close to native pixel
    // density on landscape viewports (letterboxed with #050716 on the
    // sides, blended by the vignette) — genuinely sharp rather than
    // upscaled-and-fuzzy.
    size: 'contain',
  },
];

export const DEFAULT_BACKGROUND_ID = 'graphite';

export function resolveBackground(id: string): CubeBackground {
  return BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
}
