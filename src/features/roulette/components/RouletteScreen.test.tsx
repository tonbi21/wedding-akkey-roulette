import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { initialGameState } from "../state/gameReducer";
import type { GameState } from "../gameTypes";
import { PERSISTENCE_KEY } from "../lib/persistence";
import type { AudioController } from "../hooks/useAudioController";
import { RouletteScreen } from "./RouletteScreen";

const state = (overrides: Partial<GameState>): GameState => ({ ...initialGameState, ...overrides });

describe("RouletteScreen", () => {
  const completedState = state({
    phase: "complete", round: 3, assetsReady: true,
    winnerIds: ["keychain-01", "keychain-02", "keychain-03"]
  });
  const readyAssets = { ready: true, progress: 100, failedAssets: [] };

  it.each([1, 2, 3] as const)("RETRY reruns round %i, saves only earlier winners and makes the cancelled image eligible", (round) => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation((array) => {
      (array as Uint32Array)[0] = 0;
      return array;
    });
    const winners = ["keychain-01", "keychain-02", "keychain-03"].slice(0, round);
    render(<RouletteScreen initialState={state({
      phase: "winner", round, winnerIds: winners, currentKeychainId: winners[round - 1], assetsReady: true
    })} />);
    fireEvent.click(screen.getByRole("button", { name: "RETRY" }));
    expect(screen.getByRole("button", { name: "STOP" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "RETRY" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("winner-overlay")).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(PERSISTENCE_KEY)!)).toMatchObject({
      winnerIds: winners.slice(0, -1), completed: false
    });
    fireEvent.click(screen.getByRole("button", { name: "STOP" }));
    expect(JSON.parse(window.localStorage.getItem(PERSISTENCE_KEY)!)).toMatchObject({ winnerIds: winners });
    expect(screen.getByRole("img", { name: "Current roulette image" }))
      .toHaveAttribute("src", `/assets/keychains/${winners[round - 1]}.png`);
    fireEvent.click(screen.getByRole("button", { name: "NEXT" }));
    expect(screen.getByRole("main")).toHaveAttribute("data-phase", round === 3 ? "complete" : "idle");
  });

  it("keeps the stopped result if saving a retry fails, then allows another attempt", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<RouletteScreen initialState={state({
      phase: "winner", round: 1, winnerIds: ["keychain-01"], currentKeychainId: "keychain-01"
    })} />);
    const saved = window.localStorage.getItem(PERSISTENCE_KEY);
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("Storage unavailable"); });
    fireEvent.click(screen.getByRole("button", { name: "RETRY" }));
    expect(screen.getByRole("alert")).toHaveTextContent("回し直しを保存できませんでした");
    expect(screen.getByRole("main")).toHaveAttribute("data-phase", "winner");
    expect(window.localStorage.getItem(PERSISTENCE_KEY)).toBe(saved);
    fireEvent.click(screen.getByRole("button", { name: "RETRY" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "STOP" })).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("resets the completed draw and persists the first winner of the new draw", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation((array) => {
      (array as Uint32Array)[0] = 0;
      return array;
    });
    render(<RouletteScreen initialState={completedState} assetState={readyAssets} />);
    fireEvent.click(screen.getByRole("button", { name: "はじめからやり直す" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "START" })).toBeInTheDocument());
    expect(screen.getByRole("main")).toHaveAttribute("data-winner-count", "0");
    expect(window.localStorage.getItem(PERSISTENCE_KEY)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "当選者を表示" }));
    expect(screen.queryByRole("img", { name: "1回目の当選画像" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "当選者を閉じる" }));
    fireEvent.click(screen.getByRole("button", { name: "START" }));
    fireEvent.click(screen.getByRole("button", { name: "STOP" }));
    expect(screen.getByRole("main")).toHaveAttribute("data-winner-count", "1");
    expect(JSON.parse(window.localStorage.getItem(PERSISTENCE_KEY)!)).toMatchObject({
      winnerIds: ["keychain-01"], completed: false
    });
  });

  it("keeps the completed draw when reset confirmation is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<RouletteScreen initialState={completedState} assetState={readyAssets} />);
    const stored = window.localStorage.getItem(PERSISTENCE_KEY);
    fireEvent.click(screen.getByRole("button", { name: "はじめからやり直す" }));
    expect(screen.getByRole("main")).toHaveAttribute("data-phase", "complete");
    expect(screen.getByRole("main")).toHaveAttribute("data-winner-count", "3");
    expect(window.localStorage.getItem(PERSISTENCE_KEY)).toBe(stored);
  });

  it("preserves winners and allows retry if clearing saved history fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const remove = vi.spyOn(Storage.prototype, "removeItem").mockImplementationOnce(() => {
      throw new Error("Storage unavailable");
    });
    render(<RouletteScreen initialState={completedState} assetState={readyAssets} />);
    const stored = window.localStorage.getItem(PERSISTENCE_KEY);
    fireEvent.click(screen.getByRole("button", { name: "はじめからやり直す" }));
    expect(screen.getByRole("alert")).toHaveTextContent("当選者を削除できませんでした");
    expect(screen.getByRole("main")).toHaveAttribute("data-phase", "complete");
    expect(window.localStorage.getItem(PERSISTENCE_KEY)).toBe(stored);
    remove.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "はじめからやり直す" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "START" })).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("uses a random selection across all 37 designs on STOP and excludes previous winners", () => {
    const random = vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation((array) => {
      (array as Uint32Array)[0] = 36;
      return array;
    });
    const audioController: AudioController = {
      unlock: vi.fn(async () => undefined),
      startRoulette: vi.fn(async () => undefined),
      startDeceleration: vi.fn(async () => undefined),
      playWinner: vi.fn(async () => undefined),
      stopAll: vi.fn()
    };
    render(<RouletteScreen initialState={state({ phase: "spinning" })} audioController={audioController} />);
    fireEvent.click(screen.getByRole("button", { name: "STOP" }));
    expect(screen.getByRole("img", { name: "Current roulette image" }))
      .toHaveAttribute("src", "/assets/keychains/keychain-48.png");

    fireEvent.click(screen.getByRole("button", { name: "NEXT" }));
    fireEvent.click(screen.getByRole("button", { name: "START" }));
    random.mockImplementation((array) => {
      (array as Uint32Array)[0] = 35;
      return array;
    });
    fireEvent.click(screen.getByRole("button", { name: "STOP" }));
    expect(screen.getByRole("img", { name: "Current roulette image" }))
      .toHaveAttribute("src", "/assets/keychains/keychain-47.png");
  });

  it("starts the first draw from READY with one START press", () => {
    render(<RouletteScreen initialState={state({ phase: "ready", assetsReady: true })} />);
    expect(screen.getByRole("heading", { name: "Akkey Roulette" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "START" }));
    expect(screen.getByRole("button", { name: "STOP" })).toBeInTheDocument();
  });

  it("shows START only in idle", () => {
    render(<RouletteScreen initialState={state({ phase: "idle", assetsReady: true })} />);
    expect(screen.getByRole("button", { name: "START" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "STOP" })).not.toBeInTheDocument();
  });

  it("shows STOP only while spinning", () => {
    render(<RouletteScreen initialState={state({ phase: "spinning", assetsReady: true })} />);
    expect(screen.getByRole("button", { name: "STOP" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "START" })).not.toBeInTheDocument();
  });

  it("shows the selected product without a MATCH overlay after stopping", () => {
    const audioController: AudioController = {
      unlock: vi.fn(async () => undefined),
      startRoulette: vi.fn(async () => undefined),
      startDeceleration: vi.fn(async () => undefined),
      playWinner: vi.fn(async () => undefined),
      stopAll: vi.fn()
    };

    render(<RouletteScreen initialState={state({ phase: "spinning" })} audioController={audioController} />);
    fireEvent.click(screen.getByRole("button", { name: "STOP" }));

    expect(screen.getByRole("button", { name: "NEXT" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Current roulette image" })).toBeInTheDocument();
    expect(screen.queryByTestId("winner-overlay")).not.toBeInTheDocument();
    expect(screen.queryByText("MATCH!")).not.toBeInTheDocument();
    expect(audioController.stopAll).toHaveBeenCalled();
    expect(audioController.playWinner).toHaveBeenCalled();
    expect(audioController.startDeceleration).not.toHaveBeenCalled();
  });

  it("starts spinning without a ready countdown", () => {
    const audioController: AudioController = {
      unlock: vi.fn(async () => undefined),
      startRoulette: vi.fn(async () => undefined),
      startDeceleration: vi.fn(async () => undefined),
      playWinner: vi.fn(async () => undefined),
      stopAll: vi.fn()
    };

    render(<RouletteScreen initialState={state({ phase: "idle" })} audioController={audioController} />);
    fireEvent.click(screen.getByRole("button", { name: "START" }));

    expect(screen.getByRole("button", { name: "STOP" })).toBeInTheDocument();
    expect(screen.queryByText("3 → 2 → 1 → START!!")).not.toBeInTheDocument();
  });

  it("shows NEXT in winner and no start control in complete", () => {
    const { rerender } = render(
      <RouletteScreen initialState={state({ phase: "winner", currentKeychainId: "keychain-01" })} />
    );
    expect(screen.getByRole("button", { name: "NEXT" })).toBeInTheDocument();
    rerender(<RouletteScreen initialState={state({ phase: "complete" })} />);
    expect(screen.queryByTestId("winner-overlay")).not.toBeInTheDocument();
    expect(screen.queryByText("抽選終了")).not.toBeInTheDocument();
    expect(screen.queryByText("COMPLETE")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "START" })).not.toBeInTheDocument();
  });

  it("opens history from the MATCH RESULTS panel without a separate history button", () => {
    render(<RouletteScreen initialState={state({ phase: "idle", winnerIds: ["keychain-01"] })} />);
    expect(screen.queryByRole("button", { name: "当選者" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "当選者を表示" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("dialog")).toHaveAccessibleName("当選者");
    expect(screen.queryByText("History")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveClass("history-dialog--expanded");
    expect(screen.getByRole("img", { name: "1回目の当選画像" })).toHaveClass("history-dialog__image--inset");
    expect(screen.getByRole("button", { name: "当選者を閉じる" })).toHaveClass("history-dialog__close");
    expect(screen.getByTestId("history-close-icon")).toBeInTheDocument();
    expect(screen.queryByText("×")).not.toBeInTheDocument();
    expect(screen.queryByText("keychain-01")).not.toBeInTheDocument();
  });

  it("uses the icon-only retry control and removes the old stage marker", () => {
    render(<RouletteScreen initialState={state({ phase: "winner", currentKeychainId: "keychain-01" })} />);
    expect(screen.getByRole("button", { name: "RETRY" })).toHaveTextContent("↻");
    expect(screen.getByRole("button", { name: "RETRY" })).not.toHaveTextContent("RETRY");
    expect(screen.queryByText("›››")).not.toBeInTheDocument();
  });

  it("clears persisted history after confirming the hidden reset query", async () => {
    window.localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ winnerIds: ["keychain-01"], completed: false, savedAt: new Date().toISOString() }));
    window.history.pushState({}, "", "/roulette?reset=1");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <RouletteScreen
        assetState={{ ready: true, progress: 100, failedAssets: [] }}
        initialState={state({ phase: "complete", winnerIds: ["keychain-01"] })}
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "START" })).toBeInTheDocument());
    expect(window.localStorage.getItem(PERSISTENCE_KEY)).toBeNull();
    expect(window.location.search).toBe("");
    expect(window.location.pathname).toBe("/roulette");
    confirm.mockRestore();
    window.history.replaceState({}, "", "/roulette");
  });
});
