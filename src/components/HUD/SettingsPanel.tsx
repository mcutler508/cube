import { useEffect, type ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Settings } from '../../game/persistence';
import { THEMES } from '../../cube/themes';
import { ThemePreview } from './ThemePreview';
import { RETICLE_STYLES, resolveReticleStyle } from '../../cube/reticleStyles';
import { ReticlePreview } from './ReticlePreview';
import { BACKGROUNDS, resolveBackground } from '../../cube/backgrounds';
import { BackgroundPreview } from './BackgroundPreview';

/**
 * In-level settings overlay. Opened by the gear icon on the top HUD, closed
 * by tapping the scrim or the close button.
 *
 * Scaffolded to grow: each section renders rows through a common
 * <ToggleRow /> so adding audio, haptics, hint-assist, etc. later is a
 * one-liner per row. Only ships the "Show cube net" toggle for now.
 */
export function SettingsPanel() {
  const isOpen = useGameStore((s) => s.isSettingsOpen);
  const close = useGameStore((s) => s.closeSettings);
  const settings = useGameStore((s) => s.settings);
  const setSetting = useGameStore((s) => s.setSetting);

  // While the panel is open, push a throwaway history entry so the phone/
  // browser back gesture pops it (closes the panel) instead of navigating
  // out of the app. On close, we roll history back to the pre-open state.
  useEffect(() => {
    if (!isOpen) return;
    const marker = { __settingsPanel: true } as const;
    window.history.pushState(marker, '');
    const onPop = () => close();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // If we're unmounting because the user closed via button/scrim (not
      // via back gesture), remove our marker from history so a subsequent
      // back doesn't re-fire. history.state carries our marker only when
      // our pushed entry is still current.
      const s = window.history.state as { __settingsPanel?: boolean } | null;
      if (s && s.__settingsPanel) window.history.back();
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <button
        type="button"
        aria-label="Close settings"
        onClick={close}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[scrimIn_180ms_ease-out]"
      />
      {/*
        Panel is a fixed-height flex column so the header and Done button
        stay pinned while the middle scrolls. Without this the sections
        overflow above the mobile viewport with no way to reach the top
        (the panel is bottom-anchored on small screens).
        Using dvh so mobile browser chrome (URL bar) collapsing doesn't
        clip the panel mid-frame.
      */}
      <div
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-[#14161c] ring-1 ring-white/10 shadow-2xl shadow-black/60 sm:rounded-3xl animate-[panelIn_240ms_cubic-bezier(0.16,1,0.3,1)]"
        style={{ maxHeight: 'min(92dvh, 44rem)' }}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-5">
          <h2 className="text-base font-semibold tracking-wide text-white/95">
            Settings
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/70 hover:bg-white/15 hover:text-white/95 active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1.5 1.5l11 11M12.5 1.5l-11 11"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 [scrollbar-gutter:stable]">
          <Section title="Sticker Pack">
            <div className="grid grid-cols-2 gap-2 p-2">
              {THEMES.map((theme) => (
                <ThemePreview
                  key={theme.id}
                  theme={theme}
                  selected={settings.themeId === theme.id}
                  onSelect={() => setSetting('themeId', theme.id)}
                />
              ))}
            </div>
          </Section>

          <Section title="Background">
            <div className="grid grid-cols-3 gap-2 p-2">
              {BACKGROUNDS.map((bg) => (
                <BackgroundPreview
                  key={bg.id}
                  background={bg}
                  selected={resolveBackground(settings.backgroundId).id === bg.id}
                  onSelect={() => setSetting('backgroundId', bg.id)}
                />
              ))}
            </div>
          </Section>

          <Section title="Direction indicator">
            <div className="grid grid-cols-3 gap-2 p-2">
              {RETICLE_STYLES.map((style) => (
                <ReticlePreview
                  key={style.id}
                  style={style}
                  selected={resolveReticleStyle(settings.reticleStyle) === style.id}
                  onSelect={() => setSetting('reticleStyle', style.id)}
                />
              ))}
            </div>
          </Section>

          <Section title="Gameplay">
            <ToggleRow
              label="Show cube net"
              description="Display the flattened 2D diagram beneath the cube."
              checked={settings.showCubeNet}
              onChange={(v) => setSetting('showCubeNet', v)}
            />
          </Section>
        </div>

        <div
          className="shrink-0 border-t border-white/5 px-5 pt-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
        >
          <button
            type="button"
            onClick={close}
            className="w-full rounded-2xl bg-emerald-400 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
          >
            Done
          </button>
        </div>

        <style>{keyframesCss}</style>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-1">
      <h3 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
        {title}
      </h3>
      <div className="overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/5 divide-y divide-white/5">
        {children}
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 px-4 py-3 active:bg-white/5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white/95">{label}</div>
        {description && (
          <div className="mt-0.5 text-xs text-white/50">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-emerald-400' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

const keyframesCss = `
  @keyframes scrimIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes panelIn {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

// Re-export so consumers can build type-safe row callbacks in the future
// without pulling directly from persistence.
export type { Settings };
