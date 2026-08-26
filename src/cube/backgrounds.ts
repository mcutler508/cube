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

/**
 * Very light corner darken for the pastel-cloud artwork so the HUD chrome
 * (timer, menu button, undo) keeps enough contrast, without muting the
 * piece's bright center where the cube lives.
 */
const CLOUDS_OVERLAY =
  'radial-gradient(ellipse 85% 105% at center, rgba(14,10,18,0) 0%, rgba(14,10,18,0) 60%, rgba(14,10,18,0.45) 100%)';

/**
 * Stronger corner darken for the vibrant "melty" pieces — they're already
 * high contrast and highly saturated across the whole frame, so the outer
 * ~25% needs meaningful darken to keep HUD text and the cube's black-plastic
 * body legible.
 */
const MELTY_OVERLAY =
  'radial-gradient(ellipse 70% 90% at center, rgba(10,6,14,0) 0%, rgba(10,6,14,0) 45%, rgba(10,6,14,0.72) 92%, rgba(10,6,14,0.88) 100%)';

/**
 * Photorealistic cloud pieces (Cumulus, Moonrise) sit mid-tone and detailed
 * across most of the frame. A soft edge falloff to a neutral navy keeps the
 * artwork readable without any dark ring around it.
 */
const REAL_CLOUDS_OVERLAY =
  'radial-gradient(ellipse 90% 110% at center, rgba(6,10,20,0) 0%, rgba(6,10,20,0) 55%, rgba(6,10,20,0.55) 100%)';

export const BACKGROUNDS: CubeBackground[] = [
  {
    id: 'clouds',
    label: 'Clouds',
    kind: 'image',
    color: '#0e0a12',
    src: '/backgrounds/clouds.png',
    overlay: CLOUDS_OVERLAY,
    // Source is 1024x1024 (square). `cover` fills the viewport and crops the
    // long edges while preserving aspect — the pale center where the cube
    // sits stays in frame on both portrait and landscape, and neither axis
    // gets stretched.
    size: 'cover',
  },
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
    id: 'candy-skyline',
    label: 'Candy Skyline',
    kind: 'image',
    color: '#1b0a1f',
    src: '/backgrounds/candy-skyline.png',
    overlay: MELTY_OVERLAY,
    // Square 1024x1024 hand-drawn cloudscape with a bright pink center. Cover
    // keeps the pale hole behind the cube on both portrait and landscape.
    size: 'cover',
  },
  {
    id: 'coral-sunset',
    label: 'Coral Sunset',
    kind: 'image',
    color: '#100a1a',
    src: '/backgrounds/coral-sunset.png',
    overlay: MELTY_OVERLAY,
    // Square 1024x1024. Sunset glow sits high, reef textures below. Cover
    // centers the horizon roughly behind the cube.
    size: 'cover',
  },
  {
    id: 'neon-ruins',
    label: 'Neon Ruins',
    kind: 'image',
    color: '#0a0716',
    src: '/backgrounds/neon-ruins.png',
    overlay: MELTY_OVERLAY,
    // Square 1024x1024. Dense magenta + navy chaos across the whole frame,
    // so it leans hard on MELTY_OVERLAY to keep HUD legibility.
    size: 'cover',
  },
  {
    id: 'cumulus',
    label: 'Cumulus',
    kind: 'image',
    color: '#0a1220',
    src: '/backgrounds/cumulus.png',
    overlay: REAL_CLOUDS_OVERLAY,
    // Square photoreal cumulus at dusk. `cover` frames the towering cloud
    // stack roughly behind the cube; overlay is soft to keep the sky natural.
    size: 'cover',
  },
  {
    id: 'moonrise',
    label: 'Moonrise',
    kind: 'image',
    color: '#050914',
    src: '/backgrounds/moonrise.png',
    overlay: REAL_CLOUDS_OVERLAY,
    // Cinematic moonrise over clouds with a starfield. Cover works well —
    // the moon lands upper-right and the cloud mass frames the cube center.
    size: 'cover',
  },
  {
    id: 'moonveil',
    label: 'Moonveil',
    kind: 'image',
    color: '#0a0e1c',
    src: '/backgrounds/moonveil.png',
    overlay: REAL_CLOUDS_OVERLAY,
    // Native portrait 1520x3200 (aspect ~0.475). `cover` fills the
    // viewport on any orientation: near-zero crop on portrait mobile
    // (matching aspect), meaningful vertical crop on landscape but never
    // a black bar. Trades some cropping for guaranteed edge-to-edge.
    size: 'cover',
  },
  {
    id: 'pagoda-mist',
    label: 'Pagoda Mist',
    kind: 'image',
    color: '#0e131f',
    src: '/backgrounds/pagoda-mist.png',
    overlay: REAL_CLOUDS_OVERLAY,
    // Native portrait 1520x3200. Same `cover` strategy as Moonveil —
    // edge-to-edge on every orientation.
    size: 'cover',
  },
];

export const DEFAULT_BACKGROUND_ID = 'clouds';

export function resolveBackground(id: string): CubeBackground {
  return BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
}

/**
 * Compose the CSS `background` shorthand for a background. Layer order is
 * top-to-bottom in CSS: any overlay is painted above the image, and the
 * fallback solid color sits behind everything (visible until the image
 * loads and behind any letterboxed edges).
 *
 * NOTE: for video backgrounds the caller renders a <video> element instead
 * of using this string (CSS `background` can't carry a video source). Use
 * `bg.color` as the CSS fallback and mount the video separately.
 */
export function buildBackgroundCss(bg: CubeBackground): string {
  const layers: string[] = [];
  if (bg.overlay) layers.push(bg.overlay);
  if (bg.src) {
    const size = bg.size ?? 'cover';
    layers.push(`url("${bg.src}") center/${size} no-repeat`);
  }
  layers.push(bg.color);
  return layers.join(', ');
}
