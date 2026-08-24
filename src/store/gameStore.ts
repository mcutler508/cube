import { create } from 'zustand';
import type { CubeState, Move } from '../types/cube';
import type { Difficulty, GameEvent } from '../types/game';
import type { FaceLetter } from '../cube/net';
import { applyMove, createSolvedCube } from '../cube/cubeState';
import { isSolved as detectSolved } from '../cube/solved';
import { invertMove } from '../cube/notation';
import { evaluateProgress } from '../game/progress';
import { updateStreak } from '../game/streak';
import { gameEvents } from '../game/events';
import { evaluateObjective } from '../game/levels/evaluator';
import type { Level } from '../game/levels/types';
import { detectAll, rowKey, type RowRef } from '../game/detections';
import { hintAlgorithmFor, hintForLevel } from '../game/solver';
import { detectAlgorithm } from '../game/algorithms';
import { firstUnmetMilestone } from '../game/milestones';
import { loadSettings, saveSettings, type Settings } from '../game/persistence';
import type { DrillConfig } from '../game/levels/types';

export type GamePhase = 'ready' | 'playing' | 'solved';

const NEAR_SOLVED_THRESHOLD = 90;

/**
 * Progressive hint tier — 0 means no hint requested; 1..4 are escalating
 * levels of guidance:
 *   1 = name the current milestone target ("build the white cross")
 *   2 = add: name the algorithm that helps ("try Sledgehammer")
 *   3 = add: pulse the algorithm's palette button
 *   4 = add: auto-preview the algorithm on the 2D net
 */
export type HintTier = 0 | 1 | 2 | 3 | 4;

interface GameStore {
  // --- cube ---
  cubeState: CubeState;
  history: Move[]; // player moves only; scramble moves are excluded
  moveCount: number;

  // --- session ---
  phase: GamePhase;
  startedAt: number | null;
  endedAt: number | null;
  isScrambling: boolean;
  difficulty: Difficulty;

  // --- progress + presentation state ---
  progress: number; // 0–100
  progressDelta: number;
  solvedFaces: FaceLetter[];
  /** Encoded as `${face}${row}` — see rowKey() in detections.ts. */
  solvedRows: string[];
  solvedCrosses: FaceLetter[];
  solvedLayers: FaceLetter[];
  streak: number;
  bestStreak: number;
  isNearSolved: boolean;

  // --- progressive hints ---
  hintTier: HintTier;
  /** Human-readable name of the current unmet milestone (e.g. "White Cross"). */
  hintTargetMilestone: string | null;
  /** id of the recommended algorithm, or null when no path-based match exists. */
  hintTargetAlgorithm: string | null;
  /**
   * Concrete next move (from Kociemba full-solve, or the canonical level path
   * when the player is on it). Cleared after the next player move so a stale
   * suggestion never lingers; tap Hint again for a fresh one.
   */
  hintNextMove: Move | null;
  /** Session-scoped counter of hint requests; instrumentation for a future paywall. */
  hintCount: number;

  // --- level / objective ---
  currentLevel: Level | null;
  objectiveCompleted: boolean;

  // --- drill (algorithm practice) ---
  /**
   * Present only when the current level is a drill. Tracks position within
   * the algorithm and phase completion. See DrillConfig in game/levels/types.
   */
  drillState: DrillState | null;
  /**
   * Timestamp of the most recent wrong-move rejection (guided phase block
   * or unlocked phase counter-reset). HUD reads this to trigger a shake +
   * toast, then clears via dismissDrillMisfire.
   */
  drillMisfireAt: number | null;

  // --- menu routing ---
  /** Which landing screen to show when no level is active. */
  menuView: 'daily' | 'learn' | 'algos';

  /**
   * True while the player is inside the forced first-run tutorial (learn-01
   * then learn-02). Set by loadTutorialLevel(); cleared by any non-tutorial
   * loadLevel() or by exitToMenu(). HUD reads this to swap the results-panel
   * button set and hide the pause-menu "Return to menu" affordance so the
   * two levels are genuinely enforced. See src/game/tutorial.ts.
   */
  isTutorialRun: boolean;

  // --- user settings ---
  settings: Settings;
  /** True while the settings panel is open (in-level overlay). */
  isSettingsOpen: boolean;

  // --- pause menu ---
  /**
   * True while the top-left pause menu is open. Freezes the run timer (see
   * openPauseMenu / closePauseMenu, which shift startedAt on resume).
   */
  isPauseMenuOpen: boolean;
  /** performance.now() when the pause menu opened; null when not paused. */
  pausedAt: number | null;

