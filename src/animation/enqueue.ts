import type { Move } from '../types/cube';
import { getDifficultyConfig } from '../game/difficulty';
import { useGameStore } from '../store/gameStore';
import { moveQueue } from './moveController';

const BASE_PLAYER_DURATION = 0.19;
const SCRAMBLE_DURATION = 0.09;

function playerDuration(): number {
  const d = useGameStore.getState().difficulty;
  return BASE_PLAYER_DURATION * getDifficultyConfig(d).animationSpeedMultiplier;
}

export function enqueuePlayerMove(move: Move) {
  // Drill gate: in guided phase, wrong moves are hard-blocked before entering
  // the animation queue. Returns true when no drill is active.
  if (!useGameStore.getState().gateDrillMove(move)) return;
  moveQueue.push({ move, kind: 'player', duration: playerDuration() });
}

export function enqueueScrambleMoves(moves: Move[]) {
  moveQueue.pushMany(
    moves.map((move) => ({ move, kind: 'scramble' as const, duration: SCRAMBLE_DURATION })),
  );
}

export function enqueueUndoMove(move: Move) {
  moveQueue.push({ move, kind: 'undo', duration: playerDuration() });
}
