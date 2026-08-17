import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gameEvents } from '../../game/events';
import { intensityFor } from '../../game/intensity';
import { useGameStore } from '../../store/gameStore';

/**
 * Scene-side "juice": ambient lighting warms and brightens as the player
 * approaches a solve; the moment of solve gets a short bright flare. Everything
 * here is imperative (useFrame) so it doesn't cause React re-renders.
 *
 * We intentionally do NOT move the camera — the user orbits it directly and
 * fighting them for control would feel awful. Punch/impact live in the HUD's
 * animations and the cube's own snap physics.
 */
export function SceneJuice() {
  const { scene } = useThree();
  const ambientRef = useRef<THREE.AmbientLight | null>(null);
  const solveFlare = useRef(0);
  const moveKick = useRef(0);

  useEffect(() => {
    const existing = scene.children.find(
      (o) => o instanceof THREE.AmbientLight,
    ) as THREE.AmbientLight | undefined;
    ambientRef.current = existing ?? null;
  }, [scene]);

  useEffect(() => {
    return gameEvents.subscribe((e) => {
      if (e.type === 'moveCompleted') moveKick.current = 1;
      else if (e.type === 'cubeSolved') solveFlare.current = 1;
    });
  }, []);

  useFrame((_, delta) => {
    const store = useGameStore.getState();
    const tier = intensityFor(store.progress, store.phase === 'solved');
    const target =
      ambientForTier(tier) + solveFlare.current * 0.9 + moveKick.current * 0.08;
    if (ambientRef.current) {
      const curr = ambientRef.current.intensity;
      ambientRef.current.intensity = curr + (target - curr) * Math.min(1, delta * 6);
    }
    if (solveFlare.current > 0) {
      solveFlare.current = Math.max(0, solveFlare.current - delta * 0.55);
    }
    if (moveKick.current > 0) {
      moveKick.current = Math.max(0, moveKick.current - delta * 4);
    }
  });

  return null;
}

function ambientForTier(tier: ReturnType<typeof intensityFor>): number {
  switch (tier) {
    case 'calm':
      return 0.55;
    case 'warm':
      return 0.6;
    case 'active':
      return 0.66;
    case 'heightened':
      return 0.72;
    case 'near':
      return 0.85;
    case 'solved':
      return 1.05;
  }
}
