import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IntroScreen } from "./IntroScreen";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push })
}));

describe("IntroScreen", () => {
  it("reveals the supplied start image only after the hero video ends", () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<IntroScreen />);
    const video = screen.getByTestId("hero-video");
    expect(screen.queryByRole("button", { name: "GAME START" })).not.toBeInTheDocument();
    fireEvent.ended(video);
    const start = screen.getByRole("button", { name: "GAME START" });
    expect(start.querySelector("img")).toHaveAttribute("src", "/media/game-start.png");
  });

  it.each(["error", "autoplay rejection"])("reveals GAME START after %s", async (reason) => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    play.mockImplementation(() => reason === "autoplay rejection" ? Promise.reject(new Error("blocked")) : Promise.resolve());
    render(<IntroScreen />);
    if (reason === "error") fireEvent.error(screen.getByTestId("hero-video"));
    await waitFor(() => expect(screen.getByRole("button", { name: "GAME START" })).toBeInTheDocument());
  });

  it("pushes to the roulette route only once", () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<IntroScreen />);
    fireEvent.ended(screen.getByTestId("hero-video"));
    const start = screen.getByRole("button", { name: "GAME START" });
    fireEvent.click(start);
    fireEvent.click(start);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/roulette");
  });
});
