import type { ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';
import { SettingsPanel } from './SettingsPanel';

const IMAGE_URL = '/backgrounds/menu-clouds.png';

/**
 * Shared full-screen backdrop for the three main-menu views (Daily, Learn,
 * Algorithms). Paints the cloud illustration behind a dark radial vignette so
 * the existing white text on the menus stays legible while the artwork still
 * reads through — brighter in the center where the image's pale hole sits,
 * darker at the edges where colorful clouds would otherwise wash out labels.
 *
 * Also owns the global Settings entry point: a top-right gear opens the
 * SettingsPanel (backgrounds, theme, reticle style) from any main-menu view.
 * The panel itself is mounted here so it's available regardless of which
 * child menu (Daily / Learn / Algos) is currently visible.
 */
export function MenuBackdrop({ children }: { children: ReactNode }) {
  const openSettings = useGameStore((s) => s.openSettings);
  return (
    <div
      className="fixed inset-0 flex flex-col overflow-y-auto text-white"
      style={{
        backgroundColor: '#08090d',
        backgroundImage: `radial-gradient(ellipse at center, rgba(8,9,13,0.28) 0%, rgba(8,9,13,0.72) 100%), url("${IMAGE_URL}")`,
        backgroundSize: 'auto, cover',
        backgroundPosition: 'center, center',
        backgroundRepeat: 'no-repeat, no-repeat',
        backgroundAttachment: 'fixed, fixed',
      }}
    >
      <button
        type="button"
        onClick={openSettings}
        aria-label="Open settings"
        className="fixed right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white/80 ring-1 ring-white/[0.10] backdrop-blur-md transition-all hover:bg-white/[0.14] hover:text-white active:scale-95 sm:right-8"
        style={{ top: 'calc(max(env(safe-area-inset-top), 0.5rem) + 0.25rem)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.07a2 2 0 1 1-2.83 2.83l-.07-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.02 1.55V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.07.06a2 2 0 1 1-2.83-2.83l.06-.07a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1.02H3a2 2 0 1 1 0-4h.11A1.7 1.7 0 0 0 4.66 9a1.7 1.7 0 0 0-.34-1.87l-.06-.07a2 2 0 1 1 2.83-2.83l.07.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.02-1.55V3a2 2 0 1 1 4 0v.11A1.7 1.7 0 0 0 15 4.66a1.7 1.7 0 0 0 1.87-.34l.07-.06a2 2 0 1 1 2.83 2.83l-.06.07A1.7 1.7 0 0 0 19.34 9v.02a1.7 1.7 0 0 0 1.55 1.02H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.55 1z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {children}
      <SettingsPanel />
    </div>
  );
}
