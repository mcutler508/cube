/**
 * Play-field background catalog. The cube canvas renders with a transparent
 * clear color; the level view's outer div paints one of these backgrounds
 * behind the canvas so the cube composites onto it. Solid backgrounds are
 * cheap; image backgrounds are served from /public/backgrounds/.
 */

export type BackgroundKind = 'solid' | 'image' | 'video';

export interface CubeBackground {
  id: string;
  label: string;
  kind: BackgroundKind;
  /** Fallback solid color for every kind — painted while assets load and
   *  behind any transparent regions. */
  color: string;
  /** Image URL (public path) for `image` kind, and used as the still-frame
   *  poster / picker thumbnail for `video` kind. */
  src?: string;
  /** Video URL (public path) when kind === 'video'. Muted, looping, autoplay. */
  videoSrc?: string;
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

const AURORA_OVERLAY =
  'radial-gradient(ellipse 70% 90% at center, rgba(6,4,10,0) 0%, rgba(6,4,10,0) 45%, rgba(6,4,10,0.85) 90%, rgba(6,4,10,1) 100%)';

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
    // Source is 1024x1024. `auto 100%` sizes the image to viewport height
    // (aspect preserved). On landscape this letterboxes the sides — blended
    // to #050716 by the vignette — at close to native pixel density. On
    // portrait it fills top-to-bottom and crops the sides (also masked by
    // the vignette) so the play field isn't dominated by an empty band
    // above the cube.
    size: 'auto 100%',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    kind: 'image',
    color: '#06040a',
    src: '/backgrounds/aurora.png',
    overlay: AURORA_OVERLAY,
    // Source is 816x1456 (portrait). `auto 100%` fills viewport height and
    // lets the sides letterbox to #06040a (blended by the vignette). On
    // portrait mobile this shows most of the swirl; on landscape it stays
    // sharp with wider dark bars on either side.
    size: 'auto 100%',
  },
  {
    id: 'aurora-live',
    label: 'Aurora Live',
    kind: 'video',
    color: '#06040a',
    // Still-frame poster (shown during the video's initial load and used as
    // the picker thumbnail so the settings drawer stays snappy).
    src: '/backgrounds/aurora.png',
    videoSrc: '/backgrounds/aurora.mp4',
    overlay: AURORA_OVERLAY,
  },
];

export const DEFAULT_BACKGROUND_ID = 'graphite';

export function resolveBackground(id: string): CubeBackground {
  return BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
}
