import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Brush, Evaluator, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import { Suspense, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Galaxy Fidget Cube — outer shell + inner core assembly.
 *
 * Geometry (matches the reference CAD spec, baked once via CSG):
 *   - Outer shell: rounded cube with a body-diagonal cylindrical channel cut
 *     clean through it. Creates concave scoop openings on the two opposite
 *     corners along the (1,1,1) axis.
 *   - Inner core: (cube ∩ scoop cylinder). Only the portion of the cube that
 *     lives inside the outer's coaxial channel is kept. Everything else is
 *     discarded, so the inner is only ever VISIBLE where it protrudes through
 *     the outer's scoop openings — never through the outer's flat faces.
 *   - Because the clipping cylinder is rotationally symmetric around the
 *     spin axis, the clipped inner shape stays inside the channel at every
 *     rotation. The inner's cube geometry has 3-fold symmetry around the
 *     body-diagonal, so its faces/edges sweep past the scoop window every
 *     120° of rotation — that's the signature effect.
 *
 * Interaction (three concurrent gestures):
 *   - 1-finger swipe: spins the INNER around the spindle axis. Tap while
 *     spinning to catch.
 *   - 2-finger twist (fingers rotate around each other): spins the OUTER
 *     around the same spindle axis, independent direction and speed from
 *     the inner. Enables counter-rotation.
 *   - 2-finger drag (both fingers moving together): trackball-reorients the
 *     whole assembly in 3D so you can see it from any angle. Rotation applied
 *     to a parent group that wraps both meshes.
 *
 *   These are decomposed simultaneously from a two-finger gesture: the
 *   center-point motion drives trackball; the inter-finger angle drives
 *   outer twist. Both apply on the same pointermove.
 *
 * Physics: two independent scalar angular velocities (inner, outer), both
 * around the same body-diagonal spindle axis. Exp-decay friction is frame-
 * rate independent → same real-world glide time on 30fps vs 120fps.
 *
 * Material: MeshPhysicalMaterial with iridescence + high metalness against
 * a studio HDRI = PVD oil-slick chrome from the spec sheet. Shared between
 * inner + outer so they read as one piece when aligned.
 */
// Match FOV + fit-to-viewport math to CubeScene so the fidget renders at
// roughly the same on-screen footprint as the 3x3 puzzle cube. TARGET_RADIUS
// is tuned so the fidget's ~1.0 world-unit bounding sphere fills the same
// fraction of the frame as the 3x3's ~2.55-unit bounding (see CubeScene.tsx
// TARGET_RADIUS_3X3 = 2.85 for the reference ratio).
const FIDGET_FOV = 38;
const FIDGET_TARGET_RADIUS = 1.15;

function computeCameraPosition(
  width: number,
  height: number,
  targetRadius: number,
): [number, number, number] {
  const aspect = Math.max(0.01, width / Math.max(1, height));
  const fovRad = (FIDGET_FOV * Math.PI) / 180;
  const distForHeight = targetRadius / Math.tan(fovRad / 2);
  const distForWidth = targetRadius / (Math.tan(fovRad / 2) * aspect);
  const dist = Math.max(distForHeight, distForWidth);
  // Same three-quarter angled view as the main cube — keeps the two modes
  // visually consistent.
  return [dist * 0.48, dist * 0.5, dist * 0.64];
}

export function FidgetScene() {
  const initial = computeCameraPosition(
    typeof window !== 'undefined' ? window.innerWidth : 1280,
    typeof window !== 'undefined' ? window.innerHeight : 800,
    FIDGET_TARGET_RADIUS,
  );
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: initial, fov: FIDGET_FOV }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor('#000000', 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        camera.lookAt(0, 0, 0);
      }}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 3]} intensity={0.6} color="#ffe6c4" />
      <directionalLight position={[-5, 2, -3]} intensity={0.35} color="#8ea6ff" />

      <ResponsiveCamera />
      <Suspense fallback={null}>
        <Environment preset="studio" background={false} />
        <FidgetAssembly />
        <ContactShadows
          position={[0, -0.75, 0]}
          opacity={0.5}
          scale={4}
          blur={2.6}
          far={2.2}
          resolution={512}
          color="#000000"
        />
      </Suspense>
    </Canvas>
  );
}

