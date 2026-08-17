import { useEffect, useState } from 'react';
import { useGameEvent } from '../../animation/triggers';
import { useGameStore } from '../../store/gameStore';
import { streakIntensity } from '../../game/streak';

/**
 * Radial-burst overlay that pops on top of the cube canvas whenever a major
 * accomplishment lands (face / cross / layer). Purely decorative — never
 * intercepts pointer input. Tier controls the burst color + intensity so
 * bigger accomplishments feel bigger without spamming particles.
 */
type Tier = 'cross' | 'face' | 'layer';

interface Burst {
  id: number;
  tier: Tier;
  spawnedAt: number;
  intensity: number;
}

const TTL_MS = 700;
let nextId = 1;

const TIER_STYLE: Record<Tier, { inner: string; middle: string; scale: number }> = {
  cross: {
    inner: 'rgba(180, 240, 255, 0.35)',
    middle: 'rgba(120, 200, 255, 0.14)',
    scale: 0.7,
  },
  face: {
    inner: 'rgba(180, 255, 210, 0.4)',
    middle: 'rgba(120, 220, 170, 0.16)',
    scale: 0.9,
  },
  layer: {
    inner: 'rgba(255, 235, 170, 0.5)',
    middle: 'rgba(255, 200, 120, 0.2)',
    scale: 1.15,
  },
};

export function MilestoneBurst() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  const push = (tier: Tier) => {
    const intensity = streakIntensity(useGameStore.getState().streak);
    setBursts((prev) => [
      ...prev.slice(-2),
      { id: nextId++, tier, spawnedAt: performance.now(), intensity },
    ]);
  };

  useGameEvent('crossCompleted', () => push('cross'));
  useGameEvent('faceCompleted', () => push('face'));
  useGameEvent('layerCompleted', () => push('layer'));

  useEffect(() => {
    if (bursts.length === 0) return;
    const interval = window.setInterval(() => {
      const now = performance.now();
      setBursts((prev) => prev.filter((b) => now - b.spawnedAt < TTL_MS));
    }, 120);
    return () => window.clearInterval(interval);
  }, [bursts.length]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
      {bursts.map((b) => (
        <BurstNode key={b.id} burst={b} />
      ))}
      <style>{`
        @keyframes burstPop {
          0% { opacity: 0; transform: scale(0.4); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

function BurstNode({ burst }: { burst: Burst }) {
  const style = TIER_STYLE[burst.tier];
  const scale = style.scale * (1 + burst.intensity * 0.35);
  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        width: `${scale * 90}%`,
        aspectRatio: '1 / 1',
        background: `radial-gradient(circle at 50% 50%, ${style.inner} 0%, ${style.middle} 35%, transparent 65%)`,
        animation: `burstPop ${TTL_MS}ms ease-out forwards`,
      }}
    />
  );
}
