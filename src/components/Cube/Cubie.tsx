import { RoundedBox } from '@react-three/drei';
import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { stickersForHome } from '../../cube/colors';
import { CUBIE_SIZE } from '../../cube/geometry';
import type { Cubie as CubieModel } from '../../types/cube';
import { Sticker } from './Sticker';

interface CubieProps {
  cubie: CubieModel;
  onPointerDown?: (event: THREE.Event & { intersections: THREE.Intersection[] }) => void;
}

/**
 * A single cubie: a rounded black-plastic body with up to three colored stickers
 * baked in based on the cubie's *home* position. The parent group's transform
 * moves and rotates the whole cubie (stickers ride along).
 */
export const Cubie = forwardRef<THREE.Group, CubieProps>(function Cubie(
  { cubie },
  ref,
) {
  const stickers = useMemo(() => stickersForHome(cubie.home), [cubie.home]);

  return (
    <group ref={ref} userData={{ cubieId: cubie.id }}>
      <RoundedBox
        args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]}
        radius={0.08}
        smoothness={4}
        creaseAngle={0.4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#0b0c10"
          roughness={0.72}
          metalness={0.08}
        />
      </RoundedBox>
      {stickers.map((side) => (
        <Sticker key={side} side={side} />
      ))}
    </group>
  );
});
