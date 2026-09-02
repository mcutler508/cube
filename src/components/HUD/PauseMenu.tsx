import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { exitToMenu, restartCurrentLevel } from '../../game/levels/loader';
import { moveQueue } from '../../animation/moveController';

/**
 * Full-screen pause overlay. Opened by the top-left menu button. Freezes the
 * run timer (via the pausedAt state), scrims + blurs the cube behind, and
 * exposes the level-scope actions: resume, restart, return to menu.
 *
 * Settings (backgrounds, theme, reticle) live on the main-menu backdrop so
 * they're globally scoped rather than mid-level cosmetics; this overlay
 * stays deliberately narrow to level-scoped actions.
 *
 * Clicking the scrim, hitting Escape, or pressing the phone back gesture
 * closes the menu (history-marker pattern mirrors SettingsPanel).
 */
export function PauseMenu() {
  const isOpen = useGameStore((s) => s.isPauseMenuOpen);
  const close = useGameStore((s) => s.closePauseMenu);
  const isTutorialRun = useGameStore((s) => s.isTutorialRun);

  useEffect(() => {
    if (!isOpen) return;
    const marker = { __pauseMenu: true } as const;
    window.history.pushState(marker, '');
    const onPop = () => close();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      const s = window.history.state as { __pauseMenu?: boolean } | null;
      if (s && s.__pauseMenu) window.history.back();
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  const onRestart = () => {
    if (moveQueue.hasWork()) return;
    close();
    restartCurrentLevel();
  };

  const onExit = () => {
    if (moveQueue.hasWork()) return;
    close();
    exitToMenu();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Paused"
    >
      <button
        type="button"
        aria-label="Resume"
        onClick={close}
        className="absolute inset-0 animate-[scrimIn_200ms_ease-out]"
        style={{
          background: 'rgba(6,8,12,0.55)',
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        }}
      />
      <div
        className="premium-panel relative z-10 w-[min(22rem,88vw)] p-5 animate-[menuIn_260ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="flex items-center justify-between pb-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50">
            Paused
          </span>
          <button
            type="button"
            aria-label="Resume"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/75 transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.06)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.1)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <MenuButton onClick={close} label="Resume" primary />
          <MenuButton onClick={onRestart} label="Restart level" />
          {/* Return-to-menu is hidden during the forced first-run tutorial —
              the two intro levels are enforced, no skip. */}
          {!isTutorialRun && (
            <MenuButton onClick={onExit} label="Return to menu" tone="danger" />
          )}
        </div>
      </div>
      <style>{`
        @keyframes scrimIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes menuIn {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  );
}

function MenuButton({
  onClick,
  label,
  primary,
  tone,
}: {
  onClick: () => void;
  label: string;
  primary?: boolean;
  tone?: 'danger';
}) {
  const cls = primary
    ? 'premium-btn-primary w-full'
    : tone === 'danger'
      ? 'premium-btn-danger w-full'
      : 'premium-btn-secondary w-full';
  return (
    <button type="button" onClick={onClick} className={cls}>
      {label}
    </button>
  );
}
