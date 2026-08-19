import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { dragController, quarterAngleForMove } from '../animation/dragController';
import { moveQueue } from '../animation/moveController';
import { viewOrientation } from '../animation/viewOrientation';
import { useGameStore } from '../store/gameStore';
import type { Move } from '../types/cube';
import {
  findCubieAncestor,
  normalToWorld,
  raycastToPlane,
} from './raycastHelpers';
import { resolveLayerTurn } from './gestureResolver';
import { commitFlash } from './commitFlash';

/**
 * How far the finger must travel before a layer turn is *committed* (state
 * transitions to `dragging-layer` and the resolver locks a specific slice +
 * axis). Deliberately generous — a small tap-slip should not commit anything.
 * Once committed, subsequent drag drives the layer's angle 1:1.
 */
const LAYER_RESOLVE_THRESHOLD_PX = 22;
const ORBIT_SENSITIVITY = 0.007; // radians per pixel
/**
 * World-space drag distance on the touched face that maps to a 90° turn.
 * Higher = layer follows the finger more slowly, easier to stop on target.
 * A cubie is 1.0 units wide; setting this to ~2.4 means "drag two cubies
 * worth plus a bit" for a full quarter, which matches the muscle memory of
 * physical Rubik's apps and makes overshoot much less likely.
 */
const DRAG_UNITS_PER_QUARTER = 2.4;

type GestureState =
  | { kind: 'idle' }
  | {
      kind: 'possible-layer-turn';
      pointerId: number;
      startX: number;
      startY: number;
      cubieId: number;
      /** Face normal in cube-local (root group's local) space, axis-aligned. */
      faceNormalLocal: THREE.Vector3;
      /** Face normal in world space. */
      faceNormalWorld: THREE.Vector3;
      /** Hit point on the face in world space. */
      hitWorld: THREE.Vector3;
    }
  | {
      kind: 'dragging-layer';
      pointerId: number;
      /** Hit point of the initial touch on the face, in world space. */
      initialHitWorld: THREE.Vector3;
      /** Face normal in world space (defines the drag plane). */
      faceNormalWorld: THREE.Vector3;
      /** Snapped in-plane drag direction in cube-local space. */
      inPlaneDirLocal: THREE.Vector3;
      /** Cached inverse of the root group's world quaternion at drag start. */
      inverseRootQuat: THREE.Quaternion;
      /** Signed radians of one quarter turn in the drag direction. */
      quarterAngle: number;
      primaryMove: Move;
    }
  | {
      kind: 'orbiting';
      pointerId: number;
      lastX: number;
      lastY: number;
    }
  | {
      kind: 'two-finger-orbit';
      pointerIds: [number, number];
      lastX: number;
      lastY: number;
    };

/**
 * Wraps the cube in a group whose rotation the user can spin (orbit). Handles
 * pointer events directly on the canvas so we can precisely arbitrate between
 * "orbit" and "turn a layer" without fighting with r3f's built-in event system.
 */
