import type { ReactNode } from 'react';

const IMAGE_URL = '/backgrounds/menu-clouds.png';

/**
 * Shared full-screen backdrop for the three main-menu views (Daily, Learn,
 * Algorithms). Paints the cloud illustration behind a dark radial vignette so
 * the existing white text on the menus stays legible while the artwork still
 * reads through — brighter in the center where the image's pale hole sits,
 * darker at the edges where colorful clouds would otherwise wash out labels.
 */
export function MenuBackdrop({ children }: { children: ReactNode }) {
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
      {children}
    </div>
  );
}
