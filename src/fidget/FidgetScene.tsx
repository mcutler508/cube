import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, ContactShadows, RoundedBox } from '@react-three/drei';
import { Suspense, useCallback, useRef } from 'react';
import * as THREE from 'three';

/**
 * Experimental fidget-spinner mode. A single iridescent chromed cube on a
 * dark stage: swipe to fling it, tap while spinning to catch it. No solve
 * logic, no HUD, no persistence — just tactile eye candy.
 *
 * Rendering approach:
 *   - MeshPhysicalMaterial with iridescence + high metalness + a studio HDRI
 *     via drei's <Environment> gives the oil-slick chrome look for free.
 *   - ACES tone mapping + a soft rim light preserve highlight rolloff so the
 *     rainbow reads on OLED without clipping.
 *   - No postprocessing dep (bloom) — deferred until after we validate the
 *     baseline feels right. If we add it later, `@react-three/postprocessing`
 *     drops in as an <EffectComposer> child of Canvas.
 *
 * Interaction: velocity model, not a rotation-tracker. Pointer moves feed a
 * short motion history; on release we seed angular velocity from the tail of
 * that history so the spin continues naturally. Friction is exponential (per-
 * second decay factor), not linear, so a hard fling glides for a while but
 * still settles cleanly. Tap-to-catch just bumps friction dramatically for a
 * few frames.
 */
export function FidgetScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.4, 3.4], fov: 32 }}
      onCreated={({ gl }) => {
        gl.setClearColor('#000000', 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
    >
      {/* Base fill so the cube reads even before the HDRI resolves. */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 3]} intensity={0.6} color="#ffe6c4" />
      <directionalLight position={[-5, 2, -3]} intensity={0.35} color="#8ea6ff" />

      <Suspense fallback={null}>
        {/* `studio` gives crisp softbox highlights that read as "premium chrome";
            swap to `warehouse` or `city` for more color variety in the reflection. */}
        <Environment preset="studio" background={false} />
        <FidgetCube />
        <ContactShadows
          position={[0, -0.95, 0]}
          opacity={0.55}
          scale={5}
          blur={2.6}
          far={2.5}
          resolution={512}
          color="#000000"
        />
      </Suspense>
    </Canvas>
  );
}

// --- geometry constants ---
const CUBE_SIZE = 1.4;
const CORNER_RADIUS = 0.13;

// --- physics tuning ---
// Friction is per-second (exp decay). 0.35 = keeps ~35% of velocity/sec at
// idle → a hard fling lasts ~4-6s before it visually stops. Catch mode
// clamps to a much harsher factor while the finger is down mid-spin.
const IDLE_FRICTION = 0.32;
const CATCH_FRICTION = 0.001;
// Pixels-per-second → radians-per-second scaling from the release flick. Tuned
// on a 400px-tall canvas so a "casual" swipe feels lively but not slot-machine.
const FLICK_SCALE = 0.006;
// Cap release velocity so a violent flick doesn't shatter frame timing.
const MAX_VELOCITY = 22;
// Motion samples older than this (ms) are discarded when computing release
// velocity — otherwise a slow drag ending in a stop would still fling.
const RELEASE_WINDOW_MS = 90;

