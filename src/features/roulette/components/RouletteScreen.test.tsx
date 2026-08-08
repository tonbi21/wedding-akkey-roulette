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
  it("shows ENTER when the game is ready", () => {
    render(<RouletteScreen initialState={state({ phase: "ready", assetsReady: true })} />);
    expect(screen.getByRole("heading", { name: "Akkey Roulette" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ENTER" })).toBeInTheDocument();
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

  it("shows the selected product and winner overlay after stopping", () => {
    const audioController: AudioController = {
      unlock: vi.fn(async () => undefined),
      startWaiting: vi.fn(async () => undefined),
      stopWaiting: vi.fn(async () => undefined),
      startRoulette: vi.fn(async () => undefined),
      startDeceleration: vi.fn(async () => undefined),
      playWinner: vi.fn(async () => undefined),
      stopAll: vi.fn()
    };

    render(<RouletteScreen initialState={state({ phase: "spinning" })} audioController={audioController} />);
    fireEvent.click(screen.getByRole("button", { name: "STOP" }));

    expect(screen.getByRole("button", { name: "NEXT" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Current roulette image" })).toBeInTheDocument();
    expect(screen.getByTestId("winner-overlay")).toBeInTheDocument();
    expect(audioController.stopAll).toHaveBeenCalled();
    expect(audioController.playWinner).toHaveBeenCalled();
    expect(audioController.startDeceleration).not.toHaveBeenCalled();
  });

  it("starts spinning without a ready countdown", () => {
    const audioController: AudioController = {
      unlock: vi.fn(async () => undefined),
      startWaiting: vi.fn(async () => undefined),
      stopWaiting: vi.fn(async () => undefined),
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

  it("opens history with images only", () => {
    render(<RouletteScreen initialState={state({ phase: "idle", winnerIds: ["keychain-01"] })} />);
    expect(screen.getByRole("button", { name: "履歴" })).toHaveTextContent("履歴");
    fireEvent.click(screen.getByRole("button", { name: "履歴" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("dialog")).toHaveAccessibleName("履歴");
    expect(screen.queryByText("History")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveClass("history-dialog--expanded");
    expect(screen.getByRole("img", { name: "1回目の当選画像" })).toHaveClass("history-dialog__image--inset");
    expect(screen.getByRole("button", { name: "履歴を閉じる" })).toHaveClass("history-dialog__close");
    expect(screen.getByTestId("history-close-icon")).toBeInTheDocument();
    expect(screen.queryByText("×")).not.toBeInTheDocument();
    expect(screen.queryByText("keychain-01")).not.toBeInTheDocument();
  });

  it("clears persisted history after confirming the hidden reset query", async () => {
    window.localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ winnerIds: ["keychain-01"], completed: false, savedAt: new Date().toISOString() }));
    window.history.pushState({}, "", "/?reset=1");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <RouletteScreen
        assetState={{ ready: true, progress: 100, failedAssets: [] }}
        initialState={state({ phase: "complete", winnerIds: ["keychain-01"] })}
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "ENTER" })).toBeInTheDocument());
    expect(window.localStorage.getItem(PERSISTENCE_KEY)).toBeNull();
    expect(window.location.search).toBe("");
    confirm.mockRestore();
    window.history.replaceState({}, "", "/");
  });
});
