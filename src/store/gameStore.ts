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
  streak: number;
  bestStreak: number;
  isNearSolved: boolean;
  /** Placeholder for helper-arrow plumbing; always null until a solver lands. */
  hintMove: Move | null;

  // --- reducers ---
  commitPlayerMove: (move: Move) => void;
  commitScrambleMove: (move: Move) => void;
  commitUndoMove: (move: Move) => void;
  beginScramble: () => void;
  endScramble: () => void;
  reset: () => void;
  setDifficulty: (d: Difficulty) => void;
}

const initialProgress = evaluateProgress(createSolvedCube());

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
  streak: 0,
  bestStreak: 0,
  isNearSolved: false,
  hintMove: null,

  commitPlayerMove: (move) => {
    const s = get();
    if (s.phase === 'solved') return;
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
      streak: solved ? 0 : newStreak,
      bestStreak,
      isNearSolved: isNear,
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
  },

  commitScrambleMove: (move) => {
    const s = get();
    const next = applyMove(s.cubeState, move);
    const p = evaluateProgress(next);
    set({
      cubeState: next,
      progress: p.percentage,
      solvedFaces: p.solvedFaces,
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
    set({
      cubeState: next,
      progress: p.percentage,
      solvedFaces: p.solvedFaces,
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
      streak: 0,
      bestStreak: 0,
      isNearSolved: false,
      hintMove: null,
    });
  },

  setDifficulty: (d) => set({ difficulty: d }),
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
