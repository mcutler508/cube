import * as THREE from 'three';
import type { Cubie, Move } from '../types/cube';
import { FACE_DEFS } from '../cube/notation';
import { planLayerCubies } from './layerAnimation';
import { moveQueue } from './moveController';

interface BaseTransform {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

interface LiveDrag {
  kind: 'live';
  cubieIds: Set<number>;
  axis: THREE.Vector3;
  baseTransforms: Map<number, BaseTransform>;
  /** Signed radians about `axis`. Updated per pointermove. */
  angle: number;
  /**
   * The move that a positive-direction drag was resolved to. Used at release
   * to translate the snapped angle back into a Move.
   */
  primaryMove: Move;
  /**
   * Signed radians representing exactly one quarter turn of `primaryMove` about
   * `axis`. Its sign tells us which direction of `angle` corresponds to
   * `primaryMove` vs its inverse.
   */
  quarterAngle: number;
}

interface SnapAnim {
  kind: 'snap';
  cubieIds: Set<number>;
  axis: THREE.Vector3;
  baseTransforms: Map<number, BaseTransform>;
  startAngle: number;
  targetAngle: number;
  elapsed: number;
  duration: number;
  onDone: (committedMove: Move | null) => void;
  committedMove: Move | null;
}

export type ActiveDrag = LiveDrag | SnapAnim;

type Listener = () => void;

const MAX_ANGLE = Math.PI; // clamp visible + snap range to +/- 180deg

class DragController {
  private active: ActiveDrag | null = null;
  private listeners = new Set<Listener>();

  isActive(): boolean {
    return this.active !== null;
  }

  get(): ActiveDrag | null {
    return this.active;
  }

  /**
   * Begin a live drag. `primaryMove` is the move a positive-direction drag
   * (in the caller's chosen "positive" axis) would commit to.
   */
  start(cubies: Cubie[], primaryMove: Move): LiveDrag | null {
    if (this.active) return null;
    const plan = planLayerCubies(cubies, primaryMove);
    const live: LiveDrag = {
      kind: 'live',
      cubieIds: plan.cubieIds,
      axis: plan.axis,
      baseTransforms: plan.baseTransforms,
      angle: 0,
      primaryMove,
      quarterAngle: plan.targetAngle,
    };
    this.active = live;
    moveQueue.setBusy(true);
    this.notify();
    return live;
  }

  updateAngle(angle: number) {
    if (!this.active || this.active.kind !== 'live') return;
    this.active.angle = clamp(angle, -MAX_ANGLE, MAX_ANGLE);
  }

  /**
   * Snap to nearest 90-degree detent and play a short polish animation. When
   * the animation completes, `onCommit` fires with the resulting move (or
   * null for snap-back-to-zero).
   */
  release(onCommit: (move: Move | null) => void) {
    if (!this.active || this.active.kind !== 'live') return;
    const live = this.active;
    const snappedAngle = snapAngle(live.angle);
    const move = angleToMove(live.primaryMove, live.quarterAngle, snappedAngle);
    const snap: SnapAnim = {
      kind: 'snap',
      cubieIds: live.cubieIds,
      axis: live.axis,
      baseTransforms: live.baseTransforms,
      startAngle: live.angle,
      targetAngle: snappedAngle,
      elapsed: 0,
      duration: computeSnapDuration(live.angle, snappedAngle),
      committedMove: move,
      onDone: onCommit,
    };
    this.active = snap;
    this.notify();
  }

  /**
   * Snap back to zero without committing a move. Use for pointercancel and
   * similar interruptions where committing based on the current angle would
   * be surprising.
   */
  abort() {
    if (!this.active) return;
    if (this.active.kind !== 'live') return;
    const live = this.active;
    const snap: SnapAnim = {
      kind: 'snap',
      cubieIds: live.cubieIds,
      axis: live.axis,
      baseTransforms: live.baseTransforms,
      startAngle: live.angle,
      targetAngle: 0,
      elapsed: 0,
      duration: computeSnapDuration(live.angle, 0),
      committedMove: null,
      onDone: () => {
        /* nothing */
      },
    };
    this.active = snap;
    this.notify();
  }

  /**
   * Immediately tear down the drag without animation. Meant for hard resets
   * (level reset, exit-to-menu) where the store state is about to change and
   * the cubie group refs will be re-baked.
   */
  cancel() {
    if (!this.active) return;
    this.active = null;
    moveQueue.setBusy(false);
    this.notify();
  }

  /** Advance the snap animation. Called from the Cube's per-frame tick. */
  tick(delta: number): void {
    if (!this.active || this.active.kind !== 'snap') return;
    const snap = this.active;
    snap.elapsed += delta;
    if (snap.elapsed >= snap.duration) {
      const move = snap.committedMove;
      const cb = snap.onDone;
      this.active = null;
      moveQueue.setBusy(false);
      cb(move);
      this.notify();
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const dragController = new DragController();

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Round to nearest multiple of π/2 in the range [-π, π]. */
export function snapAngle(angle: number): number {
  const q = Math.PI / 2;
  const clamped = clamp(angle, -MAX_ANGLE, MAX_ANGLE);
  const k = Math.round(clamped / q);
  return clamp(k * q, -MAX_ANGLE, MAX_ANGLE);
}

/**
 * Convert a snapped angle back to a Move on the primary move's face.
 * `k` is the signed number of quarter turns about the positive axis:
 * - k = 0 → no commit
 * - |k| = 2 → half turn (either direction)
 * - sign(k) matches sign(quarterAngle) → primaryMove
 * - opposite sign → inverse of primaryMove
 */
export function angleToMove(
  primary: Move,
  quarterAngle: number,
  snappedAngle: number,
): Move | null {
  const k = Math.round(snappedAngle / (Math.PI / 2));
  if (k === 0) return null;
  if (Math.abs(k) === 2) return { face: primary.face, turns: 2 };
  const primarySign = Math.sign(quarterAngle);
  const matches = Math.sign(k) === primarySign;
  if (matches) return primary;
  return {
    face: primary.face,
    turns: primary.turns === 2 ? 2 : ((-primary.turns) as 1 | -1),
  };
}

/**
 * Duration in seconds for the polish snap. Shorter for smaller corrections so
 * near-perfect drags feel instant; longer (but still snappy) for near-45°
 * "did they mean it?" swipes.
 */
function computeSnapDuration(from: number, to: number): number {
  const diff = Math.abs(to - from);
  const perQuarter = diff / (Math.PI / 2);
  return clamp(perQuarter * 0.11, 0.05, 0.16);
}

/**
 * Given the (cube-local) face normal of the touched face, an axis-snapped
 * in-plane drag direction, and the primary move, return `quarterAngle` — the
 * signed radians of a full quarter turn in the direction the drag pushes.
 *
 * Exposed as a helper so the gesture layer can compute the drag→angle mapping
 * without duplicating the sign math.
 */
export function quarterAngleForMove(move: Move): number {
  const def = FACE_DEFS[move.face];
  const qSign = ((move.turns === 2 ? 1 : move.turns) * def.baseTurns) as 1 | -1;
  return qSign * (Math.PI / 2);
}
