import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { initialGameState } from "../state/gameReducer";
import type { GameState } from "../gameTypes";
import { RouletteScreen } from "./RouletteScreen";

const state = (overrides: Partial<GameState>): GameState => ({ ...initialGameState, ...overrides });

describe("RouletteScreen", () => {
  it("shows ENTER when the game is ready", () => {
    render(<RouletteScreen initialState={state({ phase: "ready", assetsReady: true })} />);
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

  it("shows NEXT in winner and no start control in complete", () => {
    const { rerender } = render(
      <RouletteScreen initialState={state({ phase: "winner", currentKeychainId: "keychain-01" })} />
    );
    expect(screen.getByRole("button", { name: "NEXT" })).toBeInTheDocument();
    rerender(<RouletteScreen initialState={state({ phase: "complete" })} />);
    expect(screen.getByText("抽選終了")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "START" })).not.toBeInTheDocument();
  });

  it("opens history with images only", () => {
    render(<RouletteScreen initialState={state({ phase: "idle", winnerIds: ["keychain-01"] })} />);
    fireEvent.click(screen.getByRole("button", { name: /history/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "1回目の当選画像" })).toBeInTheDocument();
    expect(screen.queryByText("keychain-01")).not.toBeInTheDocument();
  });
});
