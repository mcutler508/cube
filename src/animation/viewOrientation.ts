import * as THREE from 'three';

/**
 * View-orientation controller.
 *
 * The physical Rubik's solve only ever holds the cube with white or yellow
 * facing up. This controller enforces that constraint on the 3D view: the
 * cube's world orientation is always the composition of one of four 90°
 * yaw steps around the world-Y axis with an optional 180° flip that swaps
 * the white pole and the yellow pole.
 *
 * The controller supports a live yaw drag (during which the view follows the
 * finger 1:1) and eases smoothly to the target quaternion on release. A
 * flip() call is a discrete 180° animation between the two vertical poles.
 */

type State =
  | { kind: 'idle' }
  | { kind: 'dragging'; baseQuat: THREE.Quaternion; yawDelta: number };

const FLIP_AXIS = new THREE.Vector3(1, 0, 0);
const YAW_AXIS = new THREE.Vector3(0, 1, 0);
/**
 * Exponential-approach rate for easing the current quaternion toward the
 * target after a drag release or a flip. Roughly, `1 / EASE_RATE` seconds is
 * one time constant; the visible motion settles in ~300 ms.
 */
const EASE_RATE = 12;
const SETTLED_EPSILON = 0.0006;

class ViewOrientationController {
  private yawIndex: 0 | 1 | 2 | 3 = 0;
  /** false = white facing up (canonical for F2L). true = yellow up (daisy / OLL / PLL). */
  private flipped = true;
  private state: State = { kind: 'idle' };
  private readonly currentQuat = new THREE.Quaternion();
  private readonly targetQuat = new THREE.Quaternion();
  private readonly tmpA = new THREE.Quaternion();
  private readonly tmpB = new THREE.Quaternion();

  constructor() {
    this.recomputeTarget();
    this.currentQuat.copy(this.targetQuat);
  }

  beginDrag(): void {
    this.state = {
      kind: 'dragging',
      baseQuat: this.currentQuat.clone(),
      yawDelta: 0,
    };
  }

  updateDrag(deltaYawRadians: number): void {
    if (this.state.kind !== 'dragging') return;
    this.state.yawDelta += deltaYawRadians;
  }

  endDrag(): void {
    if (this.state.kind !== 'dragging') return;
    const stepsFromBase = Math.round(this.state.yawDelta / (Math.PI / 2));
    this.yawIndex = ((((this.yawIndex + stepsFromBase) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
    this.state = { kind: 'idle' };
    this.recomputeTarget();
  }

  cancelDrag(): void {
    this.state = { kind: 'idle' };
    this.recomputeTarget();
  }

  flip(): void {
    if (this.state.kind === 'dragging') this.state = { kind: 'idle' };
    this.flipped = !this.flipped;
    this.recomputeTarget();
  }

  isFlipped(): boolean {
    return this.flipped;
  }

  isDragging(): boolean {
    return this.state.kind === 'dragging';
  }

  /**
   * Accumulated yaw drag in radians while a drag is in progress. Returns 0
   * when idle. Purely for visual affordances (a knob that follows the finger)
   * that want to mirror the drag without owning any input themselves.
   */
  getDragDelta(): number {
    return this.state.kind === 'dragging' ? this.state.yawDelta : 0;
  }

  /** True while the current quaternion is still easing toward its target. */
  isAnimating(): boolean {
    if (this.state.kind === 'dragging') return true;
    return !quatsClose(this.currentQuat, this.targetQuat);
  }

  tick(deltaSeconds: number, out: THREE.Quaternion): void {
    if (this.state.kind === 'dragging') {
      // Live drag: apply accumulated yaw around world-Y on top of the base
      // orientation captured at drag start (premultiply for world-axis).
      this.tmpA.setFromAxisAngle(YAW_AXIS, this.state.yawDelta);
      this.currentQuat.copy(this.state.baseQuat).premultiply(this.tmpA);
    } else {
      const t = 1 - Math.exp(-EASE_RATE * Math.max(0, deltaSeconds));
      this.currentQuat.slerp(this.targetQuat, t);
    }
    out.copy(this.currentQuat);
  }

  private recomputeTarget(): void {
    const yaw = (this.yawIndex * Math.PI) / 2;
    this.tmpA.setFromAxisAngle(YAW_AXIS, yaw);
    if (this.flipped) {
      this.tmpB.setFromAxisAngle(FLIP_AXIS, Math.PI);
      this.targetQuat.copy(this.tmpA).multiply(this.tmpB);
    } else {
      this.targetQuat.copy(this.tmpA);
    }
  }
}

function quatsClose(a: THREE.Quaternion, b: THREE.Quaternion): boolean {
  // Quaternions q and -q represent the same rotation, so compare both signs.
  const d = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  return 1 - Math.abs(d) < SETTLED_EPSILON;
}

export const viewOrientation = new ViewOrientationController();
