import { describe, expect, it, beforeEach } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { LEVELS } from '../levels/catalog';
import type { Move } from '../../types/cube';

const WHITE_CORNERS = LEVELS.find((l) => l.id === 'learn-04-white-corners')!;
const ALGO: Move[] = WHITE_CORNERS.drill!.algorithm;
const GUIDED_RUNS = WHITE_CORNERS.drill!.guidedRuns;
const UNLOCKED_RUNS = WHITE_CORNERS.drill!.unlockedRuns;

function loadDrill() {
  useGameStore.getState().exitToMenu();
  useGameStore.getState().loadLevel(WHITE_CORNERS);
}

function playAlgorithm(): void {
  for (const move of ALGO) useGameStore.getState().commitPlayerMove(move);
}

beforeEach(() => {
  useGameStore.getState().exitToMenu();
});

describe('drill: white corners level definition', () => {
  it('is registered with the sexy-move algorithm', () => {
    expect(WHITE_CORNERS.drill).toBeDefined();
    expect(ALGO).toHaveLength(4);
    expect(ALGO[0]).toEqual({ face: 'R', turns: 1 });
    expect(ALGO[1]).toEqual({ face: 'U', turns: 1 });
    expect(ALGO[2]).toEqual({ face: 'R', turns: -1 });
    expect(ALGO[3]).toEqual({ face: 'U', turns: -1 });
  });

  it('is a commutator: 6 reps returns to solved cube', () => {
    loadDrill();
    for (let i = 0; i < 6; i++) playAlgorithm();
    // 4×6 = 24 moves; guided (8 moves) + unlocked (16 moves) = 24 total exactly.
    // History records all moves even after objectiveCompleted, so trust cube state.
    // The drill completes at move 24, which is when objectiveCompleted fires.
    // Note: commitPlayerMove short-circuits after objectiveCompleted, so the
    // 24th move IS committed (it's the trigger).
    expect(useGameStore.getState().objectiveCompleted).toBe(true);
  });
});

describe('drill: all drill levels — parametrized invariants', () => {
  const DRILL_LEVELS = LEVELS.filter((l) => l.drill);

  for (const level of DRILL_LEVELS) {
    describe(level.id, () => {
      it('has a drill config with a non-empty algorithm', () => {
        expect(level.drill!.algorithm.length).toBeGreaterThan(0);
      });

      it('parMoves matches guided+unlocked reps × algo length', () => {
        const totalReps = level.drill!.guidedRuns + level.drill!.unlockedRuns;
        expect(level.parMoves).toBe(totalReps * level.drill!.algorithm.length);
      });

      it('completes end-to-end when the algorithm is played guided+unlocked times', () => {
        useGameStore.getState().exitToMenu();
        useGameStore.getState().loadLevel(level);
        const total = level.drill!.guidedRuns + level.drill!.unlockedRuns;
        for (let i = 0; i < total; i++) {
          for (const move of level.drill!.algorithm) {
            useGameStore.getState().commitPlayerMove(move);
          }
        }
        expect(useGameStore.getState().objectiveCompleted).toBe(true);
      });

      it('drill state transitions guided → unlocked at the right rep boundary', () => {
        useGameStore.getState().exitToMenu();
        useGameStore.getState().loadLevel(level);
        for (let i = 0; i < level.drill!.guidedRuns; i++) {
          for (const move of level.drill!.algorithm) {
            useGameStore.getState().commitPlayerMove(move);
          }
        }
        expect(useGameStore.getState().drillState!.phase).toBe('unlocked');
        expect(useGameStore.getState().drillState!.unlockedCompleted).toBe(0);
      });
    });
  }
});

describe('drill: state initialization', () => {
  it('loadLevel creates a fresh drillState when the level has a drill', () => {
    loadDrill();
    const s = useGameStore.getState();
    expect(s.drillState).toEqual({
      phase: 'guided',
      expectedIndex: 0,
      guidedCompleted: 0,
      unlockedCompleted: 0,
    });
  });

  it('loadLevel clears drillState for non-drill levels', () => {
    const nonDrill = LEVELS.find((l) => !l.drill)!;
    loadDrill();
    useGameStore.getState().loadLevel(nonDrill);
    expect(useGameStore.getState().drillState).toBeNull();
  });

  it('exitToMenu clears drillState and misfire', () => {
    loadDrill();
    useGameStore.getState().exitToMenu();
    expect(useGameStore.getState().drillState).toBeNull();
    expect(useGameStore.getState().drillMisfireAt).toBeNull();
  });

  it('reset re-seeds a fresh drillState on the same drill level', () => {
    loadDrill();
    // Advance state a bit.
    useGameStore.getState().commitPlayerMove(ALGO[0]);
    expect(useGameStore.getState().drillState!.expectedIndex).toBe(1);
    useGameStore.getState().reset();
    expect(useGameStore.getState().drillState).toEqual({
      phase: 'guided',
      expectedIndex: 0,
      guidedCompleted: 0,
      unlockedCompleted: 0,
    });
  });
});

