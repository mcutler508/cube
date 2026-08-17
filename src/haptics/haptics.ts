import type { GameEvent } from '../types/game';
import { gameEvents } from '../game/events';

/**
 * Haptics hooks. Uses the standard Vibration API where available; silently
 * no-ops on desktop and iOS Safari (which doesn't expose it). The app must
 * remain fully playable without haptics — treat these as pure sugar.
 *
 * Patterns escalate roughly with the feedback-tier ladder in the PRD:
 * move → row → cross → face → layer → objective → cube solve.
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
    case 'rowCompleted':
      pulse([6, 30, 8]);
      break;
    case 'crossCompleted':
      pulse([10, 30, 14]);
      break;
    case 'faceCompleted':
      pulse([8, 20, 12]);
      break;
    case 'layerCompleted':
      pulse([12, 30, 18, 30, 14]);
      break;
    case 'objectiveCompleted':
      pulse([14, 40, 20, 40, 20]);
      break;
    case 'cubeSolved':
      pulse([15, 40, 25, 40, 40]);
      break;
    case 'algorithmPerformed':
      // Snap on the trigger; heavier snap for chains so repetition feels good.
      pulse(event.chain === 1 ? [8, 20, 10] : [10, 20, 14, 20, 10]);
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
