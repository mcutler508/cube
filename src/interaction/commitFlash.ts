/**
 * Lightweight commit-flash pulse. Set `commitFlash.lastAt` when a layer turn
 * commits; subscribers read `performance.now() - lastAt` each frame to decide
 * how bright their pulse should be. Deliberately mutable global so per-sticker
 * useFrame callbacks don't need to re-subscribe.
 */
export const commitFlash = {
  lastAt: -Infinity,
  fire(): void {
    this.lastAt = performance.now();
  },
};

/** Duration of the flash pulse in milliseconds. */
export const COMMIT_FLASH_DURATION_MS = 220;

/**
 * Returns a 0..1 flash intensity that decays from 1 at `lastAt` to 0 after
 * COMMIT_FLASH_DURATION_MS. Used to modulate traceline opacity so every
 * sticker briefly brightens when a layer turn commits.
 */
export function currentFlashIntensity(nowMs: number): number {
  const elapsed = nowMs - commitFlash.lastAt;
  if (elapsed < 0 || elapsed >= COMMIT_FLASH_DURATION_MS) return 0;
  const t = elapsed / COMMIT_FLASH_DURATION_MS;
  // Ease-out cubic on decay.
  const remaining = 1 - t;
  return remaining * remaining * remaining;
}
