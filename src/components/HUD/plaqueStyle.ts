import type { CSSProperties } from 'react';

/**
 * Encoded SVG (feTurbulence fractal noise) applied as a background image.
 * Rendered once, tiled by the browser — no runtime cost after first paint.
 * The `%23` escapes are `#` characters inside the SVG data URI.
 */
const GRAIN_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.16 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

/**
 * A handful of larger scuff marks baked in as blurred elliptical highlights.
 * Baked into a single SVG so the surface reads the same on every mount.
 */
const SCUFFS_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 60' preserveAspectRatio='none'><g fill='white' fill-opacity='0.05'><ellipse cx='60' cy='42' rx='22' ry='2'/><ellipse cx='190' cy='18' rx='32' ry='1.5'/><ellipse cx='305' cy='34' rx='18' ry='2'/><ellipse cx='355' cy='12' rx='14' ry='1'/><ellipse cx='120' cy='50' rx='10' ry='1'/></g><g fill='black' fill-opacity='0.28'><ellipse cx='90' cy='20' rx='16' ry='1'/><ellipse cx='240' cy='40' rx='24' ry='1.5'/><ellipse cx='330' cy='48' rx='12' ry='1'/></g></svg>\")";

/**
 * Layered background for the shared "weathered plaque" surface used by the
 * rotation tray and the flip button. Kept in its own module (rather than
 * exported from RotationTray) so the flip button can import it without
 * creating a circular import between the two.
 */
export const PLAQUE_SURFACE_STYLE: CSSProperties = {
  backgroundImage: [
    'radial-gradient(120% 60% at 50% -10%, rgba(255,255,255,0.09), transparent 60%)',
    'radial-gradient(120% 100% at 50% 130%, rgba(0,0,0,0.55), transparent 60%)',
    SCUFFS_URL,
    GRAIN_URL,
    'linear-gradient(180deg, #1a1a1e 0%, #101014 55%, #08080a 100%)',
  ].join(', '),
  backgroundSize: 'auto, auto, 100% 100%, 140px 140px, auto',
  backgroundRepeat: 'no-repeat, no-repeat, no-repeat, repeat, no-repeat',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.6), 0 6px 22px rgba(0,0,0,0.55)',
};
