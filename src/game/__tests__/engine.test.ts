import { describe, expect, it, vi } from 'vitest';
import { applyMove, applyMoves, createSolvedCube } from '../../cube/cubeState';
import { parseSequence } from '../../cube/notation';
import { DIFFICULTY_CONFIGS, DIFFICULTY_ORDER, getDifficultyConfig } from '../difficulty';
import { evaluateProgress, solvedFaces } from '../progress';
import { updateStreak, streakLabel } from '../streak';
import { intensityFor, intensityScalar } from '../intensity';
import { gameEvents } from '../events';

describe('difficulty configs', () => {
  it('has all four difficulties in order easy → master', () => {
    expect(DIFFICULTY_ORDER).toEqual(['easy', 'normal', 'hard', 'master']);
    for (const id of DIFFICULTY_ORDER) {
      expect(DIFFICULTY_CONFIGS[id].id).toBe(id);
    }
  });

  it('scramble length is monotonic across difficulties', () => {
    const lengths = DIFFICULTY_ORDER.map((id) => DIFFICULTY_CONFIGS[id].scrambleMin);
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]);
    }
  });

  it('helper arrows only on easy', () => {
    expect(getDifficultyConfig('easy').helperArrows).toBe(true);
    expect(getDifficultyConfig('normal').helperArrows).toBe(false);
    expect(getDifficultyConfig('hard').helperArrows).toBe(false);
    expect(getDifficultyConfig('master').helperArrows).toBe(false);
  });

  it('score multiplier grows with difficulty', () => {
    const multipliers = DIFFICULTY_ORDER.map((id) => DIFFICULTY_CONFIGS[id].scoreMultiplier);
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]).toBeGreaterThanOrEqual(multipliers[i - 1]);
    }
  });
});

describe('progress evaluator', () => {
  it('solved cube = 100%', () => {
    const p = evaluateProgress(createSolvedCube());
    expect(p.percentage).toBe(100);
    expect(p.solvedCubies).toBe(20);
    expect(p.orientedCubies).toBe(20);
    expect(p.solvedFaces).toHaveLength(6);
  });

  it('a scramble decreases progress from 100', () => {
    const scrambled = applyMoves(createSolvedCube(), parseSequence("R U R' F L D2 B'"));
    const p = evaluateProgress(scrambled);
    expect(p.percentage).toBeLessThan(100);
    expect(p.solvedCubies).toBeLessThan(20);
  });

  it('single R turn produces a moderate but non-catastrophic drop', () => {
    const before = evaluateProgress(createSolvedCube()).percentage;
    const after = evaluateProgress(applyMove(createSolvedCube(), { face: 'R', turns: 1 })).percentage;
    expect(before - after).toBeGreaterThan(0);
    expect(before - after).toBeLessThan(60);
  });

  it('progress changes stay bounded per move (no wild jumps)', () => {
    // The first move from a solved cube is the biggest — it breaks 4 faces
    // plus knocks 8 cubies off. Cap at 60% for that; interior moves are
    // naturally much smaller.
    let state = applyMove(createSolvedCube(), { face: 'R', turns: 1 });
    let prev = evaluateProgress(state).percentage;
    for (const move of parseSequence("U R' U' F' L D2 B U'")) {
      state = applyMove(state, move);
      const curr = evaluateProgress(state).percentage;
      expect(Math.abs(curr - prev)).toBeLessThanOrEqual(30);
      prev = curr;
    }
  });
});

describe('solved face detection', () => {
  it('all 6 faces solved on fresh cube', () => {
    expect(solvedFaces(createSolvedCube())).toHaveLength(6);
  });

  it('a single R turn breaks the 4 adjacent faces (U, D, F, B), leaves L intact', () => {
    const s = applyMove(createSolvedCube(), { face: 'R', turns: 1 });
    const still = solvedFaces(s);
    expect(still).toContain('L');
    expect(still).toContain('R');
    expect(still).not.toContain('U');
    expect(still).not.toContain('F');
    expect(still).not.toContain('D');
    expect(still).not.toContain('B');
  });

  it('R then R\' restores all six solved faces', () => {
    const s = applyMoves(createSolvedCube(), [
      { face: 'R', turns: 1 },
      { face: 'R', turns: -1 },
    ]);
    expect(solvedFaces(s)).toHaveLength(6);
  });
});

describe('streak logic', () => {
  it('positive delta increments streak', () => {
    expect(updateStreak(0, 5)).toBe(1);
    expect(updateStreak(3, 1)).toBe(4);
  });

  it('exact-zero delta preserves streak (neutral move)', () => {
    expect(updateStreak(3, 0)).toBe(3);
  });

  it('tiny negative delta preserves streak (setup move)', () => {
    expect(updateStreak(3, -1)).toBe(3);
    expect(updateStreak(3, -2)).toBe(3);
  });

  it('meaningful regression resets streak', () => {
    expect(updateStreak(5, -3)).toBe(0);
    expect(updateStreak(9, -20)).toBe(0);
  });

  it('streak labels only appear at 2+', () => {
    expect(streakLabel(0)).toBeNull();
    expect(streakLabel(1)).toBeNull();
    expect(streakLabel(2)).toBe('x2 STREAK');
    expect(streakLabel(5)).toBe('NICE');
    expect(streakLabel(10)).toBe('GREAT FLOW');
  });
});

describe('intensity tier', () => {
  it('assigns the correct tier for each range', () => {
    expect(intensityFor(0, false)).toBe('calm');
    expect(intensityFor(24, false)).toBe('calm');
    expect(intensityFor(25, false)).toBe('warm');
    expect(intensityFor(49, false)).toBe('warm');
    expect(intensityFor(50, false)).toBe('active');
    expect(intensityFor(74, false)).toBe('active');
    expect(intensityFor(75, false)).toBe('heightened');
    expect(intensityFor(89, false)).toBe('heightened');
    expect(intensityFor(90, false)).toBe('near');
    expect(intensityFor(99, false)).toBe('near');
    expect(intensityFor(100, true)).toBe('solved');
  });

  it('scalar clamps to [0, 1]', () => {
    expect(intensityScalar(-10)).toBe(0);
    expect(intensityScalar(50)).toBe(0.5);
    expect(intensityScalar(150)).toBe(1);
  });
});

describe('game event bus', () => {
  it('delivers events to subscribers and stops when unsubscribed', () => {
    const spy = vi.fn();
    const off = gameEvents.subscribe(spy);
    gameEvents.emit({ type: 'faceCompleted', face: 'U' });
    expect(spy).toHaveBeenCalledTimes(1);
    off();
    gameEvents.emit({ type: 'faceCompleted', face: 'U' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('a subscriber unsubscribing mid-dispatch does not skip other subscribers', () => {
    const a = vi.fn();
    let offB: (() => void) | null = null;
    const b = vi.fn(() => {
      offB?.();
    });
    const c = vi.fn();
    gameEvents.subscribe(a);
    offB = gameEvents.subscribe(b);
    gameEvents.subscribe(c);
    gameEvents.emit({ type: 'streakBroken', previousStreak: 3 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(c).toHaveBeenCalledTimes(1);
  });
});