/**
 * Push camera in/out based on viewport aspect so the cube stays the same
 * apparent size on portrait phones and landscape tablets — mirrors the
 * ResponsiveCamera pattern in CubeScene. useLayoutEffect ensures the initial
 * placement lands before the first paint, avoiding a one-frame flash.
 */
function ResponsiveCamera() {
  const { camera, gl } = useThree();
  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const measure = () => {
      const el = gl.domElement;
      const rect = el.getBoundingClientRect();
      const w = rect.width || el.clientWidth || window.innerWidth;
      const h = rect.height || el.clientHeight || window.innerHeight;
      const [x, y, z] = computeCameraPosition(w, h, FIDGET_TARGET_RADIUS);
      camera.position.set(x, y, z);
      camera.aspect = w / h;
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [camera, gl]);
  return null;
}

// --- geometry constants ---
const OUTER_SIZE = 1.15;
const OUTER_CORNER_RADIUS = 0.075;
const OUTER_SEGMENTS = 6;
const INNER_SIZE = OUTER_SIZE * 0.997;
const INNER_CORNER_RADIUS = OUTER_CORNER_RADIUS;
const INNER_SEGMENTS = OUTER_SEGMENTS;
const SCOOP_RADIUS = 0.34;
const SCOOP_LENGTH = 1.35;

// --- physics tuning ---
// Exp-decay friction per second (v *= friction^dt). 0.72 = ~20s glide from
// a hard flick.
const IDLE_FRICTION = 0.72;
const CATCH_FRICTION = 0.001;
const FLICK_SCALE = 0.02;
const MAX_VELOCITY = 46;
const RELEASE_WINDOW_MS = 90;

// Two-finger center drag → trackball rotation. Pixels of drag per radian of
// yaw/pitch on the parent group. ~300px = 90° reorient.
const TRACKBALL_SCALE = 0.006;

// Spindle axis in the assembly's LOCAL frame. Body-diagonal (1,1,1). Both the
// inner and outer spin around this axis. The parent group (trackball) tilts
// this axis in world space — screen-space projection accounts for that below.
const SPIN_AXIS = new THREE.Vector3(1, 1, 1).normalize();

