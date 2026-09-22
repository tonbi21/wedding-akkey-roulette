// Keep the placeholder-image rehearsal history separate from the final 48 designs.
export const PERSISTENCE_KEY = "wedding-akkey-roulette:v2";

export type PersistedGameState = {
  winnerIds: string[];
  completed: boolean;
  savedAt: string;
};

export type PersistenceStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isUniqueStringArray = (value: unknown): value is string[] => {
  if (!Array.isArray(value) || value.length > 3) {
    return false;
  }

  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== "string" || seen.has(entry)) {
      return false;
    }

    seen.add(entry);
  }

  return true;
};

const isPersistedGameState = (value: unknown): value is PersistedGameState => {
  if (!isRecord(value)) {
    return false;
  }

  if (!isUniqueStringArray(value.winnerIds)) {
    return false;
  }

  if (typeof value.completed !== "boolean" || typeof value.savedAt !== "string") {
    return false;
  }

  if (value.completed !== (value.winnerIds.length === 3)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value.savedAt));
};

export const saveGameState = (
  storage: PersistenceStorage,
  winnerIds: string[],
  completed: boolean
): { ok: true } | { ok: false; error: Error } => {
  try {
    const persistedState: PersistedGameState = {
      winnerIds: [...winnerIds],
      completed,
      savedAt: new Date().toISOString()
    };

    storage.setItem(PERSISTENCE_KEY, JSON.stringify(persistedState));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error("Failed to save game state")
    };
  }
};

export const loadGameState = (
  storage: PersistenceStorage
): { winnerIds: string[]; completed: boolean } | null => {
  try {
    const rawValue = storage.getItem(PERSISTENCE_KEY);

    if (rawValue === null) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (!isPersistedGameState(parsedValue)) {
      return null;
    }

    return {
      winnerIds: [...parsedValue.winnerIds],
      completed: parsedValue.completed
    };
  } catch {
    return null;
  }
};

export const getRestoredPhase = (winnerIds: string[], completed: boolean): "idle" | "complete" =>
  winnerIds.length === 3 ? "complete" : "idle";

export const getRestoredRound = (winnerIds: string[]): 1 | 2 | 3 => {
  if (winnerIds.length === 0) {
    return 1;
  }

  if (winnerIds.length === 1) {
    return 2;
  }

  return 3;
};
