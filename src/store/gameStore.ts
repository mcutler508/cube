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
import { hintAlgorithmFor } from '../game/solver';
import { detectAlgorithm } from '../game/algorithms';
import { firstUnmetMilestone } from '../game/milestones';
import { loadSettings, saveSettings, type Settings } from '../game/persistence';

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
  /** Session-scoped counter of hint requests; instrumentation for a future paywall. */
  hintCount: number;

  // --- level / objective ---
  currentLevel: Level | null;
  objectiveCompleted: boolean;

  // --- menu routing ---
  /** Which landing screen to show when no level is active. */
  menuView: 'daily' | 'learn' | 'algos';

  // --- user settings ---
  settings: Settings;
  /** True while the settings panel is open (in-level overlay). */
  isSettingsOpen: boolean;

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
  setPreviewAlgorithm: (id: string | null) => void;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  openSettings: () => void;
  closeSettings: () => void;
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
  hintCount: 0,
  currentLevel: null,
  objectiveCompleted: false,
  menuView: 'daily',
  previewAlgorithmId: null,
  settings: loadSettings(),
  isSettingsOpen: false,

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

    // Level-objective check.
    const objectiveHit =
      s.currentLevel != null &&
      !s.objectiveCompleted &&
      evaluateObjective(next, s.currentLevel.objective);
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
      hintTier: nextHintTier,
      hintTargetMilestone: nextTargetMilestone,
      hintTargetAlgorithm: nextTargetAlgorithm,
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
      previewAlgorithmId: null,
    });
  },

  setDifficulty: (d) => set({ difficulty: d }),

  loadLevel: (level) => {
    set({
      currentLevel: level,
      objectiveCompleted: false,
      hintTier: 0,
      hintTargetMilestone: null,
      hintTargetAlgorithm: null,
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
        previewAlgorithmId: null,
      });
      return;
    }
    const nextTier = (s.hintTier + 1) as HintTier;
    const state = s.cubeState;
    const milestone = firstUnmetMilestone(state);
    const rec = nextTier >= 2 ? hintAlgorithmFor(state, s.currentLevel) : null;
    set({
      hintTier: nextTier,
      hintTargetMilestone: milestone?.label ?? null,
      hintTargetAlgorithm: rec?.id ?? null,
      previewAlgorithmId: nextTier === 4 ? (rec?.id ?? null) : s.previewAlgorithmId,
      hintCount: s.hintCount + 1,
    });
  },

  dismissHint: () => set({
    hintTier: 0,
    hintTargetMilestone: null,
    hintTargetAlgorithm: null,
    previewAlgorithmId: null,
  }),

  setMenuView: (view) => set({ menuView: view }),

  setPreviewAlgorithm: (id) => set({ previewAlgorithmId: id }),

  setSetting: (key, value) => {
    const next = { ...get().settings, [key]: value };
    saveSettings(next);
    set({ settings: next });
  },

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

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
      hintTier: 0,
      hintTargetMilestone: null,
      hintTargetAlgorithm: null,
      previewAlgorithmId: null,
    });
  },
}));

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
  useGameStore.setState({
    hintTargetMilestone: milestone?.label ?? null,
    hintTargetAlgorithm: rec?.id ?? null,
    previewAlgorithmId: s.hintTier === 4 ? (rec?.id ?? null) : s.previewAlgorithmId,
  });
}
