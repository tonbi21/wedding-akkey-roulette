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

  it("moves from spinning to decelerating and stores exactly one pending winner", () => {
    const nextState = gameReducer(createState({ phase: "spinning", assetsReady: true }), {
      type: "STOP",
      winnerId: "keychain-02"
    });

    expect(nextState.phase).toBe("decelerating");
    expect(nextState.pendingWinnerId).toBe("keychain-02");
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

  it("moves from decelerating to reveal and promotes the pending winner to current", () => {
    const nextState = gameReducer(
      createState({
        phase: "decelerating",
        assetsReady: true,
        pendingWinnerId: "keychain-03"
      }),
      { type: "DECELERATION_COMPLETE" }
    );

    expect(nextState).toEqual({
      ...initialGameState,
      phase: "reveal",
      assetsReady: true,
      currentKeychainId: "keychain-03",
      pendingWinnerId: "keychain-03"
    });
  });

  it("moves from reveal to winner and appends the revealed winner once", () => {
    const firstWinnerState = gameReducer(
      createState({
        phase: "reveal",
        assetsReady: true,
        currentKeychainId: "keychain-02",
        pendingWinnerId: "keychain-02",
        winnerIds: ["keychain-01"]
      }),
      { type: "REVEAL_COMPLETE" }
    );

    const repeatedWinnerState = gameReducer(firstWinnerState, { type: "REVEAL_COMPLETE" });

    expect(firstWinnerState.phase).toBe("winner");
    expect(firstWinnerState.winnerIds).toEqual(["keychain-01", "keychain-02"]);
    expect(repeatedWinnerState).toEqual(firstWinnerState);
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
