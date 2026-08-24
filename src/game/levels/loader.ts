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
  loadLevelInternal(level, false);
}

/**
 * Load a level as part of the first-run tutorial flow. Same as loadLevel()
 * but flips the isTutorialRun store flag so downstream HUD (LevelResultPanel,
 * PauseMenu) can adapt — no skip, no "Return to menu" mid-tutorial. See
 * src/game/tutorial.ts for the higher-level orchestration.
 */
export function loadTutorialLevel(level: Level): void {
  loadLevelInternal(level, true);
}

function loadLevelInternal(level: Level, tutorial: boolean): void {
  console.log('[tutorial] loadLevelInternal', level.id, 'tutorial=', tutorial);
  // Force-reset the move pipeline. We're about to snap the cube back to
  // solved and (optionally) apply a fresh scramble — any leftover queued
  // moves or a stuck busy flag from a prior session would only corrupt the
  // new level. Previously this was `if (hasWork()) return;` which silently
  // swallowed the click when a prior CubeScene unmounted mid-animation.
  moveQueue.clear();
  moveQueue.setBusy(false);
  const store = useGameStore.getState();
  store.reset();
  store.loadLevel(level);
  store.setTutorialRun(tutorial);
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
