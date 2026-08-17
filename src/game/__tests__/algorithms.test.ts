import { describe, expect, it } from 'vitest';
import { parseSequence } from '../../cube/notation';
import { detectAlgorithm } from '../algorithms';

const moves = (s: string) => parseSequence(s);

describe('detectAlgorithm', () => {
  it('returns null when the tail matches no algorithm', () => {
    expect(detectAlgorithm(moves('R U F'))).toBeNull();
  });

  it('detects a single Sexy Move', () => {
    const m = detectAlgorithm(moves("R U R' U'"));
    expect(m?.algorithm.id).toBe('sexy');
    expect(m?.chain).toBe(1);
  });

  it('detects chained Sexy Moves', () => {
    const m = detectAlgorithm(moves("R U R' U' R U R' U'"));
    expect(m?.algorithm.id).toBe('sexy');
    expect(m?.chain).toBe(2);
  });

  it('detects triple Sexy', () => {
    const m = detectAlgorithm(moves("R U R' U' R U R' U' R U R' U'"));
    expect(m?.chain).toBe(3);
  });

  it('chain resets when a different algorithm is inserted', () => {
    // Sexy, then Sledgehammer, then Sexy — final match is Sexy chain=1.
    const m = detectAlgorithm(moves("R U R' U' R' F R F' R U R' U'"));
    expect(m?.algorithm.id).toBe('sexy');
    expect(m?.chain).toBe(1);
  });

  it('detects a Sune', () => {
    const m = detectAlgorithm(moves("R U R' U R U2 R'"));
    expect(m?.algorithm.id).toBe('sune');
  });

  it('detects a Sledgehammer', () => {
    const m = detectAlgorithm(moves("R' F R F'"));
    expect(m?.algorithm.id).toBe('sledgehammer');
  });

  it('does not fire mid-algorithm', () => {
    // Only 3 of 4 sexy moves so far.
    expect(detectAlgorithm(moves("R U R'"))).toBeNull();
  });

  it('handles empty history', () => {
    expect(detectAlgorithm([])).toBeNull();
  });
});