  // --- algorithm preview ---
  /** id of an algorithm currently being previewed (not yet executed). */
  previewAlgorithmId: string | null;

  // --- reducers ---
  commitPlayerMove: (move: Move) => void;
  commitScrambleMove: (move: Move) => void;
  commitUndoMove: (move: Move) => void;
  beginScramble: () => void;
  endScramble: () => void;
  reset: () => void;
  setDifficulty: (d: Difficulty) => void;
  loadLevel: (level: Level) => void;
  exitToMenu: () => void;
  requestHint: () => void;
  dismissHint: () => void;
  setMenuView: (view: 'daily' | 'learn' | 'algos') => void;
  setTutorialRun: (v: boolean) => void;
  setPreviewAlgorithm: (id: string | null) => void;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  openSettings: () => void;
  closeSettings: () => void;
  openPauseMenu: () => void;
  closePauseMenu: () => void;

  // --- drill actions ---
  /**
   * Called before a player move enters the queue. When a drill is active and
   * we're in guided phase, wrong moves are blocked (returns false, sets
   * misfire). In unlocked phase and outside drills, always returns true.
   */
  gateDrillMove: (move: Move) => boolean;
  dismissDrillMisfire: () => void;
}

export interface DrillState {
  phase: 'guided' | 'unlocked';
  /** Position within the algorithm sequence (0..algorithm.length-1). */
  expectedIndex: number;
  /** Completed algorithm reps in the guided phase. */
  guidedCompleted: number;
  /** Consecutive completed reps in the unlocked phase. Any wrong move resets to 0. */
  unlockedCompleted: number;
}

const initialProgress = evaluateProgress(createSolvedCube());
const initialDetections = detectAll(createSolvedCube());

