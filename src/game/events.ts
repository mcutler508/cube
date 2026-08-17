import type { GameEvent } from '../types/game';

type Listener = (event: GameEvent) => void;

/**
 * A tiny synchronous event bus. The cube engine emits semantic events here;
 * presentation code (animations, audio, haptics) subscribes without the engine
 * ever knowing about them. Keep this pure — no React, no side effects.
 */
class GameEventBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: GameEvent): void {
    // Snapshot listeners so a subscriber that unsubscribes during dispatch
    // doesn't skip the rest of the queue.
    for (const l of Array.from(this.listeners)) l(event);
  }
}

export const gameEvents = new GameEventBus();
