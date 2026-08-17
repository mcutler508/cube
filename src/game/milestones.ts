import type { CubeState } from '../types/cube';
import { computeNet } from '../cube/net';
import { isSolved } from '../cube/solved';
import {
  isCrossOn,
  isLayerOn,
  isMiddleLayerOn,
} from './detections';

/**
 * The ordered layer-by-layer beginner solve arc. Whoever tapped "Hint" wants
 * to know the NEXT structural goal — pick the first entry in this list whose
 * check returns false. Progression is intentionally sequential so beginners
 * always have one clear thing to work on.
 */

export type MilestoneKey =
  | 'whiteCross'
  | 'firstLayer'
  | 'middleLayer'
  | 'yellowCross'
  | 'solved';

export interface Milestone {
  key: MilestoneKey;
  label: string;
  check: (state: CubeState) => boolean;
}

export const MILESTONES: Milestone[] = [
  {
    key: 'whiteCross',
    label: 'White Cross',
    check: (s) => isCrossOn(computeNet(s), 'U'),
  },
  {
    key: 'firstLayer',
    label: '1st Layer',
    check: (s) => isLayerOn(computeNet(s), 'U'),
  },
  {
    key: 'middleLayer',
    label: '2nd Layer',
    check: (s) => isMiddleLayerOn(computeNet(s)),
  },
  {
    key: 'yellowCross',
    label: 'Yellow Cross',
    check: (s) => isCrossOn(computeNet(s), 'D'),
  },
  {
    key: 'solved',
    label: 'Solved',
    check: (s) => isSolved(s),
  },
];

export interface MilestoneStatus {
  key: MilestoneKey;
  label: string;
  done: boolean;
}

export function milestoneStatuses(state: CubeState): MilestoneStatus[] {
  return MILESTONES.map((m) => ({ key: m.key, label: m.label, done: m.check(state) }));
}

export function firstUnmetMilestone(state: CubeState): MilestoneStatus | null {
  for (const m of MILESTONES) {
    if (!m.check(state)) return { key: m.key, label: m.label, done: false };
  }
  return null;
}
