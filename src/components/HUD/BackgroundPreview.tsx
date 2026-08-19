import type { CubeBackground } from '../../cube/backgrounds';

/**
 * Picker card for a play-field background. Renders a small preview tile
 * showing either the solid color or the actual background image (cover-cropped)
 * so what you see in the settings drawer is what you get on the cube screen.
 */
export function BackgroundPreview({
  background,
  selected,
  onSelect,
}: {
  background: CubeBackground;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Select ${background.label} background`}
      className={`group relative flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition-colors ${
        selected
          ? 'bg-white/10 ring-2 ring-emerald-400/80'
          : 'bg-white/[0.04] ring-1 ring-white/5 hover:bg-white/[0.07]'
      }`}
    >
      {selected && (
        <span
          aria-hidden
          className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-black"
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
        className="relative overflow-hidden rounded-lg ring-1 ring-black/40"
        style={{
          width: 96,
          height: 60,
          backgroundColor: background.color,
          backgroundImage: background.src ? `url(${background.src})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="text-[11px] font-medium leading-tight text-white/90">
        {background.label}
      </div>
    </button>
  );
}
