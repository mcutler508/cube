import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { moveQueue } from '../../animation/moveController';
import {
  easeInOutCubic,
  planLayerAnimation,
  type RunningAnimation,
} from '../../animation/layerAnimation';
import { dragController, type ActiveDrag } from '../../animation/dragController';
import { mat3ToQuaternion } from '../../animation/orientation';
import { viewOrientation } from '../../animation/viewOrientation';
import { CUBIE_SPACING } from '../../cube/geometry';
import { useGameStore } from '../../store/gameStore';
import type { Cubie as CubieModel, FaceLetter, Vec3 } from '../../types/cube';
import { Cubie } from './Cubie';

const DEFAULT_DURATION = 0.19; // seconds per quarter turn
const IDLE_HINT_DELAY_MS = 3500;

const FACE_CENTER_HOME: Record<FaceLetter, Vec3> = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

const tmpQuat = new THREE.Quaternion();
const tmpVec = new THREE.Vector3();

export function Cube() {
  const cubies = useGameStore((s) => s.cubeState.cubies);
  const cubeSize = useGameStore((s) => s.currentLevel?.cubeSize ?? '3x3');
  // During a guided-phase drill, we know which face the player is expected
  // to turn next. We show that hint on a single "source" piece (the center
  // cubie of the target face) — but only after the player has been idle
  // for a few seconds, so they still get to try on their own first.
  const hintTargetFace = useGameStore((s) => {
    const drill = s.currentLevel?.drill;
    const ds = s.drillState;
    if (!drill || !ds || ds.phase !== 'guided' || s.objectiveCompleted) return null;
    const move = drill.algorithm[ds.expectedIndex];
    return move?.face ?? null;
  });
  const moveCount = useGameStore((s) => s.moveCount);
  const currentLevelId = useGameStore((s) => s.currentLevel?.id ?? null);
  const guidedDrillActive = useGameStore(
    (s) =>
      !!(
        s.currentLevel?.drill &&
        s.drillState &&
        s.drillState.phase === 'guided' &&
        !s.objectiveCompleted
      ),
  );

  // Snap the cube back to the notation-friendly orientation (white up, green
  // front, red right) whenever a guided drill becomes active or the player
  // switches to a different guided level. Combined with the orbit-lock in
  // GestureLayer, this keeps U/R/F visually matching up/front/right.
  useEffect(() => {
    if (guidedDrillActive) viewOrientation.resetToCanonical();
  }, [guidedDrillActive, currentLevelId]);

  const [idle, setIdle] = useState(false);
  useEffect(() => {
    setIdle(false);
    if (!hintTargetFace) return;
    const id = window.setTimeout(() => setIdle(true), IDLE_HINT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [hintTargetFace, moveCount, currentLevelId]);

  const activeHintFace = idle ? hintTargetFace : null;
  const hintCubieId = useMemo<number | null>(() => {
    if (!activeHintFace) return null;
    const [x, y, z] = FACE_CENTER_HOME[activeHintFace];
    const center = cubies.find(
      (c) => c.home[0] === x && c.home[1] === y && c.home[2] === z,
    );
    return center?.id ?? null;
  }, [activeHintFace, cubies]);

  // Map of cubieId → face letter for the six center cubies. Populated only
  // during a guided drill so the labels appear alongside the orientation
  // lock — outside of drills the cube stays visually pristine.
  const centerLabelByCubieId = useMemo<Map<number, FaceLetter> | null>(() => {
    if (!guidedDrillActive) return null;
    const map = new Map<number, FaceLetter>();
    for (const face of ['U', 'D', 'R', 'L', 'F', 'B'] as FaceLetter[]) {
      const [x, y, z] = FACE_CENTER_HOME[face];
      const c = cubies.find(
        (cb) => cb.home[0] === x && cb.home[1] === y && cb.home[2] === z,
      );
      if (c) map.set(c.id, face);
    }
    return map;
  }, [guidedDrillActive, cubies]);
  const cubeStateRef = useRef(useGameStore.getState().cubeState);
  const groupRefs = useRef<Map<number, THREE.Group>>(new Map());
  const animationRef = useRef<RunningAnimation | null>(null);
  /** Cubie ids owned by the most recent drag — re-baked when the drag clears. */
  const lastDragCubieIdsRef = useRef<Set<number> | null>(null);

  // Keep a live ref to the current cube state so we can plan animations at
  // the exact moment a move is popped from the queue, not from stale render
  // props.
  useEffect(
    () => useGameStore.subscribe((s) => {
      cubeStateRef.current = s.cubeState;
    }),
    [],
  );

  // When state changes and no animation is running, snap each cubie group to
  // the state-derived transform. This is the "bake" step after an animation
  // completes, and also covers Reset / initial mount. Skip while a drag owns
  // the affected cubies — the drag tick will re-render them.
  useEffect(() => {
    if (animationRef.current) return;
    const drag = dragController.get();
    for (const c of cubies) {
      if (drag && drag.cubieIds.has(c.id)) continue;
      const group = groupRefs.current.get(c.id);
      if (!group) continue;
      applyState(group, c);
    }
  }, [cubies]);

  useFrame((_, delta) => {
    tick(delta, groupRefs, animationRef, lastDragCubieIdsRef);
  });

  const visibleCubies = useMemo(() => {
    // 3x3 hides just the core (position 0,0,0). 2x2 hides every non-corner:
    // any cubie with a zero on any axis is either an edge, face-center, or
    // the core. The engine still tracks them (face turns move them) — we
    // simply don't draw them.
    if (cubeSize === '2x2') {
      return cubies.filter(
        (c) => c.home[0] !== 0 && c.home[1] !== 0 && c.home[2] !== 0,
      );
    }
    return cubies.filter(
      (c) => !(c.home[0] === 0 && c.home[1] === 0 && c.home[2] === 0),
    );
  }, [cubies, cubeSize]);

  const attachRef = useCallback((id: number) => (g: THREE.Group | null) => {
    if (g) groupRefs.current.set(id, g);
    else groupRefs.current.delete(id);
  }, []);
  // Cache one ref callback per cubie id so React doesn't remount the ref every render.
  const refCache = useRef<Map<number, (g: THREE.Group | null) => void>>(new Map());
  const getRef = useCallback(
    (id: number) => {
      let fn = refCache.current.get(id);
      if (!fn) {
        fn = attachRef(id);
        refCache.current.set(id, fn);
      }
      return fn;
    },
    [attachRef],
  );

  // Layout scale trick for 2x2. State positions stay ±1 (so animations,
  // hit tests, and detection all keep working as-is), but we render the 8
  // corner cubies half as far from center — otherwise deleting the middle
  // row leaves a full-cubie-wide gap between corners and the cube looks
  // like 8 floating dice. The compensating `renderScale={2}` inside each
  // Cubie keeps cubie + sticker sizes constant in world units so a 2x2
  // cubie is the same size as a 3x3 one, just packed tighter.
  const layoutScale = cubeSize === '2x2' ? 0.5 : 1;
  const cubieRenderScale = cubeSize === '2x2' ? 2 : 1;
  return (
    <group scale={layoutScale}>
      {visibleCubies.map((c) => (
        <Cubie
          key={c.id}
          cubie={c}
          renderScale={cubieRenderScale}
          hintFace={c.id === hintCubieId ? activeHintFace : null}
          centerLabel={centerLabelByCubieId?.get(c.id) ?? null}
          ref={getRef(c.id)}
        />
      ))}
    </group>
  );
}

function applyState(group: THREE.Group, c: CubieModel) {
  group.position.set(
    c.position[0] * CUBIE_SPACING,
    c.position[1] * CUBIE_SPACING,
    c.position[2] * CUBIE_SPACING,
  );
  mat3ToQuaternion(c.rotation, group.quaternion);
}

/**
 * Advance the current animation (if any) and start the next queued move when
 * idle. Everything here is imperative so we don't trigger React re-renders per
 * frame.
 */
function tick(
  delta: number,
  groupRefs: React.MutableRefObject<Map<number, THREE.Group>>,
  animationRef: React.MutableRefObject<RunningAnimation | null>,
  lastDragCubieIdsRef: React.MutableRefObject<Set<number> | null>,
) {
  // Live-drag / snap-back path takes precedence over queued animations.
  // Queue is gated behind moveQueue.isBusy() (which the drag controller flips
  // while it owns cubies), so the two paths never render the same cubie in a
  // given frame.
  const drag = dragController.get();
  if (drag) {
    renderDrag(drag, groupRefs);
    lastDragCubieIdsRef.current = drag.cubieIds;
    dragController.tick(delta);
    return;
  }

  // Drag just cleared. Re-bake affected cubies from state so we recover
  // cleanly whether commitPlayerMove ran (state changed, transforms match) or
  // was rejected (no-op, cubies need to snap back visually).
  if (lastDragCubieIdsRef.current) {
    const state = useGameStore.getState().cubeState;
    for (const c of state.cubies) {
      if (!lastDragCubieIdsRef.current.has(c.id)) continue;
      const group = groupRefs.current.get(c.id);
      if (group) applyState(group, c);
    }
    lastDragCubieIdsRef.current = null;
  }

  let anim = animationRef.current;
  if (!anim) {
    anim = startNext(groupRefs, animationRef);
    if (!anim) return;
  }

  anim.elapsed += delta;
  const rawT = Math.min(anim.elapsed / anim.duration, 1);
  const t = easeInOutCubic(rawT);
  const angle = anim.targetAngle * t;

  for (const id of anim.cubieIds) {
    const group = groupRefs.current.get(id);
    if (!group) continue;
    const base = anim.baseTransforms.get(id);
    if (!base) continue;
    // Position: rotate the base position around the world axis by the current angle.
    tmpVec.copy(base.position).applyAxisAngle(anim.axis, angle);
    group.position.copy(tmpVec);
    // Orientation: pre-multiply an axis-angle quaternion onto the base orientation.
    tmpQuat.setFromAxisAngle(anim.axis, angle);
    group.quaternion.copy(tmpQuat).multiply(base.quaternion);
  }

  if (rawT >= 1) {
    anim.onDone();
    // Snap all affected cubies to the new state to eliminate any residual drift.
    const state = useGameStore.getState().cubeState;
    for (const c of state.cubies) {
      if (!anim.cubieIds.has(c.id)) continue;
      const group = groupRefs.current.get(c.id);
      if (group) applyState(group, c);
    }
    animationRef.current = null;
    moveQueue.setBusy(false);
    startNext(groupRefs, animationRef);
  }
}

function renderDrag(
  drag: ActiveDrag,
  groupRefs: React.MutableRefObject<Map<number, THREE.Group>>,
) {
  const angle =
    drag.kind === 'live'
      ? drag.angle
      : drag.startAngle +
        (drag.targetAngle - drag.startAngle) *
          easeInOutCubic(Math.min(drag.elapsed / drag.duration, 1));
  for (const id of drag.cubieIds) {
    const group = groupRefs.current.get(id);
    if (!group) continue;
    const base = drag.baseTransforms.get(id);
    if (!base) continue;
    tmpVec.copy(base.position).applyAxisAngle(drag.axis, angle);
    group.position.copy(tmpVec);
    tmpQuat.setFromAxisAngle(drag.axis, angle);
    group.quaternion.copy(tmpQuat).multiply(base.quaternion);
  }
}

function startNext(
  _groupRefs: React.MutableRefObject<Map<number, THREE.Group>>,
  animationRef: React.MutableRefObject<RunningAnimation | null>,
): RunningAnimation | null {
  if (moveQueue.isBusy()) return null;
  const next = moveQueue.shift();
  if (!next) return null;
  const state = useGameStore.getState().cubeState;
  const duration = next.duration ?? DEFAULT_DURATION;
  const anim = planLayerAnimation(state.cubies, next.move, duration, () => {
    const store = useGameStore.getState();
    if (next.kind === 'player') store.commitPlayerMove(next.move);
    else if (next.kind === 'scramble') store.commitScrambleMove(next.move);
    else store.commitUndoMove(next.move);
    next.onCommitted?.();
  });
  animationRef.current = anim;
  moveQueue.setBusy(true);
  return anim;
}