export const useGameStore = create<GameStore>((set, get) => ({
  cubeState: createSolvedCube(),
  history: [],
  moveCount: 0,
  phase: 'ready',
  startedAt: null,
  endedAt: null,
  isScrambling: false,
  difficulty: 'normal',
  progress: initialProgress.percentage,
  progressDelta: 0,
  solvedFaces: initialProgress.solvedFaces,
  solvedRows: initialDetections.rows.map((r) => rowKey(r.face, r.row)),
  solvedCrosses: initialDetections.crosses,
  solvedLayers: initialDetections.layers,
  streak: 0,
  bestStreak: 0,
  isNearSolved: false,
  hintTier: 0,
  hintTargetMilestone: null,
  hintTargetAlgorithm: null,
  hintNextMove: null,
  hintCount: 0,
  currentLevel: null,
  objectiveCompleted: false,
  drillState: null,
  drillMisfireAt: null,
  menuView: 'daily',
  isTutorialRun: false,
  previewAlgorithmId: null,
  settings: loadSettings(),
  isSettingsOpen: false,
  isPauseMenuOpen: false,
  pausedAt: null,

  commitPlayerMove: (move) => {
    const s = get();
    if (s.phase === 'solved' || s.objectiveCompleted) return;
    const next = applyMove(s.cubeState, move);
    const newProgress = evaluateProgress(next);
    const solved = detectSolved(next);
    const now = performance.now();
    const startedAt = s.startedAt ?? now;

    const delta = newProgress.percentage - s.progress;
    const newStreak = updateStreak(s.streak, delta);
    const bestStreak = Math.max(s.bestStreak, newStreak);
    const wasNear = s.isNearSolved;
    const isNear = !solved && newProgress.percentage >= NEAR_SOLVED_THRESHOLD;

    const before = new Set(s.solvedFaces);
    const after = new Set(newProgress.solvedFaces);
    const newlyCompleted: FaceLetter[] = [];
    const newlyBroken: FaceLetter[] = [];
    for (const f of newProgress.solvedFaces) if (!before.has(f)) newlyCompleted.push(f);
    for (const f of s.solvedFaces) if (!after.has(f)) newlyBroken.push(f);

    // Full accomplishment snapshot (rows / crosses / layers).
    const detections = detectAll(next);
    const nextRowKeys = detections.rows.map((r) => rowKey(r.face, r.row));
    const rowDiff = diffLists(s.solvedRows, nextRowKeys);
    const crossDiff = diffLists(s.solvedCrosses, detections.crosses);
    const layerDiff = diffLists(s.solvedLayers, detections.layers);

    // Drill-progression check (runs BEFORE the objective check so a
    // just-completed drill can flip objectiveHit=true).
    const drillTransition = advanceDrill(s.currentLevel?.drill ?? null, s.drillState, move);
    const nextDrillState = drillTransition?.next ?? s.drillState;
    const drillCompleted = drillTransition?.completed ?? false;

    // Level-objective check.
    let objectiveHit =
      s.currentLevel != null &&
      !s.objectiveCompleted &&
      evaluateObjective(next, s.currentLevel.objective);
    if (drillCompleted && !s.objectiveCompleted) objectiveHit = true;
    const objectiveIsSolve = s.currentLevel?.objective.type === 'full_solve';
    const objectiveFinished = objectiveHit || solved;

    // Recompute hint targets on the new state if a hint is active.
    // Objective completion resets the hint entirely (nothing left to guide).
    let nextHintTier: HintTier = objectiveFinished ? 0 : s.hintTier;
    let nextTargetMilestone: string | null = null;
    let nextTargetAlgorithm: string | null = null;
    let nextPreviewId: string | null = null;
    if (nextHintTier > 0) {
      const milestone = firstUnmetMilestone(next);
      nextTargetMilestone = milestone?.label ?? null;
      if (nextHintTier >= 2 && s.currentLevel) {
        const rec = hintAlgorithmFor(next, s.currentLevel);
        nextTargetAlgorithm = rec?.id ?? null;
      }
      if (nextHintTier === 4) {
        nextPreviewId = nextTargetAlgorithm;
      }
    }

    // Unlocked-phase wrong move → set misfire so the HUD shakes.
    const drillMisfire =
      drillTransition?.wrongInUnlocked
        ? now
        : s.drillMisfireAt;

    set({
      cubeState: next,
      history: [...s.history, move],
      moveCount: s.moveCount + 1,
      startedAt,
      endedAt: solved ? now : null,
      phase: solved ? 'solved' : 'playing',
      progress: newProgress.percentage,
      progressDelta: delta,
      solvedFaces: newProgress.solvedFaces,
      solvedRows: nextRowKeys,
      solvedCrosses: detections.crosses,
      solvedLayers: detections.layers,
      streak: solved ? 0 : newStreak,
      bestStreak,
      isNearSolved: isNear,
      objectiveCompleted: objectiveHit ? true : s.objectiveCompleted,
      drillState: nextDrillState,
      drillMisfireAt: drillMisfire,
      hintTier: nextHintTier,
      hintTargetMilestone: nextTargetMilestone,
      hintTargetAlgorithm: nextTargetAlgorithm,
      // Any player move invalidates the concrete next-move hint (it was
      // computed against the previous state). Player taps Hint again to
      // refresh — avoids spending 100ms of blocking solve on every turn.
      hintNextMove: null,
      previewAlgorithmId: nextPreviewId,
    });

    // Events after state so subscribers see fresh values.
    emit({ type: 'moveCompleted', move, progress: newProgress.percentage });
    if (delta > 0) {
      emit({ type: 'progressIncreased', amount: delta, progress: newProgress.percentage });
    } else if (delta < 0) {
      emit({
        type: 'progressDecreased',
        amount: -delta,
        progress: newProgress.percentage,
      });
    }
    for (const f of newlyCompleted) emit({ type: 'faceCompleted', face: f });
    for (const f of newlyBroken) emit({ type: 'faceBroken', face: f });
    for (const key of rowDiff.added) {
      const parsed = parseRowKey(key);
      if (parsed) emit({ type: 'rowCompleted', face: parsed.face, row: parsed.row });
    }
    for (const key of rowDiff.removed) {
      const parsed = parseRowKey(key);
      if (parsed) emit({ type: 'rowBroken', face: parsed.face, row: parsed.row });
    }
    for (const f of crossDiff.added) emit({ type: 'crossCompleted', face: f });
    for (const f of crossDiff.removed) emit({ type: 'crossBroken', face: f });
    for (const f of layerDiff.added) emit({ type: 'layerCompleted', face: f });
    for (const f of layerDiff.removed) emit({ type: 'layerBroken', face: f });
    if (newStreak > s.streak) emit({ type: 'streakIncreased', streak: newStreak });
    if (newStreak === 0 && s.streak >= 2) {
      emit({ type: 'streakBroken', previousStreak: s.streak });
    }
    if (isNear && !wasNear) emit({ type: 'nearSolved', progress: newProgress.percentage });
    if (solved) {
      emit({
        type: 'cubeSolved',
        timeMs: now - startedAt,
        moves: s.moveCount + 1,
        difficulty: s.difficulty,
        bestStreak,
      });
    }
    if (objectiveHit && !objectiveIsSolve && s.currentLevel) {
      emit({
        type: 'objectiveCompleted',
        levelId: s.currentLevel.id,
        moves: s.moveCount + 1,
        timeMs: now - startedAt,
      });
    }

    // Algorithm recognition against the fresh history.
    const newHistory = [...s.history, move];
    const algo = detectAlgorithm(newHistory);
    if (algo) {
      emit({
        type: 'algorithmPerformed',
        algorithmId: algo.algorithm.id,
        algorithmName: algo.algorithm.name,
        chain: algo.chain,
      });
    }
  },

  commitScrambleMove: (move) => {
    const s = get();
    const next = applyMove(s.cubeState, move);
    const p = evaluateProgress(next);
    const d = detectAll(next);
    set({
      cubeState: next,
      progress: p.percentage,
      solvedFaces: p.solvedFaces,
      solvedRows: d.rows.map((r) => rowKey(r.face, r.row)),
      solvedCrosses: d.crosses,
      solvedLayers: d.layers,
      isNearSolved: false,
    });
  },

  commitUndoMove: (move) => {
    const s = get();
    const next = applyMove(s.cubeState, move);
    const solved = detectSolved(next);
    const p = evaluateProgress(next);
    const d = detectAll(next);
    set({
      cubeState: next,
      progress: p.percentage,
      solvedFaces: p.solvedFaces,
      solvedRows: d.rows.map((r) => rowKey(r.face, r.row)),
      solvedCrosses: d.crosses,
      solvedLayers: d.layers,
      isNearSolved: !solved && p.percentage >= NEAR_SOLVED_THRESHOLD,
      phase: solved && s.phase === 'playing' ? 'ready' : s.phase,
      // Undo doesn't advance the hint tier, but it should refresh targets so
      // the milestone / algorithm reflect the new state. Keep the tier.
      previewAlgorithmId: null,
    });
    // If a hint was active, request a refresh with the same tier.
    if (s.hintTier > 0) refreshHintTargets();
  },

  beginScramble: () => {
    set({
      isScrambling: true,
      history: [],
      moveCount: 0,
      startedAt: null,
      endedAt: null,
      phase: 'ready',
      streak: 0,
      bestStreak: 0,
      progressDelta: 0,
      isNearSolved: false,
    });
  },

  endScramble: () => {
    const s = get();
    set({
      isScrambling: false,
      phase: 'ready',
      progressDelta: 0,
      isNearSolved: false,
      progress: s.progress,
    });
  },

  reset: () => {
    const fresh = evaluateProgress(createSolvedCube());
    const freshDetections = detectAll(createSolvedCube());
    const level = get().currentLevel;
    set({
      cubeState: createSolvedCube(),
      history: [],
      moveCount: 0,
      phase: 'ready',
      startedAt: null,
      endedAt: null,
      isScrambling: false,
      progress: fresh.percentage,
      progressDelta: 0,
      solvedFaces: fresh.solvedFaces,
      solvedRows: freshDetections.rows.map((r) => rowKey(r.face, r.row)),
      solvedCrosses: freshDetections.crosses,
      solvedLayers: freshDetections.layers,
      streak: 0,
      bestStreak: 0,
      isNearSolved: false,
      objectiveCompleted: false,
      hintTier: 0,
      hintTargetMilestone: null,
      hintTargetAlgorithm: null,
      hintNextMove: null,
      previewAlgorithmId: null,
      drillState: level?.drill ? freshDrillState() : null,
      drillMisfireAt: null,
    });
  },

  setDifficulty: (d) => set({ difficulty: d }),

  loadLevel: (level) => {
    set({
      currentLevel: level,
      objectiveCompleted: false,
      drillState: level.drill ? freshDrillState() : null,
      drillMisfireAt: null,
      hintTier: 0,
      hintTargetMilestone: null,
      hintTargetAlgorithm: null,
      hintNextMove: null,
      hintCount: 0,
      previewAlgorithmId: null,
    });
  },

  requestHint: () => {
    const s = get();
    if (!s.currentLevel) return;
    if (s.phase === 'solved' || s.objectiveCompleted) return;
    // Tier 4 is the top rung; another tap collapses back to 0 (dismiss).
    if (s.hintTier >= 4) {
      set({
        hintTier: 0,
        hintTargetMilestone: null,
        hintTargetAlgorithm: null,
        hintNextMove: null,
        previewAlgorithmId: null,
      });
      return;
    }
    const nextTier = (s.hintTier + 1) as HintTier;
    const state = s.cubeState;
    const milestone = firstUnmetMilestone(state);
    const rec = nextTier >= 2 ? hintAlgorithmFor(state, s.currentLevel) : null;
    // Concrete next-move — from canonical path if we're on it, else Kociemba
    // full-solve. May be null if the level is already complete or the
    // Kociemba pruning tables haven't finished warming.
    const nextMove = hintForLevel(state, s.currentLevel);
    set({
      hintTier: nextTier,
      hintTargetMilestone: milestone?.label ?? null,
      hintTargetAlgorithm: rec?.id ?? null,
      hintNextMove: nextMove,
      previewAlgorithmId: nextTier === 4 ? (rec?.id ?? null) : s.previewAlgorithmId,
      hintCount: s.hintCount + 1,
    });
  },

  dismissHint: () => set({
    hintTier: 0,
    hintTargetMilestone: null,
    hintTargetAlgorithm: null,
    hintNextMove: null,
    previewAlgorithmId: null,
  }),

  setMenuView: (view) => set({ menuView: view }),

  setTutorialRun: (v) => set({ isTutorialRun: v }),

  setPreviewAlgorithm: (id) => set({ previewAlgorithmId: id }),

  setSetting: (key, value) => {
    const next = { ...get().settings, [key]: value };
    saveSettings(next);
    set({ settings: next });
  },

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

  openPauseMenu: () => {
    const s = get();
    if (s.isPauseMenuOpen) return;
    // Only stamp pausedAt when a run is actually in progress (started, not
    // ended). Menu-open on a fresh 'ready' level or a 'solved' cube shouldn't
    // touch the timer.
    const pausedAt =
      s.startedAt !== null && s.endedAt === null ? performance.now() : null;
    set({ isPauseMenuOpen: true, pausedAt });
  },

  closePauseMenu: () => {
    const s = get();
    if (!s.isPauseMenuOpen) return;
    // Shift startedAt forward by the pause duration so the elapsed math in
    // useLiveTimer keeps working unchanged and the visible clock resumes
    // from where it left off.
    if (s.pausedAt !== null && s.startedAt !== null && s.endedAt === null) {
      const pauseDuration = performance.now() - s.pausedAt;
      set({
        isPauseMenuOpen: false,
        pausedAt: null,
        startedAt: s.startedAt + pauseDuration,
      });
    } else {
      set({ isPauseMenuOpen: false, pausedAt: null });
    }
  },

  exitToMenu: () => {
    const fresh = evaluateProgress(createSolvedCube());
    const freshDetections = detectAll(createSolvedCube());
    set({
      cubeState: createSolvedCube(),
      history: [],
      moveCount: 0,
      phase: 'ready',
      startedAt: null,
      endedAt: null,
      isScrambling: false,
      progress: fresh.percentage,
      progressDelta: 0,
      solvedFaces: fresh.solvedFaces,
      solvedRows: freshDetections.rows.map((r) => rowKey(r.face, r.row)),
      solvedCrosses: freshDetections.crosses,
      solvedLayers: freshDetections.layers,
      streak: 0,
      bestStreak: 0,
      isNearSolved: false,
      currentLevel: null,
      objectiveCompleted: false,
      drillState: null,
      drillMisfireAt: null,
      hintTier: 0,
      hintTargetMilestone: null,
      hintTargetAlgorithm: null,
      hintNextMove: null,
      previewAlgorithmId: null,
      isTutorialRun: false,
    });
  },

  gateDrillMove: (move) => {
    const s = get();
    const drill = s.currentLevel?.drill;
    if (!drill || !s.drillState) return true;
    if (s.objectiveCompleted) return false; // drill already cleared, block input
    const expected = drill.algorithm[s.drillState.expectedIndex];
    const matches = expected && expected.face === move.face && expected.turns === move.turns;
    if (s.drillState.phase === 'guided' && !matches) {
      set({ drillMisfireAt: performance.now() });
      return false;
    }
    return true;
  },

  dismissDrillMisfire: () => set({ drillMisfireAt: null }),
}));

