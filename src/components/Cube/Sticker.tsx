import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { type StickerSide } from '../../cube/colors';
import { useActiveTheme } from '../../cube/themes';
import {
  CUBIE_SIZE,
  STICKER_INSET,
  STICKER_LIFT,
  STICKER_THICKNESS,
} from '../../cube/geometry';
import { currentFlashIntensity } from '../../interaction/commitFlash';
import { getReticleTexture, resolveReticleStyle } from '../../cube/reticleStyles';
import { useGameStore } from '../../store/gameStore';

interface StickerProps {
  side: StickerSide;
  /** True when this sticker currently lives on the hint target face. */
  highlighted?: boolean;
}

const HALF = CUBIE_SIZE / 2;
const SIZE = CUBIE_SIZE - STICKER_INSET * 2;

/**
 * Reticle plane sits just above the sticker's top surface. Sticker top is at
 * STICKER_THICKNESS / 2; a tiny gap keeps them from z-fighting.
 */
const RETICLE_Y = STICKER_THICKNESS / 2 + 0.002;
const RETICLE_COLOR_HEX = '#7ee9ff';
const RETICLE_EMISSIVE_BASE = 1.6;
const RETICLE_EMISSIVE_PEAK = 4.2;

const PLACEMENT: Record<
  StickerSide,
  { position: [number, number, number]; rotation: [number, number, number] }
> = {
  right: { position: [HALF + STICKER_LIFT, 0, 0], rotation: [0, 0, -Math.PI / 2] },
  left: { position: [-HALF - STICKER_LIFT, 0, 0], rotation: [0, 0, Math.PI / 2] },
  up: { position: [0, HALF + STICKER_LIFT, 0], rotation: [0, 0, 0] },
  down: { position: [0, -HALF - STICKER_LIFT, 0], rotation: [Math.PI, 0, 0] },
  front: { position: [0, 0, HALF + STICKER_LIFT], rotation: [Math.PI / 2, 0, 0] },
  back: { position: [0, 0, -HALF - STICKER_LIFT], rotation: [-Math.PI / 2, 0, 0] },
};

export function Sticker({ side, highlighted = false }: StickerProps) {
  const { position, rotation } = PLACEMENT[side];
  const theme = useActiveTheme();
  const hex = theme.colors[side];
  const { roughness, metalness, envMapIntensity } = theme.material;
  const color = useMemo(() => new THREE.Color(hex), [hex]);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const reticleRef = useRef<THREE.MeshStandardMaterial>(null);

  const styleId = useGameStore((s) => resolveReticleStyle(s.settings.reticleStyle));
  const reticleTexture = useMemo(() => getReticleTexture(styleId), [styleId]);

  useFrame(({ clock }) => {
    const mat = materialRef.current;
    if (mat) {
      if (highlighted) {
        const w = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 5.2);
        mat.emissive.copy(color);
        mat.emissiveIntensity = 0.35 + w * 0.55;
      } else if (mat.emissiveIntensity !== 0) {
        mat.emissiveIntensity = 0;
      }
    }
    const flash = currentFlashIntensity(performance.now());
    const target =
      RETICLE_EMISSIVE_BASE +
      (RETICLE_EMISSIVE_PEAK - RETICLE_EMISSIVE_BASE) * flash;
    const rm = reticleRef.current;
    if (rm && rm.emissiveIntensity !== target) rm.emissiveIntensity = target;
  });

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox
        args={[SIZE, STICKER_THICKNESS, SIZE]}
        radius={0.008}
        smoothness={3}
        creaseAngle={0.4}
      >
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          roughness={roughness}
          metalness={metalness}
          envMapIntensity={envMapIntensity}
        />
      </RoundedBox>
      <mesh position={[0, RETICLE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial
          key={styleId}
          ref={reticleRef}
          color="#000000"
          emissive={RETICLE_COLOR_HEX}
          emissiveMap={reticleTexture}
          emissiveIntensity={RETICLE_EMISSIVE_BASE}
          alphaMap={reticleTexture}
          transparent
          depthWrite={false}
          roughness={0.4}
          metalness={0}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