export function GestureLayer({ children }: { children: ReactNode }) {
  const rootRef = useRef<THREE.Group>(null!);
  const { camera, gl, scene } = useThree();
  const stateRef = useRef<GestureState>({ kind: 'idle' });
  const raycasterRef = useRef(new THREE.Raycaster());
  const planeRef = useRef(new THREE.Plane());
  const activeTouches = useRef<Map<number, { x: number; y: number }>>(new Map());

  useEffect(() => {
    const canvas = gl.domElement;

    const toNDC = (e: PointerEvent, out: THREE.Vector2) => {
      const rect = canvas.getBoundingClientRect();
      out.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      out.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      return out;
    };

    const ndc = new THREE.Vector2();
    const tmpVec = new THREE.Vector3();
    const tmpVec2 = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();

    const raycastCube = (e: PointerEvent) => {
      if (!rootRef.current) return null;
      toNDC(e, ndc);
      raycasterRef.current.setFromCamera(ndc, camera);
      const hits = raycasterRef.current.intersectObject(rootRef.current, true);
      for (const hit of hits) {
        const ancestor = findCubieAncestor(hit.object);
        if (ancestor && hit.face) {
          return { hit, ancestor };
        }
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (moveQueue.isBusy()) return; // ignore inputs during animation or active drag
      activeTouches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Two-finger touch → yaw drag with the pair's horizontal midpoint.
      if (activeTouches.current.size === 2 && e.pointerType === 'touch') {
        const [a, b] = Array.from(activeTouches.current.entries());
        viewOrientation.beginDrag();
        stateRef.current = {
          kind: 'two-finger-orbit',
          pointerIds: [a[0], b[0]],
          lastX: (a[1].x + b[1].x) / 2,
          lastY: (a[1].y + b[1].y) / 2,
        };
        return;
      }
      if (activeTouches.current.size > 1) return;

      // Don't start a layer turn or a yaw drag while the view itself is still
      // animating — the touched face normal wouldn't match what the player is
      // looking at by the time the drag resolves.
      if (viewOrientation.isAnimating()) return;

      const cubeHit = raycastCube(e);
      // Post-solve / post-objective: still allow orbit (empty-space drag) so
      // the user can admire the cube, but don't start a layer turn the store
      // would silently reject.
      const store = useGameStore.getState();
      const layerTurnsBlocked =
        store.phase === 'solved' || store.objectiveCompleted;
      if (cubeHit && !layerTurnsBlocked) {
        // Compute world-space face normal from mesh-local face normal.
        const meshWorldNormal = normalToWorld(
          cubeHit.hit.object,
          cubeHit.hit.face!.normal.clone(),
          new THREE.Vector3(),
        );
        // Convert to cube-local (root group) frame.
        rootRef.current!.getWorldQuaternion(tmpQuat).invert();
        const localNormal = meshWorldNormal.clone().applyQuaternion(tmpQuat).normalize();
        // Snap to nearest axis for numerical safety.
        const snapped = snapToAxis(localNormal);

        stateRef.current = {
          kind: 'possible-layer-turn',
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          cubieId: cubeHit.ancestor.cubieId,
          faceNormalLocal: snapped,
          faceNormalWorld: meshWorldNormal,
          hitWorld: cubeHit.hit.point.clone(),
        };
        canvas.setPointerCapture(e.pointerId);
      } else {
        viewOrientation.beginDrag();
        stateRef.current = {
          kind: 'orbiting',
          pointerId: e.pointerId,
          lastX: e.clientX,
          lastY: e.clientY,
        };
        canvas.setPointerCapture(e.pointerId);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const s = stateRef.current;
      if (activeTouches.current.has(e.pointerId)) {
        activeTouches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (s.kind === 'two-finger-orbit') {
        // Use midpoint of the two tracked touches.
        const pts = s.pointerIds
          .map((id) => activeTouches.current.get(id))
          .filter(Boolean) as { x: number; y: number }[];
        if (pts.length < 2) return;
        const cx = (pts[0].x + pts[1].x) / 2;
        const cy = (pts[0].y + pts[1].y) / 2;
        viewOrientation.updateDrag((cx - s.lastX) * ORBIT_SENSITIVITY);
        s.lastX = cx;
        s.lastY = cy;
        return;
      }

      if (s.kind === 'orbiting' && e.pointerId === s.pointerId) {
        viewOrientation.updateDrag((e.clientX - s.lastX) * ORBIT_SENSITIVITY);
        s.lastX = e.clientX;
        s.lastY = e.clientY;
        return;
      }

      if (s.kind === 'possible-layer-turn' && e.pointerId === s.pointerId) {
        const dx = e.clientX - s.startX;
        const dy = e.clientY - s.startY;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < LAYER_RESOLVE_THRESHOLD_PX * LAYER_RESOLVE_THRESHOLD_PX) return;

        // Project the current pointer position onto the touched face plane in world space.
        toNDC(e, ndc);
        const hit = raycastToPlane(
          ndc,
          camera,
          s.hitWorld,
          s.faceNormalWorld,
          raycasterRef.current,
          planeRef.current,
          tmpVec,
        );
        if (!hit) {
          // Ray parallel to face — fall back to orbit.
          stateRef.current = {
            kind: 'orbiting',
            pointerId: e.pointerId,
            lastX: e.clientX,
            lastY: e.clientY,
          };
          return;
        }
        // World-space drag vector on the face plane.
        const worldDrag = tmpVec2.copy(hit).sub(s.hitWorld);
        // Convert to cube-local frame.
        const inverseRootQuat = new THREE.Quaternion();
        rootRef.current!.getWorldQuaternion(inverseRootQuat).invert();
        const localDrag = worldDrag.clone().applyQuaternion(inverseRootQuat);

        // Look up the touched cubie's current logical position.
        const cubie = useGameStore.getState().cubeState.cubies.find(
          (c) => c.id === s.cubieId,
        );
        if (!cubie) {
          stateRef.current = { kind: 'idle' };
          return;
        }
        const primaryMove = resolveLayerTurn(
          s.faceNormalLocal,
          localDrag,
          cubie.position,
        );
        if (!primaryMove) {
          // Degenerate (middle slice / degenerate direction). Wait for more
          // drag rather than committing to orbit — user hasn't lifted yet.
          return;
        }

        // Snap the local drag to its dominant in-plane axis.
        const inPlaneDirLocal = snapInPlane(localDrag, s.faceNormalLocal);
        const quarterAngle = quarterAngleForMove(primaryMove);

        const cubies = useGameStore.getState().cubeState.cubies;
        const live = dragController.start(cubies, primaryMove);
        if (!live) {
          stateRef.current = { kind: 'idle' };
          return;
        }
        // Arcade commit flash — every sticker's traceline briefly pulses so
        // the player gets an unmistakable "yes, this layer" confirmation.
        commitFlash.fire();

        // Seed the initial angle from the drag we've already accumulated so
        // there's no visual jump on first frame.
        const d = localDrag.dot(inPlaneDirLocal);
        dragController.updateAngle(d * (quarterAngle / DRAG_UNITS_PER_QUARTER));

        stateRef.current = {
          kind: 'dragging-layer',
          pointerId: e.pointerId,
          initialHitWorld: s.hitWorld.clone(),
          faceNormalWorld: s.faceNormalWorld.clone(),
          inPlaneDirLocal,
          inverseRootQuat,
          quarterAngle,
          primaryMove,
        };
        return;
      }

      if (s.kind === 'dragging-layer' && e.pointerId === s.pointerId) {
        toNDC(e, ndc);
        const hit = raycastToPlane(
          ndc,
          camera,
          s.initialHitWorld,
          s.faceNormalWorld,
          raycasterRef.current,
          planeRef.current,
          tmpVec,
        );
        if (!hit) return; // ray parallel to face for a frame — skip.
        const worldDrag = tmpVec2.copy(hit).sub(s.initialHitWorld);
        const localDrag = worldDrag.applyQuaternion(s.inverseRootQuat);
        const d = localDrag.dot(s.inPlaneDirLocal);
        dragController.updateAngle(d * (s.quarterAngle / DRAG_UNITS_PER_QUARTER));
        return;
      }
    };

    const endPointer = (e: PointerEvent, canceled = false) => {
      activeTouches.current.delete(e.pointerId);
      const s = stateRef.current;
      if (s.kind === 'two-finger-orbit') {
        if (activeTouches.current.size < 2) {
          if (canceled) viewOrientation.cancelDrag();
          else viewOrientation.endDrag();
          // Fall back to single-pointer state if any remains.
          const remaining = Array.from(activeTouches.current.entries())[0];
          if (remaining) {
            viewOrientation.beginDrag();
            stateRef.current = {
              kind: 'orbiting',
              pointerId: remaining[0],
              lastX: remaining[1].x,
              lastY: remaining[1].y,
            };
          } else {
            stateRef.current = { kind: 'idle' };
          }
        }
      } else if (s.kind === 'dragging-layer' && s.pointerId === e.pointerId) {
        if (canceled) {
          dragController.abort();
        } else {
          dragController.release((move) => {
            if (!move) return;
            useGameStore.getState().commitPlayerMove(move);
          });
        }
        stateRef.current = { kind: 'idle' };
      } else if (s.kind === 'orbiting' && s.pointerId === e.pointerId) {
        if (canceled) viewOrientation.cancelDrag();
        else viewOrientation.endDrag();
        stateRef.current = { kind: 'idle' };
      } else if (
        s.kind === 'possible-layer-turn' &&
        s.pointerId === e.pointerId
      ) {
        stateRef.current = { kind: 'idle' };
      }
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }
    };

    const onPointerUp = (e: PointerEvent) => endPointer(e, false);
    const onPointerCancel = (e: PointerEvent) => endPointer(e, true);

    // pointermove/up are on window so we still receive them if the pointer
    // strays off the canvas mid-drag (pointer capture also helps but window
    // listeners are a belt-and-suspenders fallback for some browsers).
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [camera, gl, scene]);

  useFrame((_, delta) => {
    if (!rootRef.current) return;
    viewOrientation.tick(delta, rootRef.current.quaternion);
  });

  return <group ref={rootRef}>{children}</group>;
}

function snapToAxis(v: THREE.Vector3): THREE.Vector3 {
  const ax = Math.abs(v.x);
  const ay = Math.abs(v.y);
  const az = Math.abs(v.z);
  if (ax >= ay && ax >= az) return new THREE.Vector3(Math.sign(v.x) || 1, 0, 0);
  if (ay >= az) return new THREE.Vector3(0, Math.sign(v.y) || 1, 0);
  return new THREE.Vector3(0, 0, Math.sign(v.z) || 1);
}

/**
 * Snap a drag vector to its dominant in-plane axis, ignoring the component
 * along `faceNormal`. Returns a unit axis-aligned vector in local space.
 */
function snapInPlane(
  drag: THREE.Vector3,
  faceNormal: THREE.Vector3,
): THREE.Vector3 {
  const projected = drag.clone();
  if (Math.abs(faceNormal.x) > 0.5) projected.x = 0;
  else if (Math.abs(faceNormal.y) > 0.5) projected.y = 0;
  else projected.z = 0;
  return snapToAxis(projected);
}

