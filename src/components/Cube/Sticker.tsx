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

/**
 * Base + peak opacities for the ambient traceline. Baseline reads as a soft
 * arcade glow etched into each sticker; peak fires briefly on layer commit.
 */
const TRACELINE_BASE_OPACITY = 0.42;
const TRACELINE_PEAK_OPACITY = 1.0;

/**
 * Shared additive-blended texture for the ambient traceline "+" that shows
 * players the two swipe axes on every sticker. Generated once at module
 * load, shared across all sticker instances so we pay the canvas cost once.
 */
const TRACELINE_TEXTURE = createTracelineTexture();

/** Shared plane geometry so every sticker's traceline reuses one buffer. */
const TRACELINE_GEOMETRY = new THREE.PlaneGeometry(SIZE * 0.78, SIZE * 0.78);

function createTracelineTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const px = 160;
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, px, px);

  // Outer glow — soft halo around the cross for the arcade "light" feel.
  ctx.shadowColor = 'rgba(180, 230, 255, 0.85)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 6;

  const inset = 26;
  // Horizontal
  ctx.beginPath();
  ctx.moveTo(inset, px / 2);
  ctx.lineTo(px - inset, px / 2);
  ctx.stroke();
  // Vertical
  ctx.beginPath();
  ctx.moveTo(px / 2, inset);
  ctx.lineTo(px / 2, px - inset);
  ctx.stroke();

  // Inner bright core — makes the intersection pop.
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(inset + 4, px / 2);
  ctx.lineTo(px - inset - 4, px / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px / 2, inset + 4);
  ctx.lineTo(px / 2, px - inset - 4);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function Sticker({ side, highlighted = false }: StickerProps) {
  const { position, rotation } = PLACEMENT[side];
  const theme = useActiveTheme();
  const hex = theme.colors[side];
  const { roughness, metalness, envMapIntensity } = theme.material;
  const color = useMemo(() => new THREE.Color(hex), [hex]);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const tracelineMatRef = useRef<THREE.MeshBasicMaterial>(null);

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
    const tmat = tracelineMatRef.current;
    if (tmat) {
      // Base opacity + pulse from the most recent layer commit.
      const flash = currentFlashIntensity(performance.now());
      const target =
        TRACELINE_BASE_OPACITY +
        (TRACELINE_PEAK_OPACITY - TRACELINE_BASE_OPACITY) * flash;
      if (tmat.opacity !== target) tmat.opacity = target;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox
        args={[SIZE, STICKER_THICKNESS, SIZE]}
        radius={0.06}
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
      {TRACELINE_TEXTURE && (
        <mesh
          geometry={TRACELINE_GEOMETRY}
          position={[0, STICKER_THICKNESS / 2 + 0.002, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={2}
        >
          <meshBasicMaterial
            ref={tracelineMatRef}
            map={TRACELINE_TEXTURE}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={TRACELINE_BASE_OPACITY}
          />
        </mesh>
      )}
    </group>
  );
}
