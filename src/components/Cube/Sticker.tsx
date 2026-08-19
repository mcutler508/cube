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

interface StickerProps {
  side: StickerSide;
  /** True when this sticker currently lives on the hint target face. */
  highlighted?: boolean;
}

const HALF = CUBIE_SIZE / 2;
const SIZE = CUBIE_SIZE - STICKER_INSET * 2;

const TRACELINE_LENGTH = SIZE * 0.78;
const TRACELINE_THICKNESS = SIZE * 0.11;
const TRACELINE_HEIGHT = 0.02;
/**
 * Sticker top surface sits at STICKER_THICKNESS/2 above the group origin.
 * Tracelines float just above that with a small gap so they don't z-fight.
 */
const TRACELINE_Y_H = STICKER_THICKNESS / 2 + TRACELINE_HEIGHT / 2 + 0.001;
/**
 * The vertical bar sits 0.006 higher than the horizontal so they don't
 * occupy the same depth values at the intersection. Two coincident bars
 * z-fight and both go invisible; a tiny y-offset resolves it and is not
 * noticeable at this render distance.
 */
const TRACELINE_Y_V = TRACELINE_Y_H + 0.006;
const TRACELINE_COLOR_HEX = '#7ee9ff';
const TRACELINE_EMISSIVE_BASE = 1.6;
const TRACELINE_EMISSIVE_PEAK = 4.2;

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
  const traceHRef = useRef<THREE.MeshStandardMaterial>(null);
  const traceVRef = useRef<THREE.MeshStandardMaterial>(null);

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
      TRACELINE_EMISSIVE_BASE +
      (TRACELINE_EMISSIVE_PEAK - TRACELINE_EMISSIVE_BASE) * flash;
    const th = traceHRef.current;
    if (th && th.emissiveIntensity !== target) th.emissiveIntensity = target;
    const tv = traceVRef.current;
    if (tv && tv.emissiveIntensity !== target) tv.emissiveIntensity = target;
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
      <mesh position={[0, TRACELINE_Y_H, 0]}>
        <boxGeometry
          args={[TRACELINE_LENGTH, TRACELINE_HEIGHT, TRACELINE_THICKNESS]}
        />
        <meshStandardMaterial
          ref={traceHRef}
          color={TRACELINE_COLOR_HEX}
          emissive={TRACELINE_COLOR_HEX}
          emissiveIntensity={TRACELINE_EMISSIVE_BASE}
          roughness={0.3}
          metalness={0.1}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, TRACELINE_Y_V, 0]}>
        <boxGeometry
          args={[TRACELINE_THICKNESS, TRACELINE_HEIGHT, TRACELINE_LENGTH]}
        />
        <meshStandardMaterial
          ref={traceVRef}
          color={TRACELINE_COLOR_HEX}
          emissive={TRACELINE_COLOR_HEX}
          emissiveIntensity={TRACELINE_EMISSIVE_BASE}
          roughness={0.3}
          metalness={0.1}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
