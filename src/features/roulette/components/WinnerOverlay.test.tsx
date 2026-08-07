import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WinnerOverlay } from "./WinnerOverlay";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

describe("WinnerOverlay", () => {
  it("shows winner copy and celebration hooks", () => {
    render(<WinnerOverlay />);
    expect(screen.getByText("WINNER!")).toBeInTheDocument();
    expect(screen.getByTestId("winner-overlay")).toHaveClass("winner-overlay");
  });
});
