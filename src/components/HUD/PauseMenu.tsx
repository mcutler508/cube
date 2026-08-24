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
        className="absolute inset-0 bg-black/65 backdrop-blur-md animate-[scrimIn_180ms_ease-out]"
      />
      <div
        className="relative z-10 w-[min(22rem,88vw)] rounded-2xl bg-neutral-950/90 p-5 ring-1 ring-white/[0.08] shadow-2xl shadow-black/50 animate-[menuIn_220ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="flex items-center justify-between pb-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
            Paused
          </span>
          <button
            type="button"
            aria-label="Resume"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/70 ring-1 ring-white/[0.08] hover:bg-white/[0.12] hover:text-white active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <MenuButton onClick={close} label="Resume" primary />
          <MenuButton onClick={onRestart} label="Restart level" />
          <MenuButton onClick={onExit} label="Return to menu" tone="danger" />
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
  const base =
    'w-full rounded-xl px-4 py-3 text-sm font-medium tracking-wide transition-all active:scale-[0.98]';
  const style = primary
    ? 'bg-white text-black shadow-md shadow-black/30 hover:bg-white/95'
    : tone === 'danger'
      ? 'bg-white/[0.04] text-red-200/85 ring-1 ring-red-300/15 hover:bg-red-500/10 hover:text-red-100'
      : 'bg-white/[0.05] text-white/85 ring-1 ring-white/[0.08] hover:bg-white/[0.10] hover:text-white';
  return (
    <button type="button" onClick={onClick} className={`${base} ${style}`}>
      {label}
    </button>
  );
}
