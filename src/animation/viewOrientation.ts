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
 *
 * A live pitch drag is also allowed, but clamped to a shallow ±45° peek so
 * the player can nudge to glance at the top or bottom face without ever
 * fully disorienting the view. On release, a firm nudge past the halfway
 * mark commits (equivalent to pressing flip); a light nudge springs back.
 */

type State =
  | { kind: 'idle' }
  | {
      kind: 'dragging';
      baseQuat: THREE.Quaternion;
      yawDelta: number;
      pitchDelta: number;
    };

const FLIP_AXIS = new THREE.Vector3(1, 0, 0);
const YAW_AXIS = new THREE.Vector3(0, 1, 0);
const PITCH_AXIS = new THREE.Vector3(1, 0, 0);
/**
 * Max live tilt while the finger is held. Asymmetric because the camera
 * sits ~32° above the cube, so a symmetric peek shows the top generously
 * but only slivers the bottom. We give the downward peek extra runway to
 * compensate; the upward peek stays modest because the camera already
 * favors it.
 *
 * Sign convention: positive pitch tilts the geometric top toward the
 * camera (drag down on screen → peek top). Negative peeks the bottom.
 */
const MAX_PITCH_TILT_UP = Math.PI / 4; // 45°
const MAX_PITCH_TILT_DOWN = (4 * Math.PI) / 9; // 80°
/**
 * Past this much tilt on release, snap forward to the newly-revealed pole
 * (equivalent to pressing the flip button). Deliberately set very close to
 * the max on each side: the peek is the primary use case — the player has
 * to really jam the cube up against the clamp for a commit to trigger.
 * The flip button remains the intended way to actually flip.
 */
const PITCH_COMMIT_UP = MAX_PITCH_TILT_UP * 0.92;
const PITCH_COMMIT_DOWN = MAX_PITCH_TILT_DOWN * 0.92;
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
      pitchDelta: 0,
    };
  }

  updateDrag(deltaYawRadians: number, deltaPitchRadians = 0): void {
    if (this.state.kind !== 'dragging') return;
    this.state.yawDelta += deltaYawRadians;
    this.state.pitchDelta = Math.max(
      -MAX_PITCH_TILT_DOWN,
      Math.min(MAX_PITCH_TILT_UP, this.state.pitchDelta + deltaPitchRadians),
    );
  }

  endDrag(): void {
    if (this.state.kind !== 'dragging') return;
    const stepsFromBase = Math.round(this.state.yawDelta / (Math.PI / 2));
    this.yawIndex = ((((this.yawIndex + stepsFromBase) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
    const pitch = this.state.pitchDelta;
    const commitThreshold = pitch >= 0 ? PITCH_COMMIT_UP : PITCH_COMMIT_DOWN;
    if (Math.abs(pitch) >= commitThreshold) {
      this.flipped = !this.flipped;
    }
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

  /** Accumulated pitch tilt in radians while a drag is in progress. */
  getPitchDelta(): number {
    return this.state.kind === 'dragging' ? this.state.pitchDelta : 0;
  }

  /** True while the current quaternion is still easing toward its target. */
  isAnimating(): boolean {
    if (this.state.kind === 'dragging') return true;
    return !quatsClose(this.currentQuat, this.targetQuat);
  }

  tick(deltaSeconds: number, out: THREE.Quaternion): void {
    if (this.state.kind === 'dragging') {
      // Live drag: apply accumulated yaw around world-Y and pitch around
      // world-X on top of the base orientation captured at drag start
      // (premultiply for world-axis rotations).
      this.tmpA.setFromAxisAngle(YAW_AXIS, this.state.yawDelta);
      this.tmpB.setFromAxisAngle(PITCH_AXIS, this.state.pitchDelta);
      this.currentQuat
        .copy(this.state.baseQuat)
        .premultiply(this.tmpA)
        .premultiply(this.tmpB);
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