function freshDrillState(): DrillState {
  return {
    phase: 'guided',
    expectedIndex: 0,
    guidedCompleted: 0,
    unlockedCompleted: 0,
  };
}

/**
 * Given the current drill config, current drill state, and the just-committed
 * player move, compute the next state and whether the drill just completed.
 * Returns null when there's no drill or no active state to advance.
 */
function advanceDrill(
  drill: DrillConfig | null,
  state: DrillState | null,
  move: Move,
): { next: DrillState; completed: boolean; wrongInUnlocked: boolean } | null {
  if (!drill || !state) return null;
  const expected = drill.algorithm[state.expectedIndex];
  const matches = expected.face === move.face && expected.turns === move.turns;

  if (!matches) {
    // In guided phase, wrong moves are gated out before commit — this branch
    // only fires in unlocked phase, where we reset the counter and rep index.
    if (state.phase === 'unlocked') {
      return {
        next: { ...state, expectedIndex: 0, unlockedCompleted: 0 },
        completed: false,
        wrongInUnlocked: true,
      };
    }
    // Defensive: shouldn't be reachable, but if it happens, no-op.
    return { next: state, completed: false, wrongInUnlocked: false };
  }

  const nextIndex = state.expectedIndex + 1;
  const wrapped = nextIndex >= drill.algorithm.length;
  if (!wrapped) {
    return {
      next: { ...state, expectedIndex: nextIndex },
      completed: false,
      wrongInUnlocked: false,
    };
  }

  // Rep completed.
  if (state.phase === 'guided') {
    const guidedCompleted = state.guidedCompleted + 1;
    if (guidedCompleted >= drill.guidedRuns) {
      return {
        next: {
          phase: 'unlocked',
          expectedIndex: 0,
          guidedCompleted,
          unlockedCompleted: 0,
        },
        completed: false,
        wrongInUnlocked: false,
      };
    }
    return {
      next: { ...state, expectedIndex: 0, guidedCompleted },
      completed: false,
      wrongInUnlocked: false,
    };
  }

  // Unlocked rep completed.
  const unlockedCompleted = state.unlockedCompleted + 1;
  const completed = unlockedCompleted >= drill.unlockedRuns;
  return {
    next: { ...state, expectedIndex: 0, unlockedCompleted },
    completed,
    wrongInUnlocked: false,
  };
}

