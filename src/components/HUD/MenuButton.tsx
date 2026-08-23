import { useGameStore } from '../../store/gameStore';

/**
 * Top-left button that opens the pause menu. Replaces the standalone
 * settings gear — settings now lives inside the pause menu alongside
 * restart / return-to-menu.
 */
export function MenuButton() {
  const openPauseMenu = useGameStore((s) => s.openPauseMenu);
  return (
    <div
      className="pointer-events-none absolute left-4 top-0 z-10 pt-1 sm:left-8"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}
    >
      <button
        type="button"
        onClick={openPauseMenu}
        aria-label="Open menu"
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/75 ring-1 ring-white/[0.08] backdrop-blur-md transition-all hover:bg-white/[0.12] hover:text-white active:scale-95"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
