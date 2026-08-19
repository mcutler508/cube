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

interface StickerProps {
  side: StickerSide;
  /** True when this sticker currently lives on the hint target face. */
  highlighted?: boolean;
}

const HALF = CUBIE_SIZE / 2;
const SIZE = CUBIE_SIZE - STICKER_INSET * 2;

// Rotate + translate a flat rounded box to sit just outside one face of the cubie.
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
  const color = useMemo(() => new THREE.Color(hex), [hex]);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // Pulse the emissive channel when this sticker is on the hint target face.
  // Cheap: we only touch the two float uniforms and no material allocations.
  useFrame(({ clock }) => {
    const mat = materialRef.current;
    if (!mat) return;
    if (highlighted) {
      const w = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 5.2);
      mat.emissive.copy(color);
      mat.emissiveIntensity = 0.35 + w * 0.55;
    } else if (mat.emissiveIntensity !== 0) {
      mat.emissiveIntensity = 0;
    }
  });

  return (
    <RoundedBox
      args={[SIZE, STICKER_THICKNESS, SIZE]}
      radius={0.06}
      smoothness={3}
      creaseAngle={0.4}
      position={position}
      rotation={rotation}
    >
      <meshStandardMaterial
        ref={materialRef}
        color={color}
        roughness={0.42}
        metalness={0.04}
        envMapIntensity={0.6}
      />
    </RoundedBox>
  );
}