function FidgetCube() {
  const groupRef = useRef<THREE.Group>(null);
  // Angular velocity around world X (pitch) and world Y (yaw). We deliberately
  // ignore roll (Z) — real fidget cubes on a table don't tumble that way and
  // the swipe gesture doesn't naturally map to it.
  const velocity = useRef(new THREE.Vector2(0, 0));
  const isDragging = useRef(false);
  const isCaught = useRef(false);
  const motionHistory = useRef<Array<{ t: number; dx: number; dy: number }>>([]);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const { size } = useThree();

  // Normalize gesture magnitude across screen sizes so a swipe that crosses
  // half the canvas produces roughly the same spin on a phone and a tablet.
  const normalize = useCallback(
    (dx: number, dy: number) => {
      const norm = 400 / Math.max(1, size.height);
      return { dx: dx * norm, dy: dy * norm };
    },
    [size.height],
  );

  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    const spinning = velocity.current.lengthSq() > 0.5;
    isDragging.current = true;
    // Tapping mid-spin catches. Below the threshold, treat as a fresh drag
    // (which naturally kills residual drift because we stop applying velocity
    // while dragging).
    isCaught.current = spinning;
    if (isCaught.current) {
      pulseHaptic(18);
    }
    lastPointer.current = { x: e.clientX, y: e.clientY };
    motionHistory.current = [];
  }, []);

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging.current || !lastPointer.current || !groupRef.current) return;
      const rawDx = e.clientX - lastPointer.current.x;
      const rawDy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      const { dx, dy } = normalize(rawDx, rawDy);
      // Track for release-velocity calculation.
      const now = performance.now();
      motionHistory.current.push({ t: now, dx, dy });
      // Bound the buffer so long drags don't grow unbounded.
      if (motionHistory.current.length > 32) motionHistory.current.shift();
      // Direct 1:1 drag: horizontal swipe → yaw, vertical → pitch. FLICK_SCALE
      // is applied uniformly with the release path so drag "feel" matches
      // continued spin speed.
      groupRef.current.rotation.y += dx * FLICK_SCALE;
      groupRef.current.rotation.x += dy * FLICK_SCALE;
    },
    [normalize],
  );

  const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
    if (!isDragging.current) return;
    isDragging.current = false;

    // Seed velocity from the tail of motion history. Older samples fade
    // linearly so a swipe that decelerates before release doesn't over-fling.
    const now = performance.now();
    const recent = motionHistory.current.filter((s) => now - s.t <= RELEASE_WINDOW_MS);
    if (recent.length === 0 || isCaught.current) {
      // Pure tap or catch: kill any drift instantly.
      if (isCaught.current) velocity.current.set(0, 0);
      isCaught.current = false;
      return;
    }
    let sumDx = 0;
    let sumDy = 0;
    for (const s of recent) {
      sumDx += s.dx;
      sumDy += s.dy;
    }
    const dtSec = Math.max(0.016, (now - recent[0].t) / 1000);
    // v = distance / time → convert to radians/sec via same scale.
    const vx = (sumDy / dtSec) * FLICK_SCALE;
    const vy = (sumDx / dtSec) * FLICK_SCALE;
    velocity.current.set(
      THREE.MathUtils.clamp(vx, -MAX_VELOCITY, MAX_VELOCITY),
      THREE.MathUtils.clamp(vy, -MAX_VELOCITY, MAX_VELOCITY),
    );
    // Light release haptic when the fling is genuinely lively — keeps the
    // spin feeling "physical" but doesn't buzz on every stray tap.
    if (velocity.current.length() > 4) pulseHaptic(10);
  }, []);

  useFrame((_state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    // Idle bob when nothing else is happening so the object doesn't look
    // like it's frozen mid-air. Tiny — mostly you notice it in the highlights
    // shifting, not the silhouette.
    if (!isDragging.current && velocity.current.lengthSq() < 0.02) {
      const t = performance.now() * 0.0006;
      g.position.y = Math.sin(t) * 0.015;
    }
    if (isDragging.current) return;

    const dt = Math.min(0.05, delta);
    // Advance rotation from velocity.
    g.rotation.x += velocity.current.x * dt;
    g.rotation.y += velocity.current.y * dt;

    // Exponential friction: v *= friction^dt. Using pow keeps decay
    // frame-rate independent so a 30fps device slows at the same real-world
    // rate as 120fps.
    const friction = isCaught.current ? CATCH_FRICTION : IDLE_FRICTION;
    const factor = Math.pow(friction, dt);
    velocity.current.multiplyScalar(factor);
    if (velocity.current.lengthSq() < 0.0004) velocity.current.set(0, 0);
  });

  return (
    <>
      {/* Invisible hit area so swipes register on the empty space around the
          cube too — otherwise a swipe that starts on background pixels does
          nothing, which feels broken on mobile. */}
      <mesh
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        visible={false}
      >
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <group ref={groupRef}>
        <RoundedBox
          args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]}
          radius={CORNER_RADIUS}
          smoothness={6}
          creaseAngle={0.4}
        >
          <meshPhysicalMaterial
            color="#c8c8d0"
            metalness={1}
            roughness={0.08}
            iridescence={1}
            iridescenceIOR={1.35}
            // Nanometer range: sweeps the visible spectrum across the surface
            // as normals turn, producing the oil-slick rainbow.
            iridescenceThicknessRange={[120, 780]}
            envMapIntensity={1.4}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </RoundedBox>
      </group>
    </>
  );
}

function pulseHaptic(ms: number) {
  const nav = typeof navigator === 'undefined' ? null : navigator;
  if (!nav || typeof nav.vibrate !== 'function') return;
  try {
    nav.vibrate(ms);
  } catch {
    /* some browsers throttle rapid calls */
  }
}
