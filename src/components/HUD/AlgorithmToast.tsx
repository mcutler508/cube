import { useEffect, useState } from 'react';
import { useGameEvent } from '../../animation/triggers';

/**
 * Slim algorithm-name toast that pops on the right side of the cube when the
 * player completes a known trigger (sexy move, sledgehammer, sune, etc.).
 * Chained repeats show a bright ×N counter that grows with the chain — this
 * is what makes the repetitive sliding feel purposeful and rewarded.
 */
interface Toast {
  id: number;
  name: string;
  chain: number;
  spawnedAt: number;
}

const TTL_MS = 1400;
let nextId = 1;

export function AlgorithmToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  useGameEvent('algorithmPerformed', (e) => {
    setToast({
      id: nextId++,
      name: e.algorithmName,
      chain: e.chain,
      spawnedAt: performance.now(),
    });
  });

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), TTL_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  // Chain drives font weight, hue, and glow intensity so higher chains feel
  // like escalating "you're in the pocket now" feedback.
  const chainScale = Math.min(1, (toast.chain - 1) * 0.2);
  const hueGlow = 0.35 + chainScale * 0.55;
  const scale = 1 + chainScale * 0.25;

  return (
    <div className="pointer-events-none absolute right-4 top-1/2 z-[8] -translate-y-1/2">
      <div
        key={toast.id}
        className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-black shadow-xl ring-1 ring-black/10"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'right center',
          boxShadow: `0 4px 20px rgba(255, 220, 140, ${hueGlow}), 0 0 0 1px rgba(0,0,0,0.1)`,
          animation: `algotoast ${TTL_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
        }}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/85">
          {toast.name}
        </span>
        {toast.chain > 1 && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
            style={{
              background: `rgba(230, 140, 0, ${0.7 + chainScale * 0.3})`,
            }}
          >
            ×{toast.chain}
          </span>
        )}
      </div>
      <style>{`
        @keyframes algotoast {
          0%   { opacity: 0; transform: translate(20px, -50%) scale(0.9); }
          15%  { opacity: 1; transform: translate(0, -50%) scale(1); }
          80%  { opacity: 1; transform: translate(0, -50%) scale(1); }
          100% { opacity: 0; transform: translate(10px, -50%) scale(0.95); }
        }
      `}</style>
    </div>
  );
}
