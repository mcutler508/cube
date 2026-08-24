import type { CubeTheme } from '../../cube/themes';

type PreviewVariant =
  | 'matte'
  | 'glass'
  | 'iridescent'
  | 'frosted'
  | 'graffiti'
  | 'holographic';

function resolveVariant(theme: CubeTheme): PreviewVariant {
  if (theme.id === 'graffiti') return 'graffiti';
  if (theme.id === 'holographic') return 'holographic';
  if ((theme.material.transmission ?? 0) > 0.5) return 'frosted';
  if (theme.material.clearcoat > 0.5 && theme.material.roughness < 0.1) return 'glass';
  if (theme.material.iridescence >= 0.75) return 'iridescent';
  return 'matte';
}

/**
 * A pure CSS preview card for a cube theme. Deliberately does NOT mount the
 * Three.js cube — the picker sits in Settings and rendering a real WebGL scene
 * per card would be silly overhead. Instead: a lightweight isometric cube
 * built from CSS 3D transforms, plus a strip of the six theme colors.
 *
 * The mini-face styling is derived from the theme's material metrics so
 * glossy/metallic themes look visibly glassier in the preview than matte
 * plastic ones — otherwise the two cards read as "same box, different color".
 */
export function ThemePreview({
  theme,
  selected,
  onSelect,
}: {
  theme: CubeTheme;
  selected: boolean;
  onSelect: () => void;
}) {
  const CUBE = 72;
  const HALF = CUBE / 2;
  const c = theme.colors;
  const variant = resolveVariant(theme);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Select ${theme.name} theme`}
      className={`group relative flex flex-col items-center gap-3 rounded-2xl p-4 transition-colors ${
        selected
          ? 'bg-white/10 ring-2 ring-emerald-400/80'
          : 'bg-white/[0.04] ring-1 ring-white/5 hover:bg-white/[0.07]'
      }`}
    >
      {selected && (
        <span
          aria-hidden
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-black"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1.5 5.2l2.2 2.2L8.5 2.4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}

      <div
        style={{ width: CUBE, height: CUBE, perspective: 360 }}
        className="my-1 flex items-center justify-center"
      >
        <div
          style={{
            position: 'relative',
            width: CUBE,
            height: CUBE,
            transformStyle: 'preserve-3d',
            transform: 'rotateX(-26deg) rotateY(-34deg)',
          }}
        >
          <MiniFace transform={`rotateX(90deg) translateZ(${HALF}px)`} color={c.up} brightness={1.1} variant={variant} />
          <MiniFace transform={`translateZ(${HALF}px)`} color={c.front} brightness={1} variant={variant} />
          <MiniFace transform={`rotateY(90deg) translateZ(${HALF}px)`} color={c.right} brightness={0.66} variant={variant} />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {(['up', 'down', 'front', 'back', 'left', 'right'] as const).map((side) => (
          <span
            key={side}
            aria-label={side}
            className="h-3.5 w-3.5 rounded-sm ring-1 ring-black/40"
            style={{ background: c[side] }}
          />
        ))}
      </div>

      <div className="text-sm font-medium text-white/95">{theme.name}</div>
    </button>
  );
}

function MiniFace({
  transform,
  color,
  brightness,
  variant,
}: {
  transform: string;
  color: string;
  brightness: number;
  variant: PreviewVariant;
}) {
  // Five distinct treatments so cards in the picker read as different
  // *materials*, not just different colors:
  //   - Glass: tight top highlight + wet rim glow.
  //   - Iridescent: prismatic conic overlay + amber rim.
  //   - Frosted: broad milky bloom + soft inner-rim glow (light diffusion).
  //   - Graffiti: face color + tiny fake tag stamp + spray speckles.
  //   - Matte plastic: soft sheen only, prominent seam.
  const layers: string[] = [];

  if (variant === 'glass') {
    layers.push('radial-gradient(ellipse at 30% 15%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 12%, rgba(255,255,255,0) 32%)');
    layers.push('linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 22%)');
    layers.push('linear-gradient(0deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 30%)');
  } else if (variant === 'iridescent') {
    layers.push('linear-gradient(135deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.55) 40%, rgba(255,255,255,0) 60%)');
    layers.push('conic-gradient(from 210deg at 35% 25%, rgba(255,90,180,0.55), rgba(90,220,255,0.5), rgba(255,230,120,0.55), rgba(180,90,255,0.55), rgba(255,90,180,0.55))');
    layers.push('linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 30%)');
  } else if (variant === 'frosted') {
    // Inner-glow read: broad centered bloom (as if a colored LED is behind
    // the frost) + a bright milky top-corner sheen. Face color remains
    // visible around the edges so it doesn't wash to white.
    layers.push('radial-gradient(circle at 50% 55%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.20) 35%, rgba(255,255,255,0) 65%)');
    layers.push('radial-gradient(circle at 30% 20%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.20) 20%, rgba(255,255,255,0) 45%)');
    layers.push('linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0.06) 100%)');
  } else if (variant === 'holographic') {
    // Holo card read: full-spectrum conic sweep + concentric rings of light
    // hinting at the radial groove structure. Much heavier prismatic color
    // than the "iridescent" branch since the real theme's iridescence is
    // maxed and the anisotropy map spreads highlights across the surface.
    layers.push('conic-gradient(from 30deg at 55% 40%, rgba(255,80,180,0.65), rgba(80,220,255,0.65), rgba(180,255,140,0.65), rgba(255,220,120,0.65), rgba(200,120,255,0.65), rgba(255,80,180,0.65))');
    layers.push('repeating-radial-gradient(circle at 55% 45%, rgba(255,255,255,0.10) 0 2px, rgba(0,0,0,0) 2px 5px)');
    layers.push('linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 30%)');
  } else if (variant === 'graffiti') {
    // Fake spray speckles + a suggestion of a drip; keeps most of the face
    // color visible per user constraint.
    layers.push('radial-gradient(circle at 25% 30%, rgba(0,0,0,0.35) 0 3%, transparent 4%)');
    layers.push('radial-gradient(circle at 70% 40%, rgba(255,255,255,0.45) 0 2.5%, transparent 3.5%)');
    layers.push('radial-gradient(circle at 55% 75%, rgba(0,0,0,0.30) 0 3%, transparent 4%)');
    layers.push('linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 30%)');
  } else {
    layers.push('linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 38%)');
  }

  const seamShadow =
    variant === 'glass' ? 'inset 0 -4px 8px rgba(0,0,0,0.22)'
    : variant === 'iridescent' ? 'inset 0 -3px 6px rgba(0,0,0,0.20)'
    : variant === 'frosted' ? 'inset 0 0 12px rgba(255,255,255,0.35)'
    : variant === 'graffiti' ? 'inset 0 -5px 9px rgba(0,0,0,0.35)'
    : variant === 'holographic' ? 'inset 0 -3px 6px rgba(0,0,0,0.25)'
    : 'inset 0 -6px 10px rgba(0,0,0,0.4)';
  const border =
    variant === 'glass' ? 'rgba(255,255,255,0.4)'
    : variant === 'iridescent' ? 'rgba(255,255,255,0.25)'
    : variant === 'frosted' ? 'rgba(255,255,255,0.55)'
    : variant === 'graffiti' ? 'rgba(0,0,0,0.55)'
    : variant === 'holographic' ? 'rgba(255,255,255,0.35)'
    : 'rgba(0,0,0,0.45)';
  const rim =
    variant === 'glass' ? ', 0 0 14px rgba(180,230,255,0.55), 0 0 4px rgba(255,255,255,0.4)'
    : variant === 'iridescent' ? ', 0 0 10px rgba(255,160,120,0.45)'
    : variant === 'frosted' ? ', 0 0 16px rgba(255,255,255,0.35)'
    : variant === 'holographic' ? ', 0 0 12px rgba(200,120,255,0.5), 0 0 4px rgba(120,220,255,0.4)'
    : '';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform,
        background: `${layers.join(', ')}, ${color}`,
        filter: `brightness(${brightness})`,
        boxShadow: `inset 0 0 0 1px ${border}, ${seamShadow}${rim}`,
      }}
    />
  );
}
