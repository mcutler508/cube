import { describe, expect, it } from 'vitest';
import { applyMoves, createSolvedCube } from '../../cube/cubeState';
import { parseSequence } from '../../cube/notation';
import { detectAll, rowKey } from '../detections';

const solved = () => createSolvedCube();
const after = (seq: string) => applyMoves(createSolvedCube(), parseSequence(seq));

describe('detectAll', () => {
  it('reports every accomplishment on a solved cube', () => {
    const snap = detectAll(solved());
    expect(snap.faces).toHaveLength(6);
    // 6 faces × 3 rows each
    expect(snap.rows).toHaveLength(18);
    expect(snap.crosses).toHaveLength(6);
    expect(snap.layers).toHaveLength(6);
  });

  it('a single U turn keeps U face uniform but breaks the U cross and layer', () => {
    // U rotates the U layer as a unit — the face itself stays uniform white,
    // but the side stickers of the four adjacent faces get cycled, so neither
    // the strict cross nor the full layer holds any more.
    const snap = detectAll(after('U'));
    expect(snap.faces).toContain('U');
    expect(snap.crosses).not.toContain('U');
    expect(snap.layers).not.toContain('U');
  });

  it('a single R turn breaks U face, U cross, and U layer', () => {
    const snap = detectAll(after('R'));
    expect(snap.faces).not.toContain('U');
    expect(snap.crosses).not.toContain('U');
    expect(snap.layers).not.toContain('U');
    // D-side face is likewise broken.
    expect(snap.faces).not.toContain('D');
  });

  it('detects individual rows independently of face completion', () => {
    // R turn leaves F's left column and middle column intact; F row 0 loses
    // its rightmost cell (which becomes white from the U face).
    const snap = detectAll(after('R'));
    const keys = new Set(snap.rows.map((r) => rowKey(r.face, r.row)));
    // The full F face is not uniform after R, so no F rows should be
    // "uniform in green" — R rotates 3 F-column cells away.
    expect(keys.has('F0')).toBe(false);
  });

  it('layers imply faces and crosses on the same face', () => {
    const snap = detectAll(solved());
    for (const face of snap.layers) {
      expect(snap.faces).toContain(face);
      expect(snap.crosses).toContain(face);
    }
  });

  it('rowKey is stable and unique per (face,row)', () => {
    expect(rowKey('U', 0)).toBe('U0');
    expect(rowKey('U', 1)).toBe('U1');
    expect(rowKey('R', 2)).toBe('R2');
    expect(new Set([rowKey('U', 0), rowKey('U', 1), rowKey('U', 2)]).size).toBe(3);
  });
});
