import type { ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Settings } from '../../game/persistence';
import { THEMES } from '../../cube/themes';
import { ThemePreview } from './ThemePreview';

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
      <div
        className="relative w-full max-w-md rounded-t-3xl bg-[#14161c] p-5 ring-1 ring-white/10 shadow-2xl shadow-black/60 sm:rounded-3xl animate-[panelIn_240ms_cubic-bezier(0.16,1,0.3,1)]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.25rem)' }}
      >
        <div className="mb-4 flex items-center justify-between">
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

        <Section title="Appearance">
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

        <Section title="Gameplay">
          <ToggleRow
            label="Show cube net"
            description="Display the flattened 2D diagram beneath the cube."
            checked={settings.showCubeNet}
            onChange={(v) => setSetting('showCubeNet', v)}
          />
        </Section>

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
