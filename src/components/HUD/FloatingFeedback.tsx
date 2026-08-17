import { useEffect, useState } from 'react';
import { useGameEvent } from '../../animation/triggers';
import { useGameStore } from '../../store/gameStore';
import { streakIntensity } from '../../game/streak';

/**
 * Floating feedback overlay. Renders short-lived toasts near the bottom of
 * the cube canvas that float up and fade out. Toasts escalate in visual
 * weight with feedback tier: subtle "+N%" for small progress gains, all the
 * way to "LAYER COMPLETE" for the biggest sub-goal.
 *
 * Multiple toasts can overlap when a single move triggers several events —
 * that's intentional: it visually reinforces that "big things just happened".
 */

type Tier = 'delta' | 'nice' | 'great' | 'row' | 'cross' | 'face' | 'layer';

interface Toast {
  id: number;
  tier: Tier;
  text: string;
  spawnedAt: number;
  /** Combo count at spawn time — appended as a small chip when > 1. */
  combo: number;
  /** 0..1 intensity scalar for size/glow scaling. */
  intensity: number;
}

const TTL_MS = 1100;
let nextId = 1;

const TIER_STYLE: Record<Tier, { color: string; size: string; weight: number; letter: string }> = {
  delta: { color: 'rgba(200, 230, 255, 0.9)', size: 'clamp(0.9rem, 3.2vw, 1.1rem)', weight: 500, letter: '0.04em' },
  nice:  { color: 'rgba(160, 250, 210, 0.95)', size: 'clamp(1.1rem, 4vw, 1.4rem)',   weight: 600, letter: '0.06em' },
  great: { color: 'rgba(255, 230, 140, 0.98)', size: 'clamp(1.3rem, 5vw, 1.7rem)',   weight: 700, letter: '0.08em' },
  row:   { color: 'rgba(200, 240, 255, 0.98)', size: 'clamp(1.0rem, 3.6vw, 1.25rem)', weight: 600, letter: '0.22em' },
  cross: { color: 'rgba(180, 240, 255, 1)',    size: 'clamp(1.15rem, 4.2vw, 1.45rem)', weight: 700, letter: '0.24em' },
  face:  { color: 'rgba(180, 255, 200, 1)',    size: 'clamp(1.3rem, 5vw, 1.7rem)',    weight: 700, letter: '0.24em' },
  layer: { color: 'rgba(255, 235, 170, 1)',    size: 'clamp(1.5rem, 6vw, 2rem)',      weight: 800, letter: '0.26em' },
};

export function FloatingFeedback() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (tier: Tier, text: string) => {
    const streak = useGameStore.getState().streak;
    const t: Toast = {
      id: nextId++,
      tier,
      text,
      spawnedAt: performance.now(),
      combo: streak,
      intensity: streakIntensity(streak),
    };
    setToasts((prev) => [...prev.slice(-4), t]);
  };

  useGameEvent('progressIncreased', (e) => {
    if (e.amount < 3) return;
    const rounded = Math.round(e.amount);
    if (e.amount >= 15) push('great', `GREAT +${rounded}%`);
    else if (e.amount >= 8) push('nice', `NICE +${rounded}%`);
    else push('delta', `+${rounded}%`);
  });
  useGameEvent('rowCompleted', () => push('row', 'ROW COMPLETE'));
  useGameEvent('crossCompleted', () => push('cross', 'CROSS COMPLETE'));
  useGameEvent('faceCompleted', () => push('face', 'FACE COMPLETE'));
  useGameEvent('layerCompleted', () => push('layer', 'LAYER COMPLETE'));

  // Sweep expired toasts once per frame-ish. Cheap because the list is short.
  useEffect(() => {
    if (toasts.length === 0) return;
    const interval = window.setInterval(() => {
      const now = performance.now();
      setToasts((prev) => prev.filter((t) => now - t.spawnedAt < TTL_MS));
    }, 120);
    return () => window.clearInterval(interval);
  }, [toasts.length]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex flex-col items-center gap-1">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
      <style>{`
        @keyframes toastFloat {
          0% { opacity: 0; transform: translateY(14px) scale(0.9); }
          15% { opacity: 1; transform: translateY(0) scale(1); }
          70% { opacity: 1; transform: translateY(-22px) scale(1); }
          100% { opacity: 0; transform: translateY(-36px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const style = TIER_STYLE[toast.tier];
  // Combo scale bump: from 1.0 (no combo) to 1.25 (hot combo). Applied via a
  // font-size multiplier that stacks with the tier's clamp() rules.
  const comboScale = 1 + toast.intensity * 0.25;
  return (
    <div className="flex items-center gap-2">
      <div
        className="select-none uppercase"
        style={{
          color: style.color,
          fontSize: `calc(${style.size} * ${comboScale})`,
          fontWeight: style.weight,
          letterSpacing: style.letter,
          textShadow: `0 2px 12px rgba(0,0,0,0.6), 0 0 ${20 + toast.intensity * 30}px rgba(255,220,140,${0.12 + toast.intensity * 0.35})`,
          animation: `toastFloat ${TTL_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
        }}
      >
        {toast.text}
      </div>
      {toast.combo >= 2 && (
        <div
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{
            background: `rgba(255, 220, 140, ${0.15 + toast.intensity * 0.35})`,
            color: 'rgba(255, 240, 200, 1)',
            boxShadow: `0 0 ${8 + toast.intensity * 18}px rgba(255,220,140,${0.3 + toast.intensity * 0.3})`,
            animation: `toastFloat ${TTL_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
          }}
        >
          x{toast.combo}
        </div>
      )}
    </div>
  );
}
