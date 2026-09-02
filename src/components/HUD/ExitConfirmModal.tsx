import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { exitToMenu } from '../../game/levels/loader';

/**
 * Guards the browser back button. On mount we push a sentinel entry onto
 * history so the first `popstate` (e.g. the phone's back gesture) lands us
 * back on our own entry — at which point we react instead of letting the
 * browser leave the page.
 *
 * Back-gesture behavior depends on where the user is:
 *  - Mid-level (and not the forced first-run tutorial): return to the main
 *    menu. Prompting "Exit the app?" while solving surprised users who
 *    expected a normal in-app back.
 *  - Menu / tutorial run: open the confirm modal. Choosing "Exit" pops
 *    once more to actually leave; "Stay" re-arms the guard.
 *
 * Deliberately mounted once at the top of App so it protects every screen.
 * The extra history entry is a one-time cost per session, invisible.
 */
export function ExitConfirmModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Sentinel entry: after this pushState, the top of history is our guard.
    // A subsequent back gesture pops it and fires `popstate` — but the tab
    // stays put because there's still a real entry beneath.
    window.history.pushState({ __cubeExitGuard: true }, '');

    const onPop = (e: PopStateEvent) => {
      // Nested overlays (PauseMenu, SettingsPanel) push their own markers on
      // top of our sentinel and call `history.back()` on close. That pop lands
      // us *back on* the exit guard — event.state still carries our marker.
      // Only treat this as an exit intent when the pop went *past* the guard.
      const s = e.state as { __cubeExitGuard?: boolean } | null;
      if (s && s.__cubeExitGuard) return;

      // Mid-level: back = return to menu, not "exit the app".
      // Tutorial run is exempt so the forced intro can't be skipped.
      const state = useGameStore.getState();
      if (state.currentLevel && !state.isTutorialRun) {
        exitToMenu();
        // Re-arm the sentinel so the next back on the menu is intercepted.
        window.history.pushState({ __cubeExitGuard: true }, '');
        return;
      }
      setOpen(true);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const stay = () => {
    // Re-push the sentinel so the next back gesture is intercepted again.
    window.history.pushState({ __cubeExitGuard: true }, '');
    setOpen(false);
  };

  const exit = () => {
    setOpen(false);
    // We're already one step behind the sentinel (popstate consumed it), so
    // a single back() takes us to whatever page was here before the app —
    // typically the tab's previous entry, or a blank tab that then closes.
    window.history.back();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-confirm-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-[#101218] p-5 text-white ring-1 ring-white/10 shadow-2xl shadow-black/60"
        style={{ animation: 'exitConfirmIn 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <h2
          id="exit-confirm-title"
          className="text-base font-semibold tracking-tight"
        >
          Exit the app?
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Your progress on this level will be lost.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={stay}
            className="flex-1 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-all active:scale-[0.98]"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={exit}
            className="flex-1 rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/85 ring-1 ring-white/10 transition-all hover:bg-white/[0.1] active:scale-[0.98]"
          >
            Exit
          </button>
        </div>
      </div>
      <style>{`
        @keyframes exitConfirmIn {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
