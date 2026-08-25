import { RoundedBox } from '@react-three/drei';
import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { stickersForHome, type StickerSide } from '../../cube/colors';
import { CUBIE_SIZE } from '../../cube/geometry';
import { applyMat3 } from '../../cube/coordinates';
import type { Cubie as CubieModel, FaceLetter, Vec3 } from '../../types/cube';
import { Sticker } from './Sticker';

interface CubieProps {
  cubie: CubieModel;
  hintFace?: FaceLetter | null;
  /**
   * Face letter to render as a subtle white label on this cubie's outward
   * sticker. Set only when this cubie is a face center AND we're in a
   * guided drill (see Cube.tsx). Non-center cubies always receive null.
   */
  centerLabel?: FaceLetter | null;
  /**
   * Uniform scale applied to the cubie body + stickers. Used to counteract
   * an outer layout-scale group so we can pack cubies tighter in 2x2 mode
   * without shrinking them. Defaults to 1 (3x3 mode). See the "layout scale
   * trick" comment in Cube.tsx.
   */
  renderScale?: number;
  onPointerDown?: (event: THREE.Event & { intersections: THREE.Intersection[] }) => void;
}

const HOME_DIR: Record<StickerSide, Vec3> = {
  right: [1, 0, 0],
  left: [-1, 0, 0],
  up: [0, 1, 0],
  down: [0, -1, 0],
  front: [0, 0, 1],
  back: [0, 0, -1],
};

/**
 * Stable per-side ordinal used to derive a deterministic sticker identifier
 * from `(cubie.id, side)`. Fed to texture-based themes (graffiti) so the
 * per-sticker random crop offset is anchored to the physical sticker rather
 * than being freshly randomized on every remount.
 */
const SIDE_INDEX: Record<StickerSide, number> = {
  right: 0,
  left: 1,
  up: 2,
  down: 3,
  front: 4,
  back: 5,
};

const FACE_NORMAL: Record<FaceLetter, Vec3> = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

/**
 * A single cubie: a rounded black-plastic body with up to three colored stickers
 * baked in based on the cubie's *home* position. The parent group's transform
 * moves and rotates the whole cubie (stickers ride along).
 *
 * When `hintFace` is set, at most one of this cubie's stickers is currently
 * visible on that face (based on the cubie's current rotation) — that sticker
 * gets a pulsing emissive glow via the Sticker component.
 */
export const Cubie = forwardRef<THREE.Group, CubieProps>(function Cubie(
  { cubie, hintFace = null, centerLabel = null, renderScale = 1 },
  ref,
) {
  const stickers = useMemo(() => stickersForHome(cubie.home), [cubie.home]);

  // Precompute which sticker (if any) is currently on the hint face.
  const highlightedSide = useMemo<StickerSide | null>(() => {
    if (!hintFace) return null;
    const target = FACE_NORMAL[hintFace];
    for (const side of stickers) {
      const dir = applyMat3(cubie.rotation, HOME_DIR[side]);
      if (dir[0] === target[0] && dir[1] === target[1] && dir[2] === target[2]) {
        return side;
      }
    }
    return null;
  }, [hintFace, stickers, cubie.rotation]);

  return (
    <group ref={ref} userData={{ cubieId: cubie.id }}>
      {/*
        Inner scale group compensates for the outer layout-scale (see
        Cube.tsx). In 3x3 mode renderScale === 1 and this is a no-op; in
        2x2 mode renderScale === 2 so the cubie body + stickers render at
        their normal world size even though the parent group is scaled to
        0.5. `applyState` writes position + rotation to the *outer* group
        (via ref), so animations and hit testing are unaffected.
      */}
      <group scale={renderScale}>
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
          <Sticker
            key={side}
            side={side}
            stickerKey={cubie.id * 8 + SIDE_INDEX[side]}
            highlighted={side === highlightedSide}
            centerLabel={centerLabel && stickers.length === 1 ? centerLabel : null}
          />
        ))}
      </group>
    </group>
  );
});