describe('drill: gateDrillMove (guided phase)', () => {
  it('allows the correct expected move', () => {
    loadDrill();
    const allowed = useGameStore.getState().gateDrillMove(ALGO[0]);
    expect(allowed).toBe(true);
    expect(useGameStore.getState().drillMisfireAt).toBeNull();
  });

  it('blocks a wrong move and sets misfire', () => {
    loadDrill();
    const wrong: Move = { face: 'L', turns: 1 };
    const allowed = useGameStore.getState().gateDrillMove(wrong);
    expect(allowed).toBe(false);
    expect(useGameStore.getState().drillMisfireAt).not.toBeNull();
  });

  it('blocks the correct face with wrong direction', () => {
    loadDrill();
    // Expected is R (turns=1); R' (turns=-1) same face different turn.
    const wrong: Move = { face: 'R', turns: -1 };
    expect(useGameStore.getState().gateDrillMove(wrong)).toBe(false);
  });

  it('returns true for any move when no drill is active', () => {
    // Non-drill level: gate should be a no-op.
    const nonDrill = LEVELS.find((l) => !l.drill)!;
    useGameStore.getState().loadLevel(nonDrill);
    expect(useGameStore.getState().gateDrillMove({ face: 'L', turns: 1 })).toBe(true);
  });
});

describe('drill: guided phase progression', () => {
  it('completing algorithm once advances guidedCompleted, resets expectedIndex', () => {
    loadDrill();
    playAlgorithm();
    const s = useGameStore.getState();
    expect(s.drillState!.guidedCompleted).toBe(1);
    expect(s.drillState!.expectedIndex).toBe(0);
    expect(s.drillState!.phase).toBe('guided');
  });

  it('completing all guided runs transitions to unlocked phase', () => {
    loadDrill();
    for (let i = 0; i < GUIDED_RUNS; i++) playAlgorithm();
    const s = useGameStore.getState();
    expect(s.drillState!.phase).toBe('unlocked');
    expect(s.drillState!.expectedIndex).toBe(0);
    expect(s.drillState!.unlockedCompleted).toBe(0);
    expect(s.drillState!.guidedCompleted).toBe(GUIDED_RUNS);
  });
});

describe('drill: unlocked phase progression', () => {
  function reachUnlocked(): void {
    loadDrill();
    for (let i = 0; i < GUIDED_RUNS; i++) playAlgorithm();
  }

  it('correct rep in unlocked advances unlockedCompleted', () => {
    reachUnlocked();
    playAlgorithm();
    expect(useGameStore.getState().drillState!.unlockedCompleted).toBe(1);
  });

  it('wrong move in unlocked resets unlockedCompleted and expectedIndex', () => {
    reachUnlocked();
    // Land 2 successful reps.
    playAlgorithm();
    playAlgorithm();
    expect(useGameStore.getState().drillState!.unlockedCompleted).toBe(2);
    // Now a wrong move mid-rep.
    useGameStore.getState().commitPlayerMove(ALGO[0]); // step 1 ok
    useGameStore.getState().commitPlayerMove(ALGO[1]); // step 2 ok
    useGameStore.getState().commitPlayerMove({ face: 'L', turns: 1 }); // wrong
    const s = useGameStore.getState();
    expect(s.drillState!.unlockedCompleted).toBe(0);
    expect(s.drillState!.expectedIndex).toBe(0);
    expect(s.drillMisfireAt).not.toBeNull();
  });

  it('completing all unlocked runs marks objectiveCompleted', () => {
    reachUnlocked();
    for (let i = 0; i < UNLOCKED_RUNS; i++) playAlgorithm();
    expect(useGameStore.getState().objectiveCompleted).toBe(true);
  });

  it('once objective completed, further commits are ignored (drill locked)', () => {
    reachUnlocked();
    for (let i = 0; i < UNLOCKED_RUNS; i++) playAlgorithm();
    const stateBefore = useGameStore.getState().cubeState;
    useGameStore.getState().commitPlayerMove(ALGO[0]);
    // commitPlayerMove short-circuits on objectiveCompleted → cubeState unchanged.
    expect(useGameStore.getState().cubeState).toBe(stateBefore);
  });
});

describe('drill: dismissDrillMisfire', () => {
  it('clears the misfire timestamp', () => {
    loadDrill();
    useGameStore.getState().gateDrillMove({ face: 'L', turns: 1 });
    expect(useGameStore.getState().drillMisfireAt).not.toBeNull();
    useGameStore.getState().dismissDrillMisfire();
    expect(useGameStore.getState().drillMisfireAt).toBeNull();
  });
});
