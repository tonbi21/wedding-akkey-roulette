import { render, screen } from "@testing-library/react";
import confetti from "canvas-confetti";
import { describe, expect, it, vi } from "vitest";
import { WinnerOverlay } from "./WinnerOverlay";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

describe("WinnerOverlay", () => {
  it("shows winner copy and celebration hooks", () => {
    render(<WinnerOverlay />);
    expect(screen.getByText("当たり")).toBeInTheDocument();
    expect(screen.queryByText("WINNER!")).not.toBeInTheDocument();
    expect(screen.getByTestId("winner-overlay")).toHaveClass(
      "winner-overlay",
      "winner-overlay--celebration",
      "winner-overlay--bottom"
    );
    expect(confetti).toHaveBeenCalledWith(expect.objectContaining({ particleCount: 120 }));
  });
});
