import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, ContactShadows, SpotLight } from '@react-three/drei';
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
 * Interaction (three gestures):
 *   - 1-finger swipe: spins the INNER around the spindle axis. Tap while
 *     spinning to catch.
 *   - 1 anchor + 1 flicker (2 fingers, one held still, other swiping):
 *     "grab-and-flick" — the flicker's swipe drives the OUTER spin via the
 *     same tangential-to-axis math as the inner spin. Physically models
 *     pinching the assembly with one hand and flicking the outer with the
 *     other. Enables counter-rotation of inner vs outer.
 *   - 2-finger drag (both fingers moving together): trackball-reorients the
 *     whole assembly in 3D so you can see it from any angle.
 *
 *   The two-finger gestures are distinguished per-frame: if one of the two
 *   pointers hasn't fired a pointermove in ~60ms (or its most recent delta
 *   was <1.2px), it's treated as an anchor and the other drives outer spin.
 *   Otherwise both are moving and we route to trackball.
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
      <ambientLight intensity={0.2} />
      {/* Neutral warm/cool key + fill from the top half. */}
      <directionalLight position={[4, 6, 3]} intensity={0.5} color="#ffe6c4" />
      <directionalLight position={[-5, 2, -3]} intensity={0.3} color="#8ea6ff" />

      {/* Rainbow "gel" lights ringed around the cube. Iridescence's spectral
          shift needs COLORED incoming light to produce a visible rainbow —
          the neutral HDRI alone gives a mostly-monochrome shimmer. These
          five saturated point lights at different positions bounce off the
          chrome at different angles, so the iridescent film shifts each
          hotspot through a different band of the visible spectrum and you
          see all the colors on the piece at once. */}
      <pointLight position={[3.5, 1.5, 2]} intensity={12} color="#ff2a5a" distance={9} decay={2} />
      <pointLight position={[-3, 0.5, 2.5]} intensity={12} color="#5a2aff" distance={9} decay={2} />
      <pointLight position={[2, -1.5, -3]} intensity={12} color="#00e0a8" distance={9} decay={2} />
      <pointLight position={[-2.5, 2.5, -2]} intensity={12} color="#ffbf00" distance={9} decay={2} />
      <pointLight position={[0, -2.5, 3]} intensity={10} color="#00c0ff" distance={9} decay={2} />

      <ResponsiveCamera />
      <Suspense fallback={null}>
        {/* Colorful HDRI is REQUIRED for iridescence to actually read as
            rainbow — a neutral studio softbox gives grey chrome because
            there are no colored lights to shift. Warehouse mixes cool
            skylights + warm sodium lamps + orange bounce, so the thin-film
            interference produces visible spectral shifts across the whole
            surface. */}
        <Environment preset="warehouse" background={false} />
        <BeamLight />
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
const FLICK_SCALE = 0.02;
const MAX_VELOCITY = 46;
const RELEASE_WINDOW_MS = 90;

// Two-finger center drag → trackball rotation. Pixels of drag per radian of
// yaw/pitch on the parent group. ~300px = 90° reorient.
const TRACKBALL_SCALE = 0.006;