export function popHistory(): Move | null {
  const s = useGameStore.getState();
  if (s.history.length === 0) return null;
  const last = s.history[s.history.length - 1];
  useGameStore.setState({
    history: s.history.slice(0, -1),
    moveCount: Math.max(0, s.moveCount - 1),
  });
  return invertMove(last);
}

function emit(event: GameEvent) {
  gameEvents.emit(event);
}

/** Set-diff two arrays of primitives. */
function diffLists<T>(prev: readonly T[], next: readonly T[]): { added: T[]; removed: T[] } {
  const prevSet = new Set(prev);
  const nextSet = new Set(next);
  const added: T[] = [];
  const removed: T[] = [];
  for (const v of next) if (!prevSet.has(v)) added.push(v);
  for (const v of prev) if (!nextSet.has(v)) removed.push(v);
  return { added, removed };
}

function parseRowKey(key: string): RowRef | null {
  if (key.length !== 2) return null;
  const face = key[0] as FaceLetter;
  const row = Number(key[1]);
  if (row !== 0 && row !== 1 && row !== 2) return null;
  return { face, row: row as 0 | 1 | 2 };
}

/**
 * Recompute the hint's milestone + algorithm targets against the current
 * state without changing the tier. Used after undo so the visible guidance
 * matches the cube the player is now looking at.
 */
function refreshHintTargets(): void {
  const s = useGameStore.getState();
  if (s.hintTier === 0 || !s.currentLevel) return;
  const milestone = firstUnmetMilestone(s.cubeState);
  const rec = s.hintTier >= 2 ? hintAlgorithmFor(s.cubeState, s.currentLevel) : null;
  const nextMove = hintForLevel(s.cubeState, s.currentLevel);
  useGameStore.setState({
    hintTargetMilestone: milestone?.label ?? null,
    hintTargetAlgorithm: rec?.id ?? null,
    hintNextMove: nextMove,
    previewAlgorithmId: s.hintTier === 4 ? (rec?.id ?? null) : s.previewAlgorithmId,
  });
}
