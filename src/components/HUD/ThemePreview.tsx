import type { CubeTheme } from '../../cube/themes';

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
          <MiniFace transform={`rotateX(90deg) translateZ(${HALF}px)`} color={c.up} brightness={1.1} material={theme.material} />
          <MiniFace transform={`translateZ(${HALF}px)`} color={c.front} brightness={1} material={theme.material} />
          <MiniFace transform={`rotateY(90deg) translateZ(${HALF}px)`} color={c.right} brightness={0.66} material={theme.material} />
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
  material,
}: {
  transform: string;
  color: string;
  brightness: number;
  material: CubeTheme['material'];
}) {
  // Derive the face treatment from material metrics:
  //   - Low roughness → sharp specular ribbon along the top edge.
  //   - High metalness → cleaner face with almost no dark seam.
  //   - High roughness / low metalness → matte body, prominent dark seam
  //     (the classic Rubik's raised-tile look).
  const glossy = material.roughness < 0.25;
  const specular = glossy
    ? 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 8%, rgba(255,255,255,0) 22%),'
    : 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 30%),';
  const seamShadow = glossy
    ? 'inset 0 -3px 6px rgba(0,0,0,0.15)'
    : 'inset 0 -6px 10px rgba(0,0,0,0.35)';
  const border = glossy ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.45)';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform,
        background: `${specular} ${color}`,
        filter: `brightness(${brightness})`,
        boxShadow: `inset 0 0 0 1px ${border}, ${seamShadow}`,
      }}
    />
  );
}
