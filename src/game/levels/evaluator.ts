import type { CubeState } from '../../types/cube';
import { computeNet } from '../../cube/net';
import { isSolved, isSolved2x2 } from '../../cube/solved';
import { evaluateProgress } from '../progress';
import {
  isCrossOn,
  isFaceOn,
  isLayerOn,
  isRowOn,
} from '../detections';
import type { CubeSize, Objective } from './types';

export function evaluateObjective(
  state: CubeState,
  objective: Objective,
  cubeSize: CubeSize = '3x3',
): boolean {
  switch (objective.type) {
    case 'full_solve':
      // On a 2x2, only the 8 visible corners count as "the cube" — the
      // engine's edges + centers still track state but are invisible and
      // untouchable, so the standard 26-cubie isSolved() would never fire.
      return cubeSize === '2x2' ? isSolved2x2(state) : isSolved(state);

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

    case 'drill_complete':
      // Drill completion is tracked in gameStore.drillState, not in cube
      // state. The store flips objectiveCompleted=true when the drill
      // finishes; the evaluator itself returns false so this objective is
      // never "just from the cube state alone."
      return false;
  }
}
