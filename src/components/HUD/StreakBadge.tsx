import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { streakLabel } from '../../game/streak';
import { useEventPulse } from '../../animation/triggers';

/**
 * Floating badge that only appears when the player is on a streak of 2+.
 * Pops with a subtle scale animation on each increase so the eye catches it
 * without needing constant on-screen chrome.
 */
export function StreakBadge() {
  const streak = useGameStore((s) => s.streak);
  const label = streakLabel(streak);
  const pulse = useEventPulse('streakIncreased');
  // Retain the last visible label for a moment after the streak breaks so
  // the badge fades gracefully instead of vanishing.
  const [visibleLabel, setVisibleLabel] = useState<string | null>(label);
  useEffect(() => {
    if (label) {
      setVisibleLabel(label);
    } else {
      const t = window.setTimeout(() => setVisibleLabel(null), 500);
      return () => window.clearTimeout(t);
    }
  }, [label]);

  if (!visibleLabel) return null;
  const active = label !== null;

  return (
    <div
      key={`streak-${pulse}`}
      className={[
        'select-none rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] transition-all duration-300',
        active
          ? 'bg-white text-black shadow-[0_0_28px_rgba(255,255,255,0.35)]'
          : 'bg-white/10 text-white/40',
      ].join(' ')}
      style={{
        animation: active ? 'streakpop 320ms cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
      }}
    >
      {visibleLabel}
      <style>{`
        @keyframes streakpop {
          0% { transform: scale(0.85) translateY(-2px); opacity: 0.6; }
          60% { transform: scale(1.08); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
