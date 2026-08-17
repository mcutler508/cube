import type { CubeState } from '../../types/cube';
import { computeNet } from '../../cube/net';
import { isSolved } from '../../cube/solved';
import { evaluateProgress } from '../progress';
import {
  isCrossOn,
  isFaceOn,
  isLayerOn,
  isRowOn,
} from '../detections';
import type { Objective } from './types';

export function evaluateObjective(state: CubeState, objective: Objective): boolean {
  switch (objective.type) {
    case 'full_solve':
      return isSolved(state);

    case 'complete_face':
      return isFaceOn(computeNet(state), objective.face);

    case 'complete_any_face': {
      const net = computeNet(state);
      return (['U', 'D', 'L', 'R', 'F', 'B'] as const).some((f) => isFaceOn(net, f));
    }

    case 'complete_row':
      return isRowOn(computeNet(state), objective.face, objective.row);

    case 'complete_cross':
      return isCrossOn(computeNet(state), objective.face);

    case 'complete_layer':
      return isLayerOn(computeNet(state), objective.face);

    case 'progress_threshold':
      return evaluateProgress(state).percentage >= objective.threshold;
  }
}