function FidgetAssembly() {
  // Parent group: receives trackball rotation. Both inner + outer are its
  // children, so a trackball reorient tilts the whole assembly (including
  // the spindle axis) in world space.
  const parentRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);

  // Two independent scalar angular velocities, both around SPIN_AXIS in
  // parent-local space. Signs are independent so inner and outer can spin
  // in opposite directions.
  const innerVelocity = useRef(0);
  const outerVelocity = useRef(0);

  // Multi-touch pointer tracking. We route based on active count:
  //   1 pointer → single-finger inner spin
  //   2 pointers → two-finger mode (trackball + outer twist decomposed
  //                simultaneously from the same movement)
  //   3+ ignored
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());

  // Single-finger (inner) state.
  const innerDragActive = useRef(false);
  const innerLastPointer = useRef<{ x: number; y: number } | null>(null);
  const innerIsCaught = useRef(false);
  const innerMotionHistory = useRef<Array<{ t: number; dx: number; dy: number }>>([]);

  // Two-finger state.
  const twoFingerActive = useRef(false);
  const twoFingerLastCenter = useRef<{ x: number; y: number } | null>(null);
  const twoFingerLastAngle = useRef<number | null>(null);
  const outerIsCaught = useRef(false);
  const outerAngleHistory = useRef<Array<{ t: number; dAngle: number }>>([]);

  const { size, camera } = useThree();

  // Bake outer + inner geometries once. useMemo (not module scope) so React
  // strict-mode double-mount doesn't leak the intermediate BVH-backed brushes.
  const outerGeometry = useMemo(() => buildScoopedShellGeometry(), []);
  const innerGeometry = useMemo(() => buildInnerCoreGeometry(), []);

  const normalize = useCallback(
    (dx: number, dy: number) => {
      const norm = 400 / Math.max(1, size.height);
      return { dx: dx * norm, dy: dy * norm };
    },
    [size.height],
  );

  // Project the spin axis into screen space, taking the parent group's
  // current world-space orientation into account. Sign of (swipe × axis_2d)
  // determines rotational direction from the camera's POV; magnitude is the
  // tangential component we convert to speed. Recomputed every use because
  // the parent's quaternion changes as the user trackballs.
  const projectAxisToScreen = useCallback(() => {
    const result = new THREE.Vector2();
    if (!parentRef.current) return result;
    const worldAxis = SPIN_AXIS.clone().applyQuaternion(parentRef.current.quaternion);
    const origin = parentRef.current.position.clone().project(camera);
    const tip = parentRef.current.position.clone().add(worldAxis).project(camera);
    return result.set(tip.x - origin.x, -(tip.y - origin.y));
  }, [camera]);

  const swipeToInnerSpinDelta = useCallback(
    (dx: number, dy: number) => {
      const axis2 = projectAxisToScreen();
      const cross = dx * axis2.y - dy * axis2.x;
      return cross * FLICK_SCALE;
    },
    [projectAxisToScreen],
  );

  // --- two-finger helpers ---
  const computeCenter = () => {
    const ps = Array.from(activePointers.current.values());
    return { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 };
  };
  const computeAngle = () => {
    const ps = Array.from(activePointers.current.values());
    return Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x);
  };

  // --- mode transitions ---
  const startInnerDrag = (x: number, y: number) => {
    innerDragActive.current = true;
    innerIsCaught.current = Math.abs(innerVelocity.current) > 0.5;
    if (innerIsCaught.current) pulseHaptic(18);
    innerLastPointer.current = { x, y };
    innerMotionHistory.current = [];
  };

  const cancelInnerDrag = () => {
    // Used on transition to 2-finger — we don't want to fling the inner just
    // because the user added a second finger.
    innerDragActive.current = false;
    innerIsCaught.current = false;
    innerLastPointer.current = null;
    innerMotionHistory.current = [];
  };

  const endInnerDrag = () => {
    if (!innerDragActive.current) return;
    innerDragActive.current = false;
    const now = performance.now();
    const recent = innerMotionHistory.current.filter((s) => now - s.t <= RELEASE_WINDOW_MS);
    if (recent.length === 0 || innerIsCaught.current) {
      if (innerIsCaught.current) innerVelocity.current = 0;
      innerIsCaught.current = false;
      return;
    }
    let sumDx = 0;
    let sumDy = 0;
    for (const s of recent) {
      sumDx += s.dx;
      sumDy += s.dy;
    }
    const dtSec = Math.max(0.016, (now - recent[0].t) / 1000);
    const axis2 = projectAxisToScreen();
    const cross = sumDx * axis2.y - sumDy * axis2.x;
    const seed = (cross / dtSec) * FLICK_SCALE;
    innerVelocity.current = THREE.MathUtils.clamp(seed, -MAX_VELOCITY, MAX_VELOCITY);
    if (Math.abs(innerVelocity.current) > 4) pulseHaptic(10);
  };

  const startTwoFinger = () => {
    twoFingerActive.current = true;
    outerIsCaught.current = Math.abs(outerVelocity.current) > 0.5;
    if (outerIsCaught.current) pulseHaptic(18);
    twoFingerLastCenter.current = computeCenter();
    twoFingerLastAngle.current = computeAngle();
    outerAngleHistory.current = [];
  };

  const endTwoFinger = () => {
    if (!twoFingerActive.current) return;
    twoFingerActive.current = false;
    const now = performance.now();
    const recent = outerAngleHistory.current.filter((s) => now - s.t <= RELEASE_WINDOW_MS);
    twoFingerLastCenter.current = null;
    twoFingerLastAngle.current = null;
    if (recent.length === 0 || outerIsCaught.current) {
      if (outerIsCaught.current) outerVelocity.current = 0;
      outerIsCaught.current = false;
      return;
    }
    let sumDA = 0;
    for (const s of recent) sumDA += s.dAngle;
    const dtSec = Math.max(0.016, (now - recent[0].t) / 1000);
    const seed = sumDA / dtSec;
    outerVelocity.current = THREE.MathUtils.clamp(seed, -MAX_VELOCITY, MAX_VELOCITY);
    if (Math.abs(outerVelocity.current) > 4) pulseHaptic(10);
  };

  // --- pointer handlers ---
  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    if (activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const n = activePointers.current.size;
    if (n === 1) {
      startInnerDrag(e.clientX, e.clientY);
    } else if (n === 2) {
      // Adding a 2nd finger: kill any in-progress single-finger without
      // seeding a fling (the user is transitioning gestures, not releasing).
      cancelInnerDrag();
      startTwoFinger();
    }
    // 3+ pointers: extras tracked but do nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!activePointers.current.has(e.pointerId)) return;
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const n = activePointers.current.size;

      if (n === 1 && innerDragActive.current && innerLastPointer.current && innerRef.current) {
        const rawDx = e.clientX - innerLastPointer.current.x;
        const rawDy = e.clientY - innerLastPointer.current.y;
        innerLastPointer.current = { x: e.clientX, y: e.clientY };
        const { dx, dy } = normalize(rawDx, rawDy);
        innerMotionHistory.current.push({ t: performance.now(), dx, dy });
        if (innerMotionHistory.current.length > 32) innerMotionHistory.current.shift();
        innerRef.current.rotateOnAxis(SPIN_AXIS, swipeToInnerSpinDelta(dx, dy));
        return;
      }

      if (n >= 2 && twoFingerActive.current && twoFingerLastCenter.current && twoFingerLastAngle.current !== null) {
        // Trackball: center-point delta → yaw/pitch on the parent. We apply
        // via world-axis quaternions (not local Euler) so successive drags
        // compose without axis drift.
        const center = computeCenter();
        const centerDx = center.x - twoFingerLastCenter.current.x;
        const centerDy = center.y - twoFingerLastCenter.current.y;
        twoFingerLastCenter.current = center;
        if (parentRef.current) {
          const yawQ = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            centerDx * TRACKBALL_SCALE,
          );
          const pitchQ = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            centerDy * TRACKBALL_SCALE,
          );
          parentRef.current.quaternion.premultiply(yawQ).premultiply(pitchQ);
        }

        // Outer twist: change in inter-finger angle → rotation around
        // spindle axis. Wrapped to [-π, π] so crossing the atan2 branch cut
        // doesn't cause a huge spurious jump.
        const angle = computeAngle();
        let dAngle = angle - twoFingerLastAngle.current;
        if (dAngle > Math.PI) dAngle -= 2 * Math.PI;
        if (dAngle < -Math.PI) dAngle += 2 * Math.PI;
        twoFingerLastAngle.current = angle;
        outerAngleHistory.current.push({ t: performance.now(), dAngle });
        if (outerAngleHistory.current.length > 32) outerAngleHistory.current.shift();
        if (outerRef.current) outerRef.current.rotateOnAxis(SPIN_AXIS, dAngle);
      }
    },
    [normalize, swipeToInnerSpinDelta],
  );

  const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.delete(e.pointerId);
    const n = activePointers.current.size;

    if (n === 0) {
      // All fingers up — end whichever mode was active.
      if (twoFingerActive.current) endTwoFinger();
      if (innerDragActive.current) endInnerDrag();
      return;
    }
    if (n === 1 && twoFingerActive.current) {
      // Went from 2 → 1 fingers. End two-finger cleanly (seeds outer fling
      // from angle history), then start a fresh single-finger drag on the
      // remaining pointer so the user can transition mid-gesture.
      endTwoFinger();
      const [remaining] = activePointers.current.values();
      startInnerDrag(remaining.x, remaining.y);
    }
    // n >= 2 still: stay in two-finger mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_state, delta) => {
    const dt = Math.min(0.05, delta);

    // Inner spin — decays even while user is two-fingering (inner is idle
    // then), just not while user is actively dragging with one finger.
    const inner = innerRef.current;
    if (inner && !innerDragActive.current) {
      inner.rotateOnAxis(SPIN_AXIS, innerVelocity.current * dt);
      const f = innerIsCaught.current ? CATCH_FRICTION : IDLE_FRICTION;
      innerVelocity.current *= Math.pow(f, dt);
      if (Math.abs(innerVelocity.current) < 0.02) innerVelocity.current = 0;
    }

    // Outer spin — decays only when not being actively twisted.
    const outer = outerRef.current;
    if (outer && !twoFingerActive.current) {
      outer.rotateOnAxis(SPIN_AXIS, outerVelocity.current * dt);
      const f = outerIsCaught.current ? CATCH_FRICTION : IDLE_FRICTION;
      outerVelocity.current *= Math.pow(f, dt);
      if (Math.abs(outerVelocity.current) < 0.02) outerVelocity.current = 0;
    }
  });

  return (
    <>
      {/* Full-viewport invisible hit surface so gestures register anywhere,
          not only on the cube's silhouette. Fires all pointer events with
          pointer capture so we can track multi-touch reliably. */}
      <mesh
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        visible={false}
      >
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Parent — receives trackball reorient (2-finger center-drag). */}
      <group ref={parentRef}>
        {/* Inner core — spins around SPIN_AXIS in parent-local space. Only
            visible where it protrudes through the outer's scoop openings
            (see buildInnerCoreGeometry). */}
        <mesh ref={innerRef} geometry={innerGeometry}>
          <IridescentChromeMaterial />
        </mesh>

        {/* Outer shell — spins around SPIN_AXIS in parent-local space,
            independent of the inner. Cylindrical channel is coaxial with
            the spin axis so rotation doesn't require re-cutting geometry. */}
        <mesh ref={outerRef} geometry={outerGeometry}>
          <IridescentChromeMaterial />
        </mesh>
      </group>
    </>
  );
}

