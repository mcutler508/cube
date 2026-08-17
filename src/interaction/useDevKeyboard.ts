import { useEffect } from 'react';
import { enqueuePlayerMove } from '../animation/enqueue';
import type { FaceLetter } from '../types/cube';

const KEY_TO_FACE: Record<string, FaceLetter> = {
  r: 'R',
  l: 'L',
  u: 'U',
  d: 'D',
  f: 'F',
  b: 'B',
};

/**
 * Development-only keyboard shortcut: press R/L/U/D/F/B for a move; hold Shift
 * for the inverse. Only active in dev to make interaction testing easy without
 * a touch device.
 */
export function useDevKeyboard() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const face = KEY_TO_FACE[e.key.toLowerCase()];
      if (!face) return;
      enqueuePlayerMove({ face, turns: e.shiftKey ? -1 : 1 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
