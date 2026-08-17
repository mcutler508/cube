import { useGameStore } from '../../store/gameStore';
import { describeObjective } from '../../game/levels/labels';

/**
 * Small chip that names the current level's objective. Sits at the top-center
 * of the cube view so the player always knows what they're going for.
 */
export function ObjectiveBanner() {
  const level = useGameStore((s) => s.currentLevel);
  if (!level) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-4 pt-1.5">
      <div
        className="rounded-full bg-black/50 px-2.5 py-0.5 text-[8.5px] font-medium uppercase tracking-[0.22em] text-white/80 backdrop-blur-md ring-1 ring-white/10"
        style={{ marginTop: 'max(env(safe-area-inset-top), 0px)' }}
      >
        {describeObjective(level.objective)}
      </div>
    </div>
  );
}
