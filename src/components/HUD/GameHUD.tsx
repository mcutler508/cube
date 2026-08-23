import { useGameStore } from '../../store/gameStore';
import { SolvedSequence } from './SolvedSequence';
import { StreakBadge } from './StreakBadge';
import { formatElapsed, useLiveTimer } from './useLiveTimer';

/**
 * The top overlay sits inside the cube canvas region and shows the essentials:
 *   - Timer (top-right)
 *   - Progress meter beneath it
 *   - Move count
 *   - Streak badge (when active)
 *   - Objective banner (rendered separately in App.tsx, top-center)
 */
function TopBarSlot() {
  const elapsed = useLiveTimer();
  const time = formatElapsed(elapsed);

  return (
    <div
      className="pointer-events-none absolute right-4 top-0 z-10 flex flex-col items-end gap-1 pt-1 sm:right-8"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}
    >
      <div
        className="font-mono text-xl tabular-nums leading-none text-white/95 drop-shadow sm:text-3xl"
        style={{ letterSpacing: '-0.01em' }}
      >
        {time}
      </div>
      <StreakBadge />
    </div>
  );
}

function SolvedOverlaySlot() {
  const phase = useGameStore((s) => s.phase);
  if (phase !== 'solved') return null;
  return <SolvedSequence />;
}

export const GameHUD = {
  TopBarSlot,
  SolvedOverlaySlot,
};
