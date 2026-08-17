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

export type GamePhase = 'ready' | 'playing' | 'solved';

const NEAR_SOLVED_THRESHOLD = 90;

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
  /** Placeholder for helper-arrow plumbing; always null until a solver lands. */
  hintMove: Move | null;

  // --- level / objective ---
  currentLevel: Level | null;
  objectiveCompleted: boolean;

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
  hintMove: null,
  currentLevel: null,
  objectiveCompleted: false,

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

    // Full accomplishment snapshot (rows / crosses / layers). Faces are handled
    // above via evaluateProgress; we duplicate face detection here rather than
    // couple the two — the cost is one extra computeNet, which is trivial.
    const detections = detectAll(next);
    const nextRowKeys = detections.rows.map((r) => rowKey(r.face, r.row));
    const rowDiff = diffLists(s.solvedRows, nextRowKeys);
    const crossDiff = diffLists(s.solvedCrosses, detections.crosses);
    const layerDiff = diffLists(s.solvedLayers, detections.layers);

    // Level-objective check. Only fires when playing a level and the objective
    // wasn't already satisfied; full_solve objectives suppress the overlay to
    // avoid double-celebration with SolvedSequence.
    const objectiveHit =
      s.currentLevel != null &&
      !s.objectiveCompleted &&
      evaluateObjective(next, s.currentLevel.objective);
    const objectiveIsSolve = s.currentLevel?.objective.type === 'full_solve';

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
    });

    // Emit events after the state update so subscribers see the new values.
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
    // Applies the inverse move to the cube state. Move count / history are
    // adjusted by the caller (popHistory) *before* the animation runs.
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
      // Undoing shouldn't advance the streak, but shouldn't destroy it either.
      // Don't emit progress-change events for undos — they'd confuse the juice.
      // If undoing lands the cube on solved, don't celebrate.
      phase: solved && s.phase === 'playing' ? 'ready' : s.phase,
    });
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
    // Progress + solvedFaces have already been updated per scramble move.
    // Just clear the scrambling flag and treat this as the fresh baseline.
    set({
      isScrambling: false,
      phase: 'ready',
      progressDelta: 0,
      isNearSolved: false,
      // Baseline the progress so the *first* player move's delta is measured
      // against the post-scramble state, not against 100.
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
      hintMove: null,
      objectiveCompleted: false,
    });
  },

  setDifficulty: (d) => set({ difficulty: d }),

  loadLevel: (level) => {
    set({ currentLevel: level, objectiveCompleted: false });
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
      hintMove: null,
      currentLevel: null,
      objectiveCompleted: false,
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

/** Set-diff two arrays of primitives. Order of the output is the order of appearance in the corresponding input. */
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