/**
 * PVD iridescent chrome — shared by inner + outer so highlights transfer
 * across the seam without a visible material break.
 */
function IridescentChromeMaterial() {
  return (
    <meshPhysicalMaterial
      color="#c8c8d0"
      metalness={1}
      roughness={0.08}
      iridescence={1}
      iridescenceIOR={1.35}
      iridescenceThicknessRange={[120, 780]}
      envMapIntensity={1.4}
      clearcoat={1}
      clearcoatRoughness={0.05}
    />
  );
}

/**
 * Outer shell: rounded cube minus a body-diagonal cylindrical channel. One
 * CSG subtraction cuts both scoops at once because the cylinder passes
 * through both opposing corners.
 */
function buildScoopedShellGeometry(): THREE.BufferGeometry {
  const evaluator = new Evaluator();
  const baseGeom = new RoundedBoxGeometry(OUTER_SIZE, OUTER_SIZE, OUTER_SIZE, OUTER_SEGMENTS, OUTER_CORNER_RADIUS);
  const outerBrush = new Brush(baseGeom);
  outerBrush.updateMatrixWorld();

  const cornerDist = (OUTER_SIZE / 2) * Math.sqrt(3);
  const cutterLength = Math.max(SCOOP_LENGTH, cornerDist * 2 + 0.5);
  const cutterGeom = new THREE.CylinderGeometry(SCOOP_RADIUS, SCOOP_RADIUS, cutterLength, 64);
  const cutter = new Brush(cutterGeom);
  cutter.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), SPIN_AXIS);
  cutter.updateMatrixWorld();

  const result = evaluator.evaluate(outerBrush, cutter, SUBTRACTION);
  outerBrush.geometry.dispose();
  result.geometry.computeVertexNormals();
  return result.geometry;
}

