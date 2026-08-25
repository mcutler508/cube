import { useGameStore } from '../store/gameStore';
import { FidgetScene } from './FidgetScene';

/**
 * Full-screen host for the experimental fidget-spinner mode. Renders the
 * iridescent cube canvas edge-to-edge with a single Back affordance overlay.
 * Kept intentionally chrome-light so the object stays the focus.
 */
export function FidgetLanding() {
  const setMenuView = useGameStore((s) => s.setMenuView);
  return (
    <div
      className="fixed inset-0 h-full w-full overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 50% 45%, #23283a 0%, #0a0c11 55%, #05070a 100%)',
      }}
    >
      <FidgetScene />

      <button
        type="button"
        onClick={() => setMenuView('daily')}
        className="absolute left-4 top-4 rounded-full bg-white/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80 ring-1 ring-white/15 backdrop-blur transition-all hover:bg-white/[0.14] active:scale-95"
        style={{ top: 'calc(1rem + max(env(safe-area-inset-top), 0px))' }}
      >
        ← Back
      </button>

      <div
        className="pointer-events-none absolute bottom-6 left-0 right-0 text-center text-[10px] uppercase tracking-[0.3em] text-white/40"
        style={{ bottom: 'calc(1.5rem + max(env(safe-area-inset-bottom), 0px))' }}
      >
        Swipe to spin · tap to catch
      </div>
    </div>
  );
}
