/**
 * Tiny synth for game feedback. No sample files — every sound is a couple of
 * oscillator "blips" shaped by a short amplitude envelope. Keeps the bundle
 * small and lets us match tone intensity to feedback tier procedurally.
 *
 * The AudioContext is created lazily on first user interaction (mobile
 * browsers require this) and shared across all tone plays.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

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
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(ctx.destination);
  return ctx;
}

/** iOS/Chrome sometimes suspend the context until user interaction. */
export function resumeAudio(): void {
  const c = ensureContext();
  if (c && c.state === 'suspended') {
    void c.resume();
  }
}

export function setMasterVolume(v: number): void {
  ensureContext();
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
}

interface Blip {
  /** Frequency in Hz. */
  freq: number;
  /** Delay from "now" in seconds. */
  at: number;
  /** Length of the note in seconds. */
  duration: number;
  /** Peak amplitude 0..1. */
  peak: number;
  /** Oscillator type. */
  type?: OscillatorType;
}

function playBlip(blip: Blip): void {
  const c = ensureContext();
  if (!c || !masterGain) return;
  const t0 = c.currentTime + blip.at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = blip.type ?? 'sine';
  osc.frequency.value = blip.freq;
  // Short attack, exponential-ish decay via linearRampToValueAtTime.
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(blip.peak, t0 + 0.006);
  gain.gain.linearRampToValueAtTime(0.0001, t0 + blip.duration);
  osc.connect(gain).connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + blip.duration + 0.02);
}

function playChord(freqs: number[], duration: number, peak: number, type: OscillatorType = 'sine'): void {
  for (const f of freqs) playBlip({ freq: f, at: 0, duration, peak, type });
}

function playSequence(freqs: number[], step: number, duration: number, peak: number): void {
  freqs.forEach((f, i) => playBlip({ freq: f, at: i * step, duration, peak }));
}

/** Tone catalog, keyed loosely by feedback tier. */
export const tones = {
  move(): void {
    playBlip({ freq: 620, at: 0, duration: 0.05, peak: 0.18, type: 'triangle' });
  },
  /**
   * Rising-pitch chime for a progress gain. `intensity` is the streak scalar
   * (0..1) — higher combo adds a fifth-above harmonic that thickens the tone.
   * The base pitch always tracks the delta amount.
   */
  progressGain(amount: number, intensity: number = 0): void {
    const clamped = Math.max(1, Math.min(20, amount));
    const freq = 480 + clamped * 22;
    playBlip({ freq, at: 0, duration: 0.09, peak: 0.16, type: 'sine' });
    if (intensity >= 0.3) {
      // Add a perfect-fifth harmonic. Volume ramps with intensity so mild
      // combos are subtle and hot streaks feel richer.
      const harmPeak = 0.06 + intensity * 0.12;
      playBlip({ freq: freq * 1.5, at: 0.005, duration: 0.11, peak: harmPeak, type: 'sine' });
    }
    if (intensity >= 0.7) {
      // A high sparkle blip layered on the hottest streaks.
      playBlip({ freq: freq * 2, at: 0.02, duration: 0.09, peak: 0.08, type: 'triangle' });
    }
  },
  rowComplete(): void {
    playSequence([660, 880], 0.05, 0.11, 0.22);
  },
  crossComplete(): void {
    playChord([523, 659], 0.16, 0.22, 'sine');
  },
  faceComplete(): void {
    playChord([523, 659, 784], 0.22, 0.26, 'triangle');
  },
  layerComplete(): void {
    playSequence([523, 659, 784, 988], 0.06, 0.18, 0.24);
  },
  objectiveComplete(): void {
    playSequence([523, 659, 784, 1046], 0.07, 0.22, 0.28);
  },
  cubeSolved(): void {
    // Fuller, longer sting.
    playChord([392, 523, 659, 784], 0.4, 0.28, 'sine');
    playBlip({ freq: 1046, at: 0.18, duration: 0.35, peak: 0.24, type: 'triangle' });
  },
};
