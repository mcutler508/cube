import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import {
  hasSeenFlag,
  markFlagSeen,
  type OnboardingFlag,
} from '../../game/persistence';

/**
 * First-time contextual guidance. Teaches by presence rather than modals —
 * shows a tiny tip near the cube; marks it seen the moment the player takes
 * the corresponding action (e.g. their first swipe).
 *
 * Currently teaches one thing: how to swipe. Extensible via the flag map.
 */
export function OnboardingCoach() {
  const level = useGameStore((s) => s.currentLevel);
  const phase = useGameStore((s) => s.phase);
  const moveCount = useGameStore((s) => s.moveCount);
  const isScrambling = useGameStore((s) => s.isScrambling);

  // Read the flag once per component lifetime; if it was already seen we
  // never show the tip. Once the player makes a move we mark it seen.
  const [seenSwipe, setSeenSwipe] = useState<boolean>(() =>
    hasSeenFlag('seenSwipeTip'),
  );

  useEffect(() => {
    if (moveCount > 0 && !seenSwipe) {
      markFlagSeen('seenSwipeTip');
      setSeenSwipe(true);
    }
  }, [moveCount, seenSwipe]);

  const showSwipeTip =
    !seenSwipe &&
    level !== null &&
    phase !== 'solved' &&
    !isScrambling &&
    moveCount === 0;

  if (!showSwipeTip) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[9] flex justify-center px-4">
      <div
        className="flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-white/90 backdrop-blur-md ring-1 ring-white/15"
        style={{ animation: 'coachfloat 2.4s ease-in-out infinite' }}
      >
        <SwipeIcon />
        <span>Swipe a face to turn it</span>
      </div>
      <style>{`
        @keyframes coachfloat {
          0%, 100% { transform: translateY(0); opacity: 0.85; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SwipeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12h14M12 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Exported for potential future coach tips.
export type { OnboardingFlag };
