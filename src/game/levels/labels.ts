import type { FaceLetter } from '../../cube/net';
import type { Objective } from './types';

const FACE_COLOR_NAME: Record<FaceLetter, string> = {
  U: 'WHITE',
  D: 'YELLOW',
  L: 'ORANGE',
  R: 'RED',
  F: 'GREEN',
  B: 'BLUE',
};

const FACE_LAYER_NAME: Record<FaceLetter, string> = {
  U: 'TOP',
  D: 'BOTTOM',
  L: 'LEFT',
  R: 'RIGHT',
  F: 'FRONT',
  B: 'BACK',
};

const ROW_NAME: Record<0 | 1 | 2, string> = {
  0: 'TOP',
  1: 'MIDDLE',
  2: 'BOTTOM',
};

export function describeObjective(objective: Objective): string {
  switch (objective.type) {
    case 'complete_face':
      return `COMPLETE THE ${FACE_COLOR_NAME[objective.face]} FACE`;
    case 'complete_any_face':
      return 'COMPLETE ANY FACE';
    case 'complete_row':
      return `COMPLETE THE ${ROW_NAME[objective.row]} ${FACE_COLOR_NAME[objective.face]} ROW`;
    case 'complete_cross':
      return `BUILD THE ${FACE_COLOR_NAME[objective.face]} CROSS`;
    case 'complete_layer':
      return `COMPLETE THE ${FACE_LAYER_NAME[objective.face]} LAYER`;
    case 'progress_threshold':
      return `REACH ${objective.threshold}% PROGRESS`;
    case 'full_solve':
      return 'SOLVE THE CUBE';
  }
}
