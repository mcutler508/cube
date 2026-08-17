import type { Move } from './cube';
import type { FaceLetter } from '../cube/net';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'master';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  tagline: string;
  scrambleMin: number;
  scrambleMax: number;
  helperArrows: boolean;
  suggestions: boolean;
  /** Multiplies the base per-quarter-turn animation duration (1 = default). */
  animationSpeedMultiplier: number;
  /** Applied to final score at solve time. */
  scoreMultiplier: number;
}

/** Snapshot of how solved the cube is right now. */
export interface CubeProgress {
  /** 0–100. Monotonically-ish: small moves cause small changes. */
  percentage: number;
  /** How many of the 20 non-center cubies are in their home slot. */
  solvedCubies: number;
  /** How many of those are also oriented correctly. */
  orientedCubies: number;
  /** Faces currently fully solved. */
  solvedFaces: FaceLetter[];
}

export type GameEvent =
  | { type: 'moveCompleted'; move: Move; progress: number }
  | { type: 'progressIncreased'; amount: number; progress: number }
  | { type: 'progressDecreased'; amount: number; progress: number }
  | { type: 'faceCompleted'; face: FaceLetter }
  | { type: 'faceBroken'; face: FaceLetter }
  | { type: 'streakIncreased'; streak: number }
  | { type: 'streakBroken'; previousStreak: number }
  | { type: 'nearSolved'; progress: number }
  | { type: 'cubeSolved'; timeMs: number; moves: number; difficulty: Difficulty; bestStreak: number }
  | { type: 'objectiveCompleted'; levelId: string; moves: number; timeMs: number };

export type IntensityTier = 'calm' | 'warm' | 'active' | 'heightened' | 'near' | 'solved';
