/**
 * Synthesized bearing-hum for the fidget mode. Uses Web Audio: a looped
 * pink-noise source runs through a bandpass filter (metallic mid-band),
 * then a gain node. The FidgetScene drives `setFidgetIntensity(v)` each
 * frame with a normalized 0..1 value derived from the sum of the two
 * spin velocities — that modulates BOTH the gain (loudness) and the
 * filter center frequency (perceived pitch), so a fast spin sounds
 * louder and slightly higher-pitched than a slow one.
 *
 * Self-contained: owns its own AudioContext, initialized lazily on the
 * first call once a user gesture unlocks audio (mobile requirement). The
 * source starts once and runs indefinitely; only the gain moves. This
 * costs almost nothing when the gain is 0 (fully attenuated) and avoids
 * the click artifacts that stopping/restarting an oscillator produces.
 *
 * Respects the global audio-enabled setting via isAudioEnabled().
 */

import { isAudioEnabled } from '../audio/audio';

// --- audio graph state ---
let ctx: AudioContext | null = null;
let noiseSource: AudioBufferSourceNode | null = null;
let bandpass: BiquadFilterNode | null = null;
let gain: GainNode | null = null;
let initialized = false;

// --- tuning ---
// Bandpass center frequency at rest vs at max spin. The bearing sound is
// a metallic mid-band whistle; higher spin → sharper/brighter sound.
const FREQ_MIN = 720;
const FREQ_MAX = 1600;
// Filter Q — higher = more resonant "singing metal" whistle; too high
// starts to sound like a synth oscillator instead of noise.
const FILTER_Q = 5.5;
// Peak gain at full spin. Kept modest so it never dominates the app's
// other sound effects. Adjust up if the bearing hum is inaudible.
const MAX_GAIN = 0.12;
// Smoothing time constant for gain/freq ramps (seconds). ~40ms feels
// responsive without producing zipper noise.
const RAMP_TC = 0.04;

/**
 * Generate a ~2 second pink-noise buffer. Pink (1/f) noise sits mid-
 * frequency-heavy so it filters into a natural-sounding metallic band
 * better than white. Voss-McCartney would be more accurate but this
 * simple filtered-white version is indistinguishable for a bearing hum.
 */
function makePinkNoiseBuffer(c: AudioContext): AudioBuffer {
  const sampleRate = c.sampleRate;
  const length = sampleRate * 2;
  const buffer = c.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  // Paul Kellett's 3-pole pink noise approximation. Cheap, sounds right.
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.96300 * b1 + white * 0.294276;
    b2 = 0.57000 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
  }
  return buffer;
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ??
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

function ensureGraph(): boolean {
  if (initialized) return true;
  const c = ensureContext();
  if (!c) return false;

  const buffer = makePinkNoiseBuffer(c);
  noiseSource = c.createBufferSource();
  noiseSource.buffer = buffer;
  noiseSource.loop = true;

  bandpass = c.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = FREQ_MIN;
  bandpass.Q.value = FILTER_Q;

  gain = c.createGain();
  gain.gain.value = 0;

  noiseSource.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(c.destination);
  noiseSource.start();

  initialized = true;
  return true;
}

/**
 * Drive the bearing hum. `intensity` is expected to be 0..1 (clamped).
 * 0 = silent (rest), 1 = maximum loudness + pitch. FidgetScene computes
 * this from the sum of the two spin velocities normalized by MAX_VELOCITY.
 *
 * If audio is globally disabled (settings toggle), immediately ramps to
 * silence without changing the initialization state — so re-enabling
 * audio and calling this again picks right back up.
 */
export function setFidgetIntensity(intensity: number): void {
  if (!ensureGraph()) return;
  if (!ctx || !gain || !bandpass) return;
  const c = ctx;
  // Resume from the suspended state (some browsers hold new AudioContexts
  // in 'suspended' until a user gesture — we just try; failures are silent).
  if (c.state === 'suspended') void c.resume();

  const target = isAudioEnabled() ? Math.max(0, Math.min(1, intensity)) : 0;
  const now = c.currentTime;
  gain.gain.setTargetAtTime(target * MAX_GAIN, now, RAMP_TC);
  bandpass.frequency.setTargetAtTime(FREQ_MIN + (FREQ_MAX - FREQ_MIN) * target, now, RAMP_TC);
}

/**
 * Fully stop and tear down the audio graph. Call from FidgetScene unmount
 * so we don't leak an active AudioContext after the user exits the fidget
 * mode. Safe to call multiple times / when nothing is initialized.
 */
export function stopFidgetSound(): void {
  if (gain) {
    try {
      gain.gain.cancelScheduledValues(ctx?.currentTime ?? 0);
      gain.gain.value = 0;
    } catch {
      /* ignore */
    }
  }
  if (noiseSource) {
    try {
      noiseSource.stop();
      noiseSource.disconnect();
    } catch {
      /* already stopped */
    }
    noiseSource = null;
  }
  if (bandpass) {
    try {
      bandpass.disconnect();
    } catch {
      /* ignore */
    }
    bandpass = null;
  }
  if (gain) {
    try {
      gain.disconnect();
    } catch {
      /* ignore */
    }
    gain = null;
  }
  initialized = false;
  // Note: we deliberately don't close ctx — closing an AudioContext is
  // heavy and re-creating one requires another user gesture. Leaving it
  // alive means re-entering the fidget mode is instant.
}
