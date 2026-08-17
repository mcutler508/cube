import { RoundedBox } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { FACE_COLORS, type StickerSide } from '../../cube/colors';
import {
  CUBIE_SIZE,
  STICKER_INSET,
  STICKER_LIFT,
  STICKER_THICKNESS,
} from '../../cube/geometry';

interface StickerProps {
  side: StickerSide;
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

export function Sticker({ side }: StickerProps) {
  const { position, rotation } = PLACEMENT[side];
  const color = useMemo(() => new THREE.Color(FACE_COLORS[side]), [side]);

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
        color={color}
        roughness={0.42}
        metalness={0.04}
        envMapIntensity={0.6}
      />
    </RoundedBox>
  );
}
