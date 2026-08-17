import { beforeEach, describe, expect, it } from 'vitest';
import {
  _resetAllBestsForTest,
  getLevelBest,
  recordCompletion,
} from '../persistence';

/**
 * Install a minimal in-memory localStorage on `globalThis.window` so the
 * persistence module (which reads `window.localStorage`) works under the
 * node test environment without pulling in jsdom.
 */
function installMemoryStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  };
  (globalThis as unknown as { window: { localStorage: Storage } }).window = {
    localStorage: storage as unknown as Storage,
  };
}

describe('personal-best persistence', () => {
  beforeEach(() => {
    installMemoryStorage();
    _resetAllBestsForTest();
  });

  it('first completion is always an update', () => {
    const r = recordCompletion({
      levelId: 'a',
      moves: 10,
      timeMs: 5000,
      stars: 2,
    });
    expect(r.updated).toBe(true);
    expect(r.best.completions).toBe(1);
    expect(r.best.bestMoves).toBe(10);
  });

  it('worse run does not overwrite best fields but still increments completions', () => {
    recordCompletion({ levelId: 'a', moves: 5, timeMs: 3000, stars: 3 });
    const r = recordCompletion({ levelId: 'a', moves: 12, timeMs: 8000, stars: 1 });
    expect(r.updated).toBe(false);
    expect(r.best.bestMoves).toBe(5);
    expect(r.best.bestTimeMs).toBe(3000);
    expect(r.best.bestStars).toBe(3);
    expect(r.best.completions).toBe(2);
  });

  it('improving only moves is an update', () => {
    recordCompletion({ levelId: 'a', moves: 8, timeMs: 4000, stars: 2 });
    const r = recordCompletion({ levelId: 'a', moves: 6, timeMs: 5000, stars: 2 });
    expect(r.updated).toBe(true);
    expect(r.best.bestMoves).toBe(6);
    // Slower time doesn't degrade the stored best.
    expect(r.best.bestTimeMs).toBe(4000);
  });

  it('per-level records are independent', () => {
    recordCompletion({ levelId: 'a', moves: 5, timeMs: 3000, stars: 3 });
    recordCompletion({ levelId: 'b', moves: 20, timeMs: 10000, stars: 1 });
    expect(getLevelBest('a')?.bestMoves).toBe(5);
    expect(getLevelBest('b')?.bestMoves).toBe(20);
  });

  it('returns null for levels that have never been completed', () => {
    expect(getLevelBest('never-played')).toBeNull();
  });
});
