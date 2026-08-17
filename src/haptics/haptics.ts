import type { GameEvent } from '../types/game';
import { gameEvents } from '../game/events';

/**
 * Haptics hooks. Uses the standard Vibration API where available; silently
 * no-ops on desktop and iOS Safari (which doesn't expose it). The app must
 * remain fully playable without haptics — treat these as pure sugar.
 */

let enabled = true;

export function setHapticsEnabled(v: boolean) {
  enabled = v;
}

export function isHapticsEnabled(): boolean {
  return enabled;
}

function pulse(pattern: number | number[]) {
  if (!enabled) return;
  const nav = typeof navigator === 'undefined' ? null : navigator;
  if (!nav || typeof nav.vibrate !== 'function') return;
  try {
    nav.vibrate(pattern);
  } catch {
    /* ignore — some browsers throw when calls come too fast */
  }
}

function handle(event: GameEvent) {
  if (!enabled) return;
  switch (event.type) {
    case 'moveCompleted':
      pulse(6);
      break;
    case 'faceCompleted':
      pulse([8, 20, 12]);
      break;
    case 'cubeSolved':
      pulse([15, 40, 25, 40, 40]);
      break;
    default:
      break;
  }
}

let subscribed = false;
export function initHaptics() {
  if (subscribed) return;
  subscribed = true;
  gameEvents.subscribe(handle);
}
