import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

/**
 * Returns the elapsed milliseconds for the current attempt, updating ~15 times
 * per second while the timer is running so React re-renders stay cheap.
 */
export function useLiveTimer(): number {
  const startedAt = useGameStore((s) => s.startedAt);
  const endedAt = useGameStore((s) => s.endedAt);
  const pausedAt = useGameStore((s) => s.pausedAt);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (startedAt === null || endedAt !== null || pausedAt !== null) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 66);
    return () => window.clearInterval(id);
  }, [startedAt, endedAt, pausedAt]);

  if (startedAt === null) return 0;
  // pausedAt takes precedence — clock freezes at the moment the pause menu
  // opened. On resume, closePauseMenu shifts startedAt so the elapsed value
  // continues from the frozen number rather than jumping forward.
  const end = pausedAt ?? endedAt ?? performance.now();
  return Math.max(0, end - startedAt);
}

export function formatElapsed(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  const wholeSeconds = Math.floor(seconds);
  const hundredths = Math.floor((seconds - wholeSeconds) * 100);
  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(
    hundredths,
  ).padStart(2, '0')}`;
}