/**
 * Inner core: (cube ∩ scoop cylinder). Only the portion of the cube inside
 * the coaxial cylinder region is kept. As the inner rotates around the spin
 * axis, this clipped geometry stays inside the outer's channel and is only
 * visible where it protrudes through the two scoop openings.
 */
function buildInnerCoreGeometry(): THREE.BufferGeometry {
  const evaluator = new Evaluator();
  const cubeGeom = new RoundedBoxGeometry(INNER_SIZE, INNER_SIZE, INNER_SIZE, INNER_SEGMENTS, INNER_CORNER_RADIUS);
  const cubeBrush = new Brush(cubeGeom);
  cubeBrush.updateMatrixWorld();

  const cornerDist = (OUTER_SIZE / 2) * Math.sqrt(3);
  const cylinderLength = Math.max(SCOOP_LENGTH, cornerDist * 2 + 0.5);
  const cylinderGeom = new THREE.CylinderGeometry(SCOOP_RADIUS, SCOOP_RADIUS, cylinderLength, 64);
  const cylinderBrush = new Brush(cylinderGeom);
  cylinderBrush.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), SPIN_AXIS);
  cylinderBrush.updateMatrixWorld();

  const result = evaluator.evaluate(cubeBrush, cylinderBrush, INTERSECTION);
  cubeBrush.geometry.dispose();
  result.geometry.computeVertexNormals();
  return result.geometry;
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
