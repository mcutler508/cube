import { useEffect } from 'react';
import { DIFFICULTY_CONFIGS, DIFFICULTY_ORDER } from '../../game/difficulty';
import type { Difficulty } from '../../types/game';

interface Props {
  currentDifficulty: Difficulty;
  onPick: (d: Difficulty) => void;
  onClose: () => void;
}

/**
 * A polished, arcade-style modal that appears when the player taps Scramble.
 * Cards showcase each difficulty as a game mode — not a settings dialog.
 */
export function DifficultyPicker({ currentDifficulty, onPick, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-[pickerin_260ms_cubic-bezier(0.16,1,0.3,1)] rounded-3xl bg-[#0f1116] p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">
              Select mode
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Choose your scramble
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2.5 py-1 text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
          >
            Cancel
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DIFFICULTY_ORDER.map((id) => {
            const config = DIFFICULTY_CONFIGS[id];
            const active = id === currentDifficulty;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPick(id)}
                className={[
                  'group relative overflow-hidden rounded-2xl px-4 py-4 text-left transition-all active:scale-[0.98]',
                  active
                    ? 'bg-white text-black shadow-lg shadow-black/40'
                    : 'bg-white/[0.04] text-white/85 ring-1 ring-white/10 hover:bg-white/[0.08]',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] opacity-70">
                    {config.label}
                  </span>
                  <span className="font-mono text-[10px] opacity-60">
                    {config.scrambleMin}–{config.scrambleMax} moves
                  </span>
                </div>
                <div className="mt-1.5 text-sm leading-tight">{config.tagline}</div>
                <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] opacity-60">
                  <span>×{config.scoreMultiplier} score</span>
                  {config.helperArrows && <span>· helpers on</span>}
                </div>
              </button>
            );
          })}
        </div>
        <style>{`
          @keyframes pickerin {
            from { opacity: 0; transform: translateY(12px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}
