import { useEffect, useRef, useState } from 'react';
import { gameEvents } from '../game/events';
import type { GameEvent } from '../types/game';

/**
 * Subscribe to a single event type. Handler is called synchronously when the
 * event fires. Cleaned up on unmount.
 */
export function useGameEvent<T extends GameEvent['type']>(
  type: T,
  handler: (event: Extract<GameEvent, { type: T }>) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const unsub = gameEvents.subscribe((e) => {
      if (e.type === type) handlerRef.current(e as Extract<GameEvent, { type: T }>);
    });
    return () => {
      unsub();
    };
  }, [type]);
}

/**
 * A pulse hook: returns a monotonic counter that increments each time the
 * given event fires. Components can `useEffect([pulse])` to trigger CSS
 * animations by remounting via key or by toggling a class.
 */
export function useEventPulse(type: GameEvent['type']): number {
  const [pulse, setPulse] = useState(0);
  useGameEvent(type, () => setPulse((p) => p + 1));
  return pulse;
}

/**
 * A "flash" hook: sets `active` to true when the event fires, then clears it
 * after `duration` ms. Great for CSS transitions that need a beat before
 * fading out.
 */
export function useEventFlash(type: GameEvent['type'], duration = 500): boolean {
  const [active, setActive] = useState(false);
  useGameEvent(type, () => {
    setActive(true);
    window.setTimeout(() => setActive(false), duration);
  });
  return active;
}
