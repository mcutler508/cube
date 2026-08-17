import { enqueueScrambleMoves } from '../../animation/enqueue';
import { moveQueue } from '../../animation/moveController';
import { useGameStore } from '../../store/gameStore';
import type { Level } from './types';

/**
 * Boot a level: reset the cube, install the level in the store, and animate
 * the setup moves in via the scramble pipeline. Once the queue drains, the
 * scramble flag is cleared so the first player move counts as move #1.
 *
 * Mirrors the existing `startScrambleWith` pattern in GameHUD so it plays
 * nicely with the same animation queue and busy-state subscribers.
 */
export function loadLevel(level: Level): void {
  if (moveQueue.hasWork()) return;
  const store = useGameStore.getState();
  store.reset();
  store.loadLevel(level);
  if (level.setupMoves.length === 0) return;
  store.beginScramble();
  enqueueScrambleMoves(level.setupMoves);
  const unsub = moveQueue.subscribe(() => {
    if (!moveQueue.hasWork()) {
      useGameStore.getState().endScramble();
      unsub();
    }
  });
}

export function restartCurrentLevel(): void {
  const level = useGameStore.getState().currentLevel;
  if (!level) return;
  loadLevel(level);
}

export function exitToMenu(): void {
  if (moveQueue.hasWork()) return;
  useGameStore.getState().exitToMenu();
}
