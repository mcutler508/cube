import type { StarCount } from './stars';

/**
 * Per-level personal-best record. Stored in localStorage under a single
 * versioned key so the whole PB table serializes/deserializes together.
 * When the schema grows (streaks, hint use, etc.) bump SCHEMA_VERSION and
 * write a migration in load().
 */
export interface LevelBest {
  levelId: string;
  bestMoves: number;
  bestTimeMs: number;
  bestStars: StarCount;
  completions: number;
  updatedAt: number;
}

const STORAGE_KEY = 'cube:pb:v1';
const SCHEMA_VERSION = 1;

type PBTable = Record<string, LevelBest>;

interface StoredPayload {
  version: number;
  table: PBTable;
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function readTable(): PBTable {
  const s = safeStorage();
  if (!s) return {};
  const raw = s.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as StoredPayload;
    if (parsed.version !== SCHEMA_VERSION) return {};
    return parsed.table ?? {};
  } catch {
    return {};
  }
}

function writeTable(table: PBTable): void {
  const s = safeStorage();
  if (!s) return;
  try {
    const payload: StoredPayload = { version: SCHEMA_VERSION, table };
    s.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota exceeded or storage disabled — silently drop */
  }
}

export function getLevelBest(levelId: string): LevelBest | null {
  return readTable()[levelId] ?? null;
}

export function getAllBests(): PBTable {
  return readTable();
}

export interface RunResult {
  levelId: string;
  moves: number;
  timeMs: number;
  stars: StarCount;
}

/**
 * Record a completion. Returns { updated: true } if this run improved any
 * dimension (fewer moves, faster time, more stars, or first completion).
 * The `completions` counter always increments.
 */
export function recordCompletion(run: RunResult): { updated: boolean; best: LevelBest } {
  const table = readTable();
  const existing = table[run.levelId];
  const now = Date.now();
  if (!existing) {
    const best: LevelBest = {
      levelId: run.levelId,
      bestMoves: run.moves,
      bestTimeMs: run.timeMs,
      bestStars: run.stars,
      completions: 1,
      updatedAt: now,
    };
    table[run.levelId] = best;
    writeTable(table);
    return { updated: true, best };
  }
  const improvedMoves = run.moves < existing.bestMoves;
  const improvedTime = run.timeMs < existing.bestTimeMs;
  const improvedStars = run.stars > existing.bestStars;
  const updated = improvedMoves || improvedTime || improvedStars;
  const merged: LevelBest = {
    levelId: run.levelId,
    bestMoves: improvedMoves ? run.moves : existing.bestMoves,
    bestTimeMs: improvedTime ? run.timeMs : existing.bestTimeMs,
    bestStars: improvedStars ? run.stars : existing.bestStars,
    completions: existing.completions + 1,
    updatedAt: now,
  };
  table[run.levelId] = merged;
  writeTable(table);
  return { updated, best: merged };
}

/** Test-only: wipe the PB table. */
export function _resetAllBestsForTest(): void {
  const s = safeStorage();
  if (s) s.removeItem(STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Onboarding flags — small key/value store for one-shot UI events (e.g. "user
// has seen the swipe tip"). Persisted separately from PBs so it doesn't
// invalidate on schema bumps to the PB structure.

const FLAGS_KEY = 'cube:flags:v1';

export type OnboardingFlag = 'seenSwipeTip' | 'seenHintTip';

type FlagsTable = Partial<Record<OnboardingFlag, boolean>>;

function readFlags(): FlagsTable {
  const s = safeStorage();
  if (!s) return {};
  const raw = s.getItem(FLAGS_KEY);
  if (!raw) return {};
  try {
    return (JSON.parse(raw) as FlagsTable) ?? {};
  } catch {
    return {};
  }
}

function writeFlags(flags: FlagsTable): void {
  const s = safeStorage();
  if (!s) return;
  try {
    s.setItem(FLAGS_KEY, JSON.stringify(flags));
  } catch {
    /* silently drop */
  }
}

export function hasSeenFlag(flag: OnboardingFlag): boolean {
  return readFlags()[flag] === true;
}

export function markFlagSeen(flag: OnboardingFlag): void {
  const flags = readFlags();
  if (flags[flag]) return;
  flags[flag] = true;
  writeFlags(flags);
}

/** Test-only: wipe onboarding flags. */
export function _resetAllFlagsForTest(): void {
  const s = safeStorage();
  if (s) s.removeItem(FLAGS_KEY);
}

// ---------------------------------------------------------------------------
// User settings — persisted preferences that survive across sessions. Written
// through on every change from the settings panel. New keys land here with a
// sensible default so old payloads read-through without a migration.

const SETTINGS_KEY = 'cube:settings:v1';

export interface Settings {
  /** Show the unfolded 2D cube net beneath the play area. Off by default. */
  showCubeNet: boolean;
  /** Selected visual theme id (see src/cube/themes.ts). Unknown ids fall back
   *  to the first registered theme, so removing/renaming a theme won't brick
   *  an old saved settings object. */
  themeId: string;
  /** Selected direction-indicator style id (see src/cube/reticleStyles.ts).
   *  Unknown ids fall back to the default style. */
  reticleStyle: string;
  /** Selected play-field background id (see src/cube/backgrounds.ts). Unknown
   *  ids fall back to the first registered background. */
  backgroundId: string;
}

export const DEFAULT_SETTINGS: Settings = {
  showCubeNet: false,
  themeId: 'classic',
  reticleStyle: 'hud',
  backgroundId: 'graphite',
};

export function loadSettings(): Settings {
  const s = safeStorage();
  if (!s) return { ...DEFAULT_SETTINGS };
  const raw = s.getItem(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  const s = safeStorage();
  if (!s) return;
  try {
    s.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* silently drop */
  }
}

/** Test-only: wipe persisted settings. */
export function _resetSettingsForTest(): void {
  const s = safeStorage();
  if (s) s.removeItem(SETTINGS_KEY);
}
