import type { GameEvent } from '../types/game';
import { gameEvents } from '../game/events';

/**
 * Audio hooks. Currently every event maps to a no-op — the sound design pass
 * will replace these with real sample playback. Kept as a single subscribe
 * point so the rest of the app never imports Web Audio directly.
 */

let enabled = true;

export function setAudioEnabled(v: boolean) {
  enabled = v;
}

export function isAudioEnabled(): boolean {
  return enabled;
}

function handle(event: GameEvent) {
  if (!enabled) return;
  // Placeholders — intentional no-ops. Kept as an exhaustive switch so a
  // future developer sees the full list of audio moments in one place.
  switch (event.type) {
    case 'moveCompleted':
    case 'progressIncreased':
    case 'progressDecreased':
    case 'faceCompleted':
    case 'faceBroken':
    case 'streakIncreased':
    case 'streakBroken':
    case 'nearSolved':
    case 'cubeSolved':
      break;
  }
}

let subscribed = false;
export function initAudio() {
  if (subscribed) return;
  subscribed = true;
  gameEvents.subscribe(handle);
}
