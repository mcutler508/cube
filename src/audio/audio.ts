import type { GameEvent } from '../types/game';
import { gameEvents } from '../game/events';
import { useGameStore } from '../store/gameStore';
import { streakIntensity } from '../game/streak';
import { resumeAudio, tones } from './tones';

/**
 * Audio hooks. Subscribes to the gameEvents bus and drives the small tone
 * synth in `tones.ts`. Everything is fire-and-forget — audio is pure sugar.
 * Higher-tier events use richer chords/sequences to reinforce the feedback
 * escalation ladder.
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
  switch (event.type) {
    case 'moveCompleted':
      tones.move();
      break;
    case 'progressIncreased':
      // Reserve the "gain" ping for meaningful deltas so we don't ping on
      // every 1-2% wobble. Streak-scaled intensity thickens the tone.
      if (event.amount >= 3) {
        const streak = useGameStore.getState().streak;
        tones.progressGain(event.amount, streakIntensity(streak));
      }
      break;
    case 'rowCompleted':
      tones.rowComplete();
      break;
    case 'crossCompleted':
      tones.crossComplete();
      break;
    case 'faceCompleted':
      tones.faceComplete();
      break;
    case 'layerCompleted':
      tones.layerComplete();
      break;
    case 'objectiveCompleted':
      tones.objectiveComplete();
      break;
    case 'cubeSolved':
      tones.cubeSolved();
      break;
    case 'algorithmPerformed':
      // Reuse rowComplete for the first performance; chain > 1 gets crossComplete
      // for a richer sting so repeated triggers feel escalating.
      if (event.chain === 1) tones.rowComplete();
      else tones.crossComplete();
      break;
    // Intentional no-ops: negative/broken transitions and streak plumbing
    // stay silent — feedback should encourage, not punish.
    case 'progressDecreased':
    case 'faceBroken':
    case 'rowBroken':
    case 'crossBroken':
    case 'layerBroken':
    case 'streakIncreased':
    case 'streakBroken':
    case 'nearSolved':
      break;
  }
}

let subscribed = false;
export function initAudio() {
  if (subscribed) return;
  subscribed = true;
  gameEvents.subscribe(handle);
  // Kick the context awake on first pointerdown so mobile browsers permit
  // playback. We attach and detach in one shot — the resume itself is a
  // no-op after the first successful call.
  if (typeof window !== 'undefined') {
    const wake = () => {
      resumeAudio();
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
    window.addEventListener('pointerdown', wake, { once: true });
    window.addEventListener('keydown', wake, { once: true });
  }
}
