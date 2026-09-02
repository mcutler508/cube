import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { exitToMenu } from '../../game/levels/loader';

type Mode = 'exit-app' | 'return-to-menu';

/**
 * Guards the browser back button. On mount we push a sentinel entry onto
 * history so the first `popstate` (e.g. the phone's back gesture) lands us
 * back on our own entry — at which point we open a confirm modal instead of
 * letting the browser leave the page.
 *
 * The modal has two modes depending on context:
 *  - Mid-level (and not the forced first-run tutorial): "Return to menu?"
 *    Confirm calls exitToMenu(); Stay re-arms the guard.
 *  - Menu / tutorial run: "Exit the app?" Confirm pops history once more to
 *    actually leave; Stay re-arms the guard.
 *
 * Deliberately mounted once at the top of App so it protects every screen.
 * The extra history entry is a one-time cost per session, invisible.
 */
export function ExitConfirmModal() {
  const [mode, setMode] = useState<Mode | null>(null);

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

      // Mid-level: confirm returning to menu, not exiting the app.
      // Tutorial run is exempt so the forced intro can't be skipped.
      const state = useGameStore.getState();
      const inLevel = !!state.currentLevel && !state.isTutorialRun;
      setMode(inLevel ? 'return-to-menu' : 'exit-app');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const stay = () => {
    // Re-push the sentinel so the next back gesture is intercepted again.
    window.history.pushState({ __cubeExitGuard: true }, '');
    setMode(null);
  };

  const confirm = () => {
    const current = mode;
    setMode(null);
    if (current === 'return-to-menu') {
      exitToMenu();
      // Stay in the app — re-arm the sentinel so back works again on the menu.
      window.history.pushState({ __cubeExitGuard: true }, '');
      return;
    }
    // exit-app: we're already one step behind the sentinel (popstate consumed
    // it), so a single back() takes us to whatever page was here before —
    // typically the tab's previous entry, or a blank tab that then closes.
    window.history.back();
  };

  if (!mode) return null;

  const isReturnToMenu = mode === 'return-to-menu';
  const title = isReturnToMenu ? 'Return to menu?' : 'Exit the app?';
  const body = isReturnToMenu
    ? 'Your progress on this level will be lost.'
    : 'Your progress on this level will be lost.';
  const confirmLabel = isReturnToMenu ? 'Return to menu' : 'Exit';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-confirm-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{
        background: 'rgba(6,8,12,0.55)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        animation: 'exitScrimIn 220ms ease-out',
      }}
    >
      <div
        className="premium-panel w-full max-w-xs p-5 text-white"
        style={{ animation: 'exitConfirmIn 260ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <h2
          id="exit-confirm-title"
          className="text-base font-semibold tracking-tight"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-white/60">{body}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={stay}
            className="premium-btn-primary flex-1"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={confirm}
            className="premium-btn-secondary flex-1"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes exitScrimIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes exitConfirmIn {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
