import { useGameStore } from '../../store/gameStore';
import { FlipButton } from './FlipButton';

/**
 * Bottom-right anchored flip button. Previously this tray also hosted a wide
 * "Swipe to spin" plaque, but that visual read as chrome without adding a
 * usable target (the gesture layer beneath already handles yaw drags across
 * the whole playfield), so it was removed.
 */
export function RotationTray() {
  // Hide during guided drills — orbit + flip are locked so the cube stays
  // in canonical orientation.
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
      className="pointer-events-none absolute inset-x-0 z-20 flex items-stretch justify-end px-3"
      style={{
        bottom: 'max(env(safe-area-inset-bottom), 0.75rem)',
      }}
    >
      <FlipButton />
    </div>
  );
}
