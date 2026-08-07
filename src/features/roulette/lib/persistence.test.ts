import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PERSISTENCE_KEY,
  getRestoredPhase,
  getRestoredRound,
  loadGameState,
  saveGameState
} from "./persistence";

type TestStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const createStorage = (storedValue: string | null = null): TestStorage => {
  let value = storedValue;

  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((key: string, nextValue: string) => {
      if (key !== PERSISTENCE_KEY) {
        throw new Error(`unexpected persistence key: ${key}`);
      }

      value = nextValue;
    })
  };
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("saveGameState", () => {
  it("stores confirmed winners with completion and an ISO timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T12:34:56.000Z"));

    const storage = createStorage();

    const result = saveGameState(storage, ["keychain-01", "keychain-03"], true);

    expect(result).toEqual({ ok: true });
    expect(storage.setItem).toHaveBeenCalledWith(
      PERSISTENCE_KEY,
      JSON.stringify({
        winnerIds: ["keychain-01", "keychain-03"],
        completed: true,
        savedAt: "2026-08-07T12:34:56.000Z"
      })
    );
  });

  it("returns an error when storage write fails", () => {
    const storage: TestStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error("quota exceeded");
      })
    };

    const result = saveGameState(storage, ["keychain-02"], false);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe("quota exceeded");
    }
  });
});

describe("loadGameState", () => {
  it("loads a persisted game state and drops the saved timestamp", () => {
    const storage = createStorage(
      JSON.stringify({
        winnerIds: ["keychain-01", "keychain-02"],
        completed: false,
        savedAt: "2026-08-07T12:34:56.000Z"
      })
    );

    expect(loadGameState(storage)).toEqual({
      winnerIds: ["keychain-01", "keychain-02"],
      completed: false
    });
  });

  it("returns null for malformed JSON", () => {
    const storage = createStorage("{not-json");

    expect(loadGameState(storage)).toBeNull();
  });

  it("returns null for wrong shapes, duplicate winners, or more than three winners", () => {
    const invalidPayloads = [
      JSON.stringify({ winnerIds: "keychain-01", completed: false, savedAt: "2026-08-07T12:34:56.000Z" }),
      JSON.stringify({ winnerIds: ["keychain-01", "keychain-01"], completed: false, savedAt: "2026-08-07T12:34:56.000Z" }),
      JSON.stringify({
        winnerIds: ["keychain-01", "keychain-02", "keychain-03", "keychain-04"],
        completed: true,
        savedAt: "2026-08-07T12:34:56.000Z"
      })
    ];

    for (const payload of invalidPayloads) {
      expect(loadGameState(createStorage(payload))).toBeNull();
    }
  });
});

describe("restored game state helpers", () => {
  it("restores idle for zero, one, or two winners and complete for three winners", () => {
    expect(getRestoredPhase([], false)).toBe("idle");
    expect(getRestoredPhase(["keychain-01"], false)).toBe("idle");
    expect(getRestoredPhase(["keychain-01", "keychain-02"], false)).toBe("idle");
    expect(getRestoredPhase(["keychain-01", "keychain-02", "keychain-03"], true)).toBe(
      "complete"
    );
  });

  it("restores the next round after each confirmed winner", () => {
    expect(getRestoredRound([])).toBe(1);
    expect(getRestoredRound(["keychain-01"])).toBe(2);
    expect(getRestoredRound(["keychain-01", "keychain-02"])).toBe(3);
    expect(getRestoredRound(["keychain-01", "keychain-02", "keychain-03"])).toBe(3);
  });
});
