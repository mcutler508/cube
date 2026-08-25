/**
 * Feature gate for the experimental fidget-spinner mode. The mode is hidden
 * in production unless the user has flipped the flag. Three enable paths:
 *
 *   1. Dev builds (`import.meta.env.DEV`) — always on so iteration is friction-free.
 *   2. `?fidget=1` in the URL — persists the flag to localStorage and strips
 *      the param, so a single link opens the mode for a preview cohort.
 *   3. Manual set: `localStorage.setItem('cube.fidget.enabled', '1')`.
 *
 * Kept out of the persisted Settings object on purpose — this is a prototype
 * gate, not a user-facing preference (yet).
 */

const STORAGE_KEY = 'cube.fidget.enabled';
const QUERY_PARAM = 'fidget';

let cached: boolean | null = null;

export function isFidgetEnabled(): boolean {
  if (cached !== null) return cached;
  cached = resolve();
  return cached;
}

function resolve(): boolean {
  if (typeof window === 'undefined') return false;
  if (import.meta.env?.DEV) return true;

  try {
    const url = new URL(window.location.href);
    const flag = url.searchParams.get(QUERY_PARAM);
    if (flag === '1' || flag === 'true') {
      window.localStorage.setItem(STORAGE_KEY, '1');
      url.searchParams.delete(QUERY_PARAM);
      window.history.replaceState({}, '', url.toString());
      return true;
    }
    if (flag === '0' || flag === 'false') {
      window.localStorage.removeItem(STORAGE_KEY);
      url.searchParams.delete(QUERY_PARAM);
      window.history.replaceState({}, '', url.toString());
      return false;
    }
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
