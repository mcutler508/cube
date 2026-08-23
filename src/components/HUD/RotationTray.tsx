import { useEffect, useRef } from 'react';
import { viewOrientation } from '../../animation/viewOrientation';
import { useGameStore } from '../../store/gameStore';
import { FlipButton } from './FlipButton';
import { PLAQUE_SURFACE_STYLE } from './plaqueStyle';

/**
 * Edge-to-edge tray at the bottom of the cube canvas — a weathered dark
 * plaque with etched signage. Left region is the swipe surface (visual only,
 * pointer events pass through to the gesture layer); right region hosts the
 * flip button.
 *
 * Aesthetic: dark metal + fine grain noise + subtle scuff marks + faint
 * emboss on all lettering. A luminous streak sweeps across the swipe surface
 * in the direction of the current yaw drag, borrowing the "light catching
 * worn metal" feel of the reference.
 */
export function RotationTray() {
  // Hide the whole tray during guided drills — orbit + flip are locked so
  // the cube stays in canonical orientation. Showing the tray under a
  // "swipe to spin" label that no longer responds would just confuse the
  // player mid-drill.
  const orientationLocked = useGameStore(
    (s) =>
      !!(
        s.currentLevel?.drill &&
        s.drillState &&
        s.drillState.phase === 'guided' &&
        !s.objectiveCompleted
      ),
  );
  if (orientationLocked) return null;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex items-stretch gap-2 px-3"
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
 * The swipe surface. Purely visual — pointer events fall through to the
 * gesture layer beneath. A luminous streak follows the current drag delta.
 */
function SwipeRail() {
  const glowRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const leftChevRef = useRef<HTMLDivElement | null>(null);
  const rightChevRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;
    /**
     * Radians of drag that map to the full ±half-rail travel. π/2 = a
     * quarter turn drives the glow to the very edge, matching the mental
     * model of "one full swipe = one side."
     */
    const RANGE_RAD = Math.PI / 2;

    const tick = () => {
      const glow = glowRef.current;
      const hint = hintRef.current;
      const leftChev = leftChevRef.current;
      const rightChev = rightChevRef.current;
      if (glow && hint && leftChev && rightChev) {
        const delta = viewOrientation.getDragDelta();
        const dragging = viewOrientation.isDragging();
        const clamped = Math.max(-1, Math.min(1, delta / RANGE_RAD));
        const intensity = Math.min(1, Math.abs(clamped) * 1.6);
        // Glow position: centered when idle, chases the drag when active.
        glow.style.transform = `translate(calc(-50% + ${clamped * 40}%), -50%)`;
        glow.style.opacity = dragging ? String(0.15 + intensity * 0.75) : '0';
        // Bias the label out of the way once the user is actively swiping.
        hint.style.opacity = dragging ? '0' : '1';
        // Highlight the chevron on the side we're heading toward.
        leftChev.style.opacity = String(0.35 + Math.max(0, -clamped) * 0.55);
        rightChev.style.opacity = String(0.35 + Math.max(0, clamped) * 0.55);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="relative flex h-14 flex-1 items-center overflow-hidden rounded-2xl"
      style={PLAQUE_SURFACE_STYLE}
    >
      {/* Glow streak — mirrors the drag */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          ref={glowRef}
          className="absolute left-1/2 top-1/2 h-24 w-40 rounded-full opacity-0 blur-2xl will-change-transform"
          style={{
            background:
              'radial-gradient(closest-side, rgba(255,236,190,0.85), rgba(255,214,120,0.3) 45%, transparent 75%)',
            transform: 'translate(-50%, -50%)',
            transition: 'opacity 140ms ease-out',
          }}
        />
      </div>

      {/* Etched chevrons */}
      <div
        ref={leftChevRef}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-opacity duration-150"
        style={etchedStyle}
      >
        <ChevronLeft />
      </div>
      <div
        ref={rightChevRef}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-opacity duration-150"
        style={etchedStyle}
      >
        <ChevronRight />
      </div>

      {/* Etched center label */}
      <div
        ref={hintRef}
        className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150"
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.32em]"
          style={{
            color: 'rgba(220, 210, 195, 0.42)',
            textShadow:
              '0 1px 0 rgba(0,0,0,0.9), 0 -1px 0 rgba(255,255,255,0.05)',
          }}
        >
          Swipe to spin
        </span>
      </div>
    </div>
  );
}

/**
 * Style applied to etched markings — dulls the fill and adds a dark drop
 * shadow to fake depth into the metal surface.
 */
const etchedStyle: React.CSSProperties = {
  color: 'rgba(220, 210, 195, 0.5)',
  filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.85))',
};

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
