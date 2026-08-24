import { create } from 'zustand';

const STORAGE_KEY = 'cube:player:v1';

export interface Player {
  id: string;
  name: string;
  /** True once the account has cleared the first-run tutorial (learn-01,
   *  learn-02). Persisted per-player in Supabase (see the
   *  20260823_add_tutorial_completed.sql migration) so a fresh account on
   *  a browser that already ran the tutorial still gets routed through it. */
  tutorialCompleted: boolean;
}

interface StoredPayload {
  version: 1;
  player: Player;
}

interface PlayerStore {
  player: Player | null;
  hydrated: boolean;
  hydrate: () => void;
  setPlayer: (player: Player) => void;
  markTutorialCompleted: () => void;
  signOut: () => void;
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStored(): Player | null {
  const s = safeStorage();
  if (!s) return null;
  const raw = s.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredPayload;
    if (parsed.version !== 1 || !parsed.player?.id || !parsed.player?.name) return null;
    // tutorialCompleted was added later; old cached payloads default to
    // false so the app re-verifies against Supabase on next sign-in.
    return {
      id: parsed.player.id,
      name: parsed.player.name,
      tutorialCompleted: parsed.player.tutorialCompleted ?? false,
    };
  } catch {
    return null;
  }
}

function writeStored(player: Player | null): void {
  const s = safeStorage();
  if (!s) return;
  try {
    if (player) {
      const payload: StoredPayload = { version: 1, player };
      s.setItem(STORAGE_KEY, JSON.stringify(payload));
    } else {
      s.removeItem(STORAGE_KEY);
    }
  } catch {
    /* quota / disabled — silently drop */
  }
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  player: null,
  hydrated: false,
  hydrate: () => {
    set({ player: readStored(), hydrated: true });
  },
  setPlayer: (player) => {
    writeStored(player);
    set({ player });
  },
  markTutorialCompleted: () => {
    const current = readStored();
    if (!current) return;
    const next: Player = { ...current, tutorialCompleted: true };
    writeStored(next);
    set({ player: next });
  },
  signOut: () => {
    writeStored(null);
    set({ player: null });
  },
}));

/** Generate a fresh player id for sign-up. Prefer crypto.randomUUID(). */
export function generatePlayerId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Weak fallback for very old environments.
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
