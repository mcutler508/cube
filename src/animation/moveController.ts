import type { Move } from '../types/cube';

type Kind = 'player' | 'scramble' | 'undo';

interface QueuedMove {
  move: Move;
  kind: Kind;
  /** Custom duration in seconds. If omitted, use the animator's default. */
  duration?: number;
  onCommitted?: () => void;
}

type Listener = () => void;

/**
 * A tiny module-level singleton that lets gesture handlers, UI buttons, and
 * scramble playback all push moves into the same queue. The Cube's animation
 * loop drains it. Kept as a plain object (not zustand) because per-frame reads
 * shouldn't trigger React updates.
 */
class MoveQueue {
  private queue: QueuedMove[] = [];
  private listeners = new Set<Listener>();
  private busy = false;

  push(item: QueuedMove) {
    this.queue.push(item);
    this.notify();
  }

  pushMany(items: QueuedMove[]) {
    this.queue.push(...items);
    this.notify();
  }

  shift(): QueuedMove | undefined {
    const item = this.queue.shift();
    if (item) this.notify();
    return item;
  }

  clear() {
    if (this.queue.length === 0) return;
    this.queue = [];
    this.notify();
  }

  size(): number {
    return this.queue.length;
  }

  setBusy(busy: boolean) {
    if (this.busy === busy) return;
    this.busy = busy;
    this.notify();
  }

  isBusy(): boolean {
    return this.busy;
  }

  hasWork(): boolean {
    return this.busy || this.queue.length > 0;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const moveQueue = new MoveQueue();
