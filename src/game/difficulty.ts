import type { Difficulty, DifficultyConfig } from '../types/game';

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    tagline: 'Short scramble. Helpful arrows.',
    scrambleMin: 5,
    scrambleMax: 7,
    helperArrows: true,
    suggestions: true,
    animationSpeedMultiplier: 1.35, // slower, clearer
    scoreMultiplier: 1,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    tagline: 'Standard scramble. Standard feel.',
    scrambleMin: 10,
    scrambleMax: 15,
    helperArrows: false,
    suggestions: false,
    animationSpeedMultiplier: 1,
    scoreMultiplier: 1.5,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    tagline: 'Deep scramble. Efficiency matters.',
    scrambleMin: 20,
    scrambleMax: 25,
    helperArrows: false,
    suggestions: false,
    animationSpeedMultiplier: 0.9,
    scoreMultiplier: 2,
  },
  master: {
    id: 'master',
    label: 'Master',
    tagline: 'Full scramble. No assistance.',
    scrambleMin: 25,
    scrambleMax: 30,
    helperArrows: false,
    suggestions: false,
    animationSpeedMultiplier: 0.8,
    scoreMultiplier: 3,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard', 'master'];

export function getDifficultyConfig(id: Difficulty): DifficultyConfig {
  return DIFFICULTY_CONFIGS[id];
}
