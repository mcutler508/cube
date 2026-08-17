import { describe, expect, it } from 'vitest';
import { applyMoves, createSolvedCube } from '../../cube/cubeState';
import { parseSequence } from '../../cube/notation';
import { firstUnmetMilestone, milestoneStatuses } from '../milestones';

describe('milestones', () => {
  it('solved cube reports all milestones done', () => {
    const statuses = milestoneStatuses(createSolvedCube());
    expect(statuses.every((s) => s.done)).toBe(true);
    expect(firstUnmetMilestone(createSolvedCube())).toBeNull();
  });

  it('a single R turn breaks the white cross first', () => {
    const state = applyMoves(createSolvedCube(), parseSequence('R'));
    const next = firstUnmetMilestone(state);
    expect(next?.key).toBe('whiteCross');
  });

  it('progression is sequential — 1st layer implies white cross is done', () => {
    const statuses = milestoneStatuses(createSolvedCube());
    for (let i = 1; i < statuses.length; i++) {
      if (statuses[i].done) expect(statuses[i - 1].done).toBe(true);
    }
  });
});
