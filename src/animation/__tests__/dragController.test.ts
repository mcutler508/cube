import { describe, expect, it } from 'vitest';
import { angleToMove, quarterAngleForMove, snapAngle } from '../dragController';
import type { Move } from '../../types/cube';

const R: Move = { face: 'R', turns: 1 };
const RPRIME: Move = { face: 'R', turns: -1 };
const L: Move = { face: 'L', turns: 1 };
const LPRIME: Move = { face: 'L', turns: -1 };

describe('snapAngle', () => {
  const q = Math.PI / 2;

  it('rounds to the nearest quarter turn', () => {
    expect(snapAngle(0)).toBe(0);
    expect(snapAngle(q * 0.4)).toBe(0);
    expect(snapAngle(q * 0.6)).toBeCloseTo(q);
    expect(snapAngle(-q * 0.6)).toBeCloseTo(-q);
    expect(snapAngle(q * 1.4)).toBeCloseTo(q);
    expect(snapAngle(q * 1.6)).toBeCloseTo(2 * q);
  });

  it('clamps to +/- half turn', () => {
    expect(snapAngle(q * 3)).toBeCloseTo(q * 2);
    expect(snapAngle(-q * 3)).toBeCloseTo(-q * 2);
  });
});

describe('angleToMove', () => {
  it('returns null for zero snap', () => {
    expect(angleToMove(R, quarterAngleForMove(R), 0)).toBeNull();
  });

  it('commits the primary move when snap matches its rotation sign', () => {
    const q = quarterAngleForMove(R); // -pi/2 for R (baseTurns[R]=-1, turns=1)
    expect(angleToMove(R, q, q)).toEqual(R);
  });

  it('commits the inverse move when snap is opposite', () => {
    const q = quarterAngleForMove(R);
    expect(angleToMove(R, q, -q)).toEqual(RPRIME);
  });

  it('collapses half turns to {face, turns: 2} regardless of sign', () => {
    const q = quarterAngleForMove(R);
    expect(angleToMove(R, q, Math.PI)).toEqual({ face: 'R', turns: 2 });
    expect(angleToMove(R, q, -Math.PI)).toEqual({ face: 'R', turns: 2 });
  });

  it('handles L (opposite baseTurns sign) correctly', () => {
    // baseTurns[L] = +1, so quarterAngleForMove(L) = +pi/2. Positive angle
    // snap should commit L; negative should commit L'.
    const q = quarterAngleForMove(L);
    expect(q).toBeCloseTo(Math.PI / 2);
    expect(angleToMove(L, q, Math.PI / 2)).toEqual(L);
    expect(angleToMove(L, q, -Math.PI / 2)).toEqual(LPRIME);
  });
});

describe('quarterAngleForMove', () => {
  it('produces signed quarter turns per FACE_DEFS.baseTurns', () => {
    // R: baseTurns=-1, turns=1 -> -pi/2
    expect(quarterAngleForMove({ face: 'R', turns: 1 })).toBeCloseTo(-Math.PI / 2);
    // R': baseTurns=-1, turns=-1 -> +pi/2
    expect(quarterAngleForMove({ face: 'R', turns: -1 })).toBeCloseTo(Math.PI / 2);
    // L: baseTurns=+1, turns=1 -> +pi/2
    expect(quarterAngleForMove({ face: 'L', turns: 1 })).toBeCloseTo(Math.PI / 2);
    // U: baseTurns=-1, turns=1 -> -pi/2
    expect(quarterAngleForMove({ face: 'U', turns: 1 })).toBeCloseTo(-Math.PI / 2);
    // D: baseTurns=+1, turns=1 -> +pi/2
    expect(quarterAngleForMove({ face: 'D', turns: 1 })).toBeCloseTo(Math.PI / 2);
  });
});
