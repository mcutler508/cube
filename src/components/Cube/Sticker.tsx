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
import {
  getReticleTexture,
  resolveReticleStyle,
  RETICLE_ANIM,
} from '../../cube/reticleStyles';
import { useGameStore } from '../../store/gameStore';
import { dragController } from '../../animation/dragController';

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
const RETICLE_EMISSIVE_BASE = 1.6;
const RETICLE_EMISSIVE_PEAK = 4.2;

const TAU = Math.PI * 2;

/** Scan-sweep geometry (in world units, derived from the mockup values). */
const SWEEP_SEG_LEN = SIZE * 0.08;
const SWEEP_SEG_THICK = SIZE * 0.028;
const SWEEP_TRAVEL = SIZE * 0.4;
const SWEEP_PERIOD_S = 1.6;

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
 * Opacity envelope for the scan-sweep segments: fade in over the first 15%
 * of the cycle, hold at 1 through 85%, fade out to 0 at the end. Matches
 * the CSS keyframes in the HTML mockup.
 */
function sweepOpacity(t: number): number {
  if (t < 0.15) return t / 0.15;
  if (t > 0.85) return (1 - t) / 0.15;
  return 1;
}

export function Sticker({ side, highlighted = false }: StickerProps) {
  const { position, rotation } = PLACEMENT[side];
  const theme = useActiveTheme();
  const hex = theme.colors[side];
  const {
    roughness,
    metalness,
    envMapIntensity,
    clearcoat,
    clearcoatRoughness,
    iridescence,
    iridescenceIOR,
    sheen,
    sheenColor,
    ior,
    anisotropy,
    anisotropyRotation,
    specularIntensity,
    specularColor,
  } = theme.material;
  const reticleColor = theme.reticle.color;
  const reticleBase = RETICLE_EMISSIVE_BASE * theme.reticle.intensityScale;
  const reticlePeak = RETICLE_EMISSIVE_PEAK * theme.reticle.intensityScale;
  const color = useMemo(() => new THREE.Color(hex), [hex]);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const reticleMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const reticleMeshRef = useRef<THREE.Mesh>(null);
  const sweepHMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const sweepVMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const sweepHRef = useRef<THREE.Mesh>(null);
  const sweepVRef = useRef<THREE.Mesh>(null);

  const styleId = useGameStore((s) => resolveReticleStyle(s.settings.reticleStyle));
  const reticleTexture = useMemo(() => getReticleTexture(styleId), [styleId]);
  const anim = RETICLE_ANIM[styleId];

  /**
   * Random phase seeded once per sticker mount — desyncs the idle animation
   * across ~54 stickers so the cube feels like it's breathing organically
   * rather than strobing in unison.
   */
  const phase = useMemo(() => Math.random() * TAU, []);

  useFrame(({ clock }) => {
    const now = performance.now();
    const t = clock.getElapsedTime();
    const dragging = dragController.isActive();

    // --- Sticker body (hint highlight only) ---
    const mat = materialRef.current;
    if (mat) {
      if (highlighted) {
        const w = 0.5 + 0.5 * Math.sin(t * 5.2);
        mat.emissive.copy(color);
        mat.emissiveIntensity = 0.35 + w * 0.55;
      } else if (mat.emissiveIntensity !== 0) {
        mat.emissiveIntensity = 0;
      }
    }

    // --- Reticle emissive: base + idle pulse (paused during drag), lifted by commit flash ---
    const rm = reticleMatRef.current;
    if (rm) {
      let pulse = 0;
      if (!dragging && anim.emissivePulse) {
        const { amp, freq } = anim.emissivePulse;
        pulse = amp * (0.5 + 0.5 * Math.sin(t * freq * TAU + phase));
      }
      const flash = currentFlashIntensity(now);
      const idle = reticleBase + pulse * theme.reticle.intensityScale;
      rm.emissiveIntensity = idle + (reticlePeak - idle) * flash;
    }

    // --- Reticle scale pulse (arcade / compass) ---
    const rmesh = reticleMeshRef.current;
    if (rmesh) {
      let scale = 1;
      if (!dragging && anim.scalePulse) {
        const { amp, freq } = anim.scalePulse;
        scale = 1 + amp * (0.5 + 0.5 * Math.sin(t * freq * TAU + phase));
      }
      rmesh.scale.set(scale, scale, 1);
    }

    // --- Scan sweep bars (only mounted when style === 'scan') ---
    if (anim.sweep) {
      // Use a per-sticker phase in seconds so cycles desync.
      const cycle = ((t + (phase / TAU) * SWEEP_PERIOD_S) % SWEEP_PERIOD_S) / SWEEP_PERIOD_S;
      const pos = (cycle * 2 - 1) * SWEEP_TRAVEL;
      const op = dragging ? 0 : sweepOpacity(cycle);
      const sH = sweepHRef.current;
      if (sH) sH.position.x = pos;
      const sV = sweepVRef.current;
      if (sV) sV.position.y = pos;
      const smH = sweepHMatRef.current;
      if (smH) smH.opacity = op;
      const smV = sweepVMatRef.current;
      if (smV) smV.opacity = op;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox
        args={[SIZE, STICKER_THICKNESS, SIZE]}
        radius={0.008}
        smoothness={3}
        creaseAngle={0.4}
      >
        <meshPhysicalMaterial
          key={theme.id}
          ref={materialRef}
          color={color}
          roughness={roughness}
          metalness={metalness}
          envMapIntensity={envMapIntensity}
          clearcoat={clearcoat}
          clearcoatRoughness={clearcoatRoughness}
          iridescence={iridescence}
          iridescenceIOR={iridescenceIOR}
          sheen={sheen}
          sheenColor={sheenColor}
          ior={ior}
          anisotropy={anisotropy}
          anisotropyRotation={anisotropyRotation}
          specularIntensity={specularIntensity}
          specularColor={specularColor}
        />
      </RoundedBox>
      {/**
        * Reticle group: rotated so its local XY lies flat on the sticker face.
        * Reticle plane + scan sweep bars share this frame so bar positions
        * are naturally expressed in sticker-face coordinates.
        */}
      <group position={[0, RETICLE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh ref={reticleMeshRef}>
          <planeGeometry args={[SIZE, SIZE]} />
          <meshStandardMaterial
            key={`${styleId}-${theme.id}`}
            ref={reticleMatRef}
            color="#000000"
            emissive={reticleColor}
            emissiveMap={reticleTexture}
            emissiveIntensity={reticleBase}
            alphaMap={reticleTexture}
            transparent
            depthWrite={false}
            roughness={0.4}
            metalness={0}
            toneMapped={false}
          />
        </mesh>
        {anim.sweep && (
          <>
            <mesh ref={sweepHRef} position={[0, 0, 0.001]}>
              <planeGeometry args={[SWEEP_SEG_LEN, SWEEP_SEG_THICK]} />
              <meshStandardMaterial
                ref={sweepHMatRef}
                color="#000000"
                emissive={reticleColor}
                emissiveIntensity={reticlePeak}
                transparent
                opacity={0}
                depthWrite={false}
                roughness={0.4}
                metalness={0}
                toneMapped={false}
              />
            </mesh>
            <mesh ref={sweepVRef} position={[0, 0, 0.0015]}>
              <planeGeometry args={[SWEEP_SEG_THICK, SWEEP_SEG_LEN]} />
              <meshStandardMaterial
                ref={sweepVMatRef}
                color="#000000"
                emissive={reticleColor}
                emissiveIntensity={reticlePeak}
                transparent
                opacity={0}
                depthWrite={false}
                roughness={0.4}
                metalness={0}
                toneMapped={false}
              />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}
