import { useEffect, useRef } from 'react';
import { viewOrientation } from '../../animation/viewOrientation';
import { FlipButton } from './FlipButton';

/**
 * Edge-to-edge tray at the bottom of the cube canvas that hosts the flip
 * button on the right and a rail-and-knob visual affordance on the left.
 *
 * The rail is *not* an input — it's a discoverability aid. The underlying
 * yaw drag already handles rotation on the cube canvas, and the tray keeps
 * pointer-events disabled so swipes fall through to the existing gesture
 * layer. The knob simply mirrors the drag while it's happening (and eases
 * back to the rail's center at rest), giving the player a visible target
 * that says "you can swipe left or right here."
 */
export function RotationTray() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex items-center gap-3 px-4"
      style={{
        bottom: 'max(env(safe-area-inset-bottom), 0.75rem)',
      }}
    >
      <SwipeRail />
      <FlipButton />
    </div>
  );
}

/**
 * Purely visual rail with a knob that follows the current yaw drag delta.
 * Uses rAF polling (no store subscription) since the underlying value comes
 * from an imperative controller updated per frame by the gesture layer.
 */
function SwipeRail() {
  const knobRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;
    /**
     * Radians of drag that map to the full ±half-rail travel. π/2 = a
     * quarter turn drives the knob to the very edge, matching the mental
     * model of "one full swipe = one side."
     */
    const RANGE_RAD = Math.PI / 2;

    const tick = () => {
      const knob = knobRef.current;
      const hint = hintRef.current;
      if (knob && hint) {
        const delta = viewOrientation.getDragDelta();
        const dragging = viewOrientation.isDragging();
        const clamped = Math.max(-1, Math.min(1, delta / RANGE_RAD));
        // Knob travel is expressed in percent of its own half-rail so we
        // don't need to measure the rail width imperatively.
        const px = clamped * 44; // rail is ~120px on each side of center
        knob.style.transform = `translateX(${px}px)`;
        // Dim the "swipe" hint text while the player is actively dragging —
        // they've discovered it; get out of the way.
        hint.style.opacity = dragging ? '0' : '0.55';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="relative flex h-14 flex-1 items-center overflow-hidden rounded-full bg-white/[0.05] ring-1 ring-white/10 backdrop-blur-md"
    >
      {/* Edge arrow hints */}
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
        <ChevronLeft />
      </div>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
        <ChevronRight />
      </div>
      {/* Center rail line */}
      <div className="pointer-events-none absolute inset-x-10 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-white/10" />
      {/* Swipe label — fades out while dragging */}
      <div
        ref={hintRef}
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55 transition-opacity duration-150"
      >
        Swipe to spin
      </div>
      {/* The knob — translated by drag delta */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          ref={knobRef}
          className="h-9 w-9 rounded-full bg-white/85 shadow-lg shadow-black/50 ring-1 ring-white/40 will-change-transform"
        />
      </div>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M9 2L4 7l5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M5 2l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
