import { useGameStore } from '../../store/gameStore';

/**
 * A soft inset glow that fades onto the cube canvas area when the player is
 * within ~90% of solved. Purely decorative CSS overlay — never intercepts
 * pointer input (pointer-events-none).
 */
export function NearSolvedGlow() {
  const isNear = useGameStore((s) => s.isNearSolved);
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] transition-opacity duration-700"
      style={{
        opacity: isNear ? 1 : 0,
        boxShadow:
          'inset 0 0 120px rgba(255, 240, 180, 0.35), inset 0 0 260px rgba(255, 210, 120, 0.18)',
      }}
    />
  );
}
