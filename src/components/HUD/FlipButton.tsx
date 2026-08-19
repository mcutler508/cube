import { useEffect, useState } from 'react';
import { viewOrientation } from '../../animation/viewOrientation';

/**
 * Flip button — swaps the vertical pole between white-up and yellow-up.
 *
 * Positioned at the bottom-right of the cube playfield, above the HUD chrome,
 * where the right thumb naturally rests on portrait mobile. Two-thumb solves
 * only ever use two orientations (white top or yellow top), so this button
 * plus the horizontal snap-yaw drag cover the entire rotation vocabulary.
 */
export function FlipButton() {
  // Force a re-render on each flip so the label reflects the target pole
  // without threading orientation into the global store.
  const [flipped, setFlipped] = useState(viewOrientation.isFlipped());

  useEffect(() => {
    // No event bus from the controller yet — poll cheaply while the button
    // is mounted. RAF-cost, only reads a boolean, no thrash.
    let raf = 0;
    const loop = () => {
      const cur = viewOrientation.isFlipped();
      setFlipped((prev) => (prev === cur ? prev : cur));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const topColor = flipped ? '#f5d90a' : '#f4f4f5';
  const bottomColor = flipped ? '#f4f4f5' : '#f5d90a';

  return (
    <button
      type="button"
      onClick={() => viewOrientation.flip()}
      aria-label={flipped ? 'Flip to white on top' : 'Flip to yellow on top'}
      className="pointer-events-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/8 backdrop-blur-md ring-1 ring-white/15 shadow-lg shadow-black/40 transition-transform active:scale-90"
    >
      <div className="flex flex-col items-center justify-center gap-[3px]">
        <div
          className="h-[10px] w-[22px] rounded-[3px] transition-colors"
          style={{ backgroundColor: topColor }}
        />
        <svg
          width="18"
          height="10"
          viewBox="0 0 18 10"
          fill="none"
          className="opacity-70"
        >
          <path
            d="M2 3.5A5 5 0 0 1 9 1M16 6.5A5 5 0 0 1 9 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M9 1l2-1.5M9 9l-2 1.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <div
          className="h-[10px] w-[22px] rounded-[3px] transition-colors"
          style={{ backgroundColor: bottomColor }}
        />
      </div>
    </button>
  );
}
