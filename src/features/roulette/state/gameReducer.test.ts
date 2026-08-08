import { describe, expect, it } from "vitest";
import { gameReducer, initialGameState } from "./gameReducer";
import type { GameState } from "../gameTypes";

const createState = (overrides: Partial<GameState> = {}): GameState => ({
  ...initialGameState,
  ...overrides
});

describe("gameReducer", () => {
  it("moves from boot to ready when assets load", () => {
    const nextState = gameReducer(createState(), { type: "ASSETS_READY" });

    expect(nextState).toEqual({
      ...initialGameState,
      phase: "ready",
      assetsReady: true
    });
  });

  it("enters error when assets fail", () => {
    const nextState = gameReducer(createState(), { type: "ASSETS_FAILED" });

    expect(nextState.phase).toBe("error");
    expect(nextState.assetsReady).toBe(false);
  });

  it("moves from ready to idle on enter", () => {
    const nextState = gameReducer(createState({ phase: "ready", assetsReady: true }), {
      type: "ENTER"
    });

    expect(nextState.phase).toBe("idle");
  });

  it("moves from idle to countdown on start", () => {
    const nextState = gameReducer(createState({ phase: "idle", assetsReady: true }), {
      type: "START"
    });

    expect(nextState.phase).toBe("countdown");
  });

  it("moves from countdown to spinning when countdown completes", () => {
    const nextState = gameReducer(createState({ phase: "countdown", assetsReady: true }), {
      type: "COUNTDOWN_COMPLETE"
    });

    expect(nextState.phase).toBe("spinning");
  });

  it("stops immediately and stores exactly one winner", () => {
    const nextState = gameReducer(createState({ phase: "spinning", assetsReady: true }), {
      type: "STOP",
      winnerId: "keychain-02"
    });

    expect(nextState.phase).toBe("winner");
    expect(nextState.currentKeychainId).toBe("keychain-02");
    expect(nextState.pendingWinnerId).toBeNull();
    expect(nextState.winnerIds).toEqual(["keychain-02"]);
  });

  it("updates the visible keychain while spinning without changing the phase", () => {
    const state = createState({ phase: "spinning", assetsReady: true });
    expect(gameReducer(state, { type: "DISPLAY_KEYCHAIN", keychainId: "keychain-04" })).toEqual({
      ...state,
      currentKeychainId: "keychain-04"
    });
  });

  it("ignores stop outside spinning and ignores a second stop once pending winner exists", () => {
    const idleState = createState({ phase: "idle", assetsReady: true });
    const stoppedState = gameReducer(createState({ phase: "spinning", assetsReady: true }), {
      type: "STOP",
      winnerId: "keychain-01"
    });

    expect(gameReducer(idleState, { type: "STOP", winnerId: "keychain-03" })).toEqual(idleState);
    expect(gameReducer(stoppedState, { type: "STOP", winnerId: "keychain-02" })).toEqual(
      stoppedState
    );
  });

  it("moves to the next round from winner on rounds one and two", () => {
    const roundTwoState = gameReducer(
      createState({
        phase: "winner",
        assetsReady: true,
        round: 1,
        currentKeychainId: "keychain-01",
        winnerIds: ["keychain-01"]
      }),
      { type: "NEXT" }
    );

    const roundThreeState = gameReducer(
      createState({
        phase: "winner",
        assetsReady: true,
        round: 2,
        currentKeychainId: "keychain-02",
        winnerIds: ["keychain-01", "keychain-02"]
      }),
      { type: "NEXT" }
    );

    expect(roundTwoState).toEqual({
      ...initialGameState,
      phase: "idle",
      round: 2,
      assetsReady: true,
      winnerIds: ["keychain-01"]
    });
    expect(roundThreeState).toEqual({
      ...initialGameState,
      phase: "idle",
      round: 3,
      assetsReady: true,
      winnerIds: ["keychain-01", "keychain-02"]
    });
  });

  it("enters winner state for all three rounds", () => {
    let state = createState({ phase: "spinning", assetsReady: true });

    state = gameReducer(state, { type: "STOP", winnerId: "keychain-01" });
    expect(state.phase).toBe("winner");
    state = gameReducer(state, { type: "NEXT" });
    state = gameReducer(state, { type: "START" });
    state = gameReducer(state, { type: "COUNTDOWN_COMPLETE" });

    state = gameReducer(state, { type: "STOP", winnerId: "keychain-02" });
    expect(state.phase).toBe("winner");
    state = gameReducer(state, { type: "NEXT" });
    state = gameReducer(state, { type: "START" });
    state = gameReducer(state, { type: "COUNTDOWN_COMPLETE" });

    state = gameReducer(state, { type: "STOP", winnerId: "keychain-03" });
    expect(state.phase).toBe("winner");
    expect(state.winnerIds).toEqual(["keychain-01", "keychain-02", "keychain-03"]);
  });

  it("completes after the third winner and ignores next before winner phase", () => {
    const completeState = gameReducer(
      createState({
        phase: "winner",
        assetsReady: true,
        round: 3,
        currentKeychainId: "keychain-03",
        winnerIds: ["keychain-01", "keychain-02", "keychain-03"]
      }),
      { type: "NEXT" }
    );
    const idleState = createState({ phase: "idle", assetsReady: true, round: 2 });

    expect(completeState.phase).toBe("complete");
    expect(gameReducer(idleState, { type: "NEXT" })).toEqual(idleState);
  });

  it("ignores invalid start actions and resets to boot when requested", () => {
    const readyState = createState({ phase: "ready", assetsReady: true });
    const winnerState = createState({
      phase: "winner",
      assetsReady: true,
      round: 2,
      currentKeychainId: "keychain-02",
      pendingWinnerId: "keychain-02",
      winnerIds: ["keychain-01", "keychain-02"]
    });

    expect(gameReducer(readyState, { type: "START" })).toEqual(readyState);
    expect(gameReducer(winnerState, { type: "RESET" })).toEqual(initialGameState);
  });
});