// Grab-and-flick detection: if a pointer hasn't fired a pointermove in this
// many ms, it's treated as an "anchor" (finger held still). The other,
// moving finger becomes the "flicker" that drives outer spin. Human fingers
// held stationary don't fire pointermove events, so this reliably catches
// intentional holds.
const ANCHOR_STALE_MS = 60;
// Fallback: even if a finger IS firing pointermove events (finger drift),
// treat it as anchor if its most-recent move delta was below this — catches
// the case where a "held" finger drifts a fraction of a pixel per frame.
const ANCHOR_MICRO_MOVE_PX = 1.2;

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
  //   2 pointers → two-finger mode. Per-move, we check which of the two
  //                is "held still" (anchor) vs moving (flicker). If exactly
  //                one is moving, moving finger's swipe drives OUTER spin.
  //                If both are moving in parallel, center-delta drives the
  //                trackball reorient.
  //   3+ ignored
  const activePointers = useRef<Map<number, {
    x: number;
    y: number;
    lastMoveTime: number;
    lastMoveDelta: number;
  }>>(new Map());

  // Single-finger (inner) state.
  const innerDragActive = useRef(false);
  const innerLastPointer = useRef<{ x: number; y: number } | null>(null);
  const innerMotionHistory = useRef<Array<{ t: number; dx: number; dy: number }>>([]);

  // Two-finger state — trackball reorient + grab-and-flick outer spin.
  const twoFingerActive = useRef(false);
  const twoFingerLastCenter = useRef<{ x: number; y: number } | null>(null);
  // Flicker's per-frame motion history — seeds the outer's release velocity
  // when the flicker lifts (or when we exit two-finger mode).
  const outerFlickHistory = useRef<Array<{ t: number; dx: number; dy: number }>>([]);

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

  // --- mode transitions ---
  // Deliberately no "catch on gesture start" — touching down (even mid-spin)
  // should not slow the piece. Momentum belongs to the piece, not the finger.
  // If the user wants to stop a spin, they drag against it or wait it out.
  const startInnerDrag = (x: number, y: number) => {
    innerDragActive.current = true;
    innerLastPointer.current = { x, y };
    innerMotionHistory.current = [];
  };

  const cancelInnerDrag = () => {
    // Used on transition to 2-finger — no fling seed, no velocity change.
    innerDragActive.current = false;
    innerLastPointer.current = null;
    innerMotionHistory.current = [];
  };

  const endInnerDrag = () => {
    if (!innerDragActive.current) return;
    innerDragActive.current = false;
    const now = performance.now();
    const recent = innerMotionHistory.current.filter((s) => now - s.t <= RELEASE_WINDOW_MS);
    if (recent.length === 0) return; // tap without motion: keep prior spin
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
    // ADD to existing velocity rather than replace — a flick on an already-
    // spinning inner should push it faster (or slow it if the flick opposes).
    innerVelocity.current = THREE.MathUtils.clamp(
      innerVelocity.current + seed,
      -MAX_VELOCITY,
      MAX_VELOCITY,
    );
    if (Math.abs(seed) > 4) pulseHaptic(10);
  };

  const startTwoFinger = () => {
    twoFingerActive.current = true;
    twoFingerLastCenter.current = computeCenter();
    outerFlickHistory.current = [];
  };

  const endTwoFinger = () => {
    if (!twoFingerActive.current) return;
    twoFingerActive.current = false;
    const now = performance.now();
    const recent = outerFlickHistory.current.filter((s) => now - s.t <= RELEASE_WINDOW_MS);
    twoFingerLastCenter.current = null;
    if (recent.length === 0) return; // no flicker motion: keep prior outer spin
    let sumDx = 0;
    let sumDy = 0;
    for (const s of recent) {
      sumDx += s.dx;
      sumDy += s.dy;
    }
    const dtSec = Math.max(0.016, (now - recent[0].t) / 1000);
    // Same tangential-to-axis math as inner-spin release — outer feels
    // continuous with the inner even though the input gesture differs.
    const axis2 = projectAxisToScreen();
    const cross = sumDx * axis2.y - sumDy * axis2.x;
    const seed = (cross / dtSec) * FLICK_SCALE;
    // ADD to existing velocity rather than replace — successive flicks
    // accumulate; a reverse flick brakes.
    outerVelocity.current = THREE.MathUtils.clamp(
      outerVelocity.current + seed,
      -MAX_VELOCITY,
      MAX_VELOCITY,
    );
    if (Math.abs(seed) > 4) pulseHaptic(10);
  };

  // --- pointer handlers ---
  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    if (activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      lastMoveTime: performance.now(),
      lastMoveDelta: 0,
    });
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
      const prev = activePointers.current.get(e.pointerId);
      if (!prev) return;
      const now = performance.now();
      const rawDx = e.clientX - prev.x;
      const rawDy = e.clientY - prev.y;
      const moveDelta = Math.hypot(rawDx, rawDy);
      activePointers.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        lastMoveTime: now,
        lastMoveDelta: moveDelta,
      });
      const n = activePointers.current.size;

      if (n === 1 && innerDragActive.current && innerLastPointer.current && innerRef.current) {
        innerLastPointer.current = { x: e.clientX, y: e.clientY };
        const { dx, dy } = normalize(rawDx, rawDy);
        innerMotionHistory.current.push({ t: now, dx, dy });
        if (innerMotionHistory.current.length > 32) innerMotionHistory.current.shift();
        innerRef.current.rotateOnAxis(SPIN_AXIS, swipeToInnerSpinDelta(dx, dy));
        return;
      }

      if (n >= 2 && twoFingerActive.current) {
        // Find the OTHER finger (not the one that just moved) and decide if
        // it's currently acting as an anchor (held still). Two signals count:
        //   1. It hasn't fired a pointermove in ANCHOR_STALE_MS.
        //   2. Its most-recent move delta was smaller than ANCHOR_MICRO_MOVE_PX
        //      — catches finger drift where events keep firing but by <1px.
        // If exactly one finger is anchoring, the other is the flicker →
        // grab-and-flick outer spin. Otherwise both are moving → trackball.
        let other:
          | { x: number; y: number; lastMoveTime: number; lastMoveDelta: number }
          | undefined;
        for (const [id, data] of activePointers.current) {
          if (id !== e.pointerId) {
            other = data;
            break;
          }
        }
        if (!other) return;
        const otherStale = now - other.lastMoveTime > ANCHOR_STALE_MS;
        const otherMicro = other.lastMoveDelta < ANCHOR_MICRO_MOVE_PX;
        const otherIsAnchor = otherStale || otherMicro;

        if (otherIsAnchor) {
          // Grab-and-flick: THIS finger drives outer spin via the same
          // tangential-to-axis math as the 1-finger inner spin.
          const { dx, dy } = normalize(rawDx, rawDy);
          outerFlickHistory.current.push({ t: now, dx, dy });
          if (outerFlickHistory.current.length > 32) outerFlickHistory.current.shift();
          if (outerRef.current) {
            outerRef.current.rotateOnAxis(SPIN_AXIS, swipeToInnerSpinDelta(dx, dy));
          }
          // Keep lastCenter in sync silently so if the user transitions from
          // flick → trackball, the next center-delta doesn't jump.
          twoFingerLastCenter.current = computeCenter();
        } else if (twoFingerLastCenter.current) {
          // Both fingers moving → trackball reorient of the parent group.
          // Center-delta drives yaw/pitch via world-axis quaternions (not
          // local Euler) so successive drags compose without axis drift.
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
        }
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
      // from flick history if there was recent flicker motion), then start
      // a fresh single-finger drag on the remaining pointer so the user
      // can transition mid-gesture.
      endTwoFinger();
      const [remaining] = activePointers.current.values();
      startInnerDrag(remaining.x, remaining.y);
    }
    // n >= 2 still: stay in two-finger mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_state, delta) => {
    const dt = Math.min(0.05, delta);

    // Both pieces continue their spin every frame, regardless of what the
    // fingers are currently doing. This is the key fix: previously we froze
    // velocity-driven rotation while a drag was active, which meant that
    // touching down to start a trackball gesture visibly stopped an already-
    // spinning inner. Now direct-drag rotation (from pointermove) composes
    // ON TOP of the velocity-driven rotation, so a spinning piece keeps
    // spinning through any concurrent finger activity.
    const inner = innerRef.current;
    if (inner) {
      inner.rotateOnAxis(SPIN_AXIS, innerVelocity.current * dt);
      innerVelocity.current *= Math.pow(IDLE_FRICTION, dt);
      if (Math.abs(innerVelocity.current) < 0.02) innerVelocity.current = 0;
    }
    const outer = outerRef.current;
    if (outer) {
      outer.rotateOnAxis(SPIN_AXIS, outerVelocity.current * dt);
      outerVelocity.current *= Math.pow(IDLE_FRICTION, dt);
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

// Slightly darker chrome base than pure white. On full metalness the base
// color TINTS the specular reflection — a darker tint (rather than bright
// white) means the iridescent rainbow shows against a chromier background
// instead of washing to a bright neutral.
const GALAXY_TINT = '#8890a0';

/**
 * PVD iridescent chrome — the fidget's "Galaxy" finish. Shared by inner +
 * outer so highlights transfer across the seam without a visible material
 * break. Two tuning choices make the rainbow show dramatically:
 *   1. Wide film thickness range (80-950nm) sweeps the whole visible
 *      spectrum across surface normals — more dramatic than plain chrome's
 *      ~120-780 window.
 *   2. Slightly darker chrome tint (see GALAXY_TINT). At metalness=1 the
 *      base color tints the specular; a darker base means the iridescent
 *      colored highlights punch harder against the reflection instead of
 *      being buried in a bright neutral.
 * The colorful HDRI (warehouse — see FidgetScene) is what actually drives
 * the visible rainbow. Studio HDRIs are neutral and give grey chrome.
 */
function IridescentChromeMaterial() {
  return (
    <meshPhysicalMaterial
      color={GALAXY_TINT}
      metalness={1}
      // Slightly smoother than 0.08 → tighter, brighter highlights so the
      // rainbow-shifted spots read as vivid punches instead of soft washes.
      roughness={0.04}
      iridescence={1}
      // Higher IOR = stronger spectral shift per unit of normal change =
      // more rainbow variation across the surface.
      iridescenceIOR={1.6}
      // Widened all the way to a full-spectrum sweep.
      iridescenceThicknessRange={[50, 1000]}
      envMapIntensity={1.6}
      clearcoat={1}
      clearcoatRoughness={0.04}
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

/**
 * Visible volumetric spotlight beam that strikes the fidget cube from the
 * upper-front-left. drei's SpotLight renders a cone geometry with a fake-
 * volumetric shader (the "beam" you see in space), plus the actual
 * three.js SpotLight illumination that the chrome material reflects.
 *
 * The chrome + iridescence combo makes the beam's hit-point on the cube
 * produce colored highlights that shift across the spectrum as the piece
 * rotates — reads as prism-like refraction even though the light is
 * technically only reflecting off an opaque metal surface.
 *
 * three.js SpotLights point along their local -Z; to aim at the cube
 * (origin) we set a target Object3D there and attach it as the light's
 * target once mounted.
 */
function BeamLight() {
  const spotRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  useLayoutEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
      spotRef.current.target.updateMatrixWorld();
    }
  }, []);
  return (
    <>
      <object3D ref={targetRef} position={[0, 0, 0]} />
      <SpotLight
        ref={spotRef}
        position={[-2.6, 3.4, 2.2]}
        color="#f4f0ff"
        distance={7}
        // Very narrow cone → reads as a laser, not a floodlight. 0.06 rad
        // is about 3.4° which is essentially a pencil beam at this scene
        // scale.
        angle={0.06}
        // Near-zero penumbra so the cone edge is crisp instead of soft.
        penumbra={0.08}
        // Slow falloff along length → the beam maintains its brightness
        // most of the way from origin to cube instead of fading to nothing.
        attenuation={6.5}
        // Sharper edge falloff at the cone rim → thinner-looking beam.
        anglePower={8}
        // Cranked so the reflected hotspot on the chrome punches even next
        // to the bright warehouse HDRI reflections.
        intensity={90}
        volumetric
        // Higher opacity than the earlier soft cone → visible beam reads
        // as solid coherent light, laser-like.
        opacity={0.65}
      />
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
