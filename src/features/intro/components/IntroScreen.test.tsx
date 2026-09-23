import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IntroScreen } from "./IntroScreen";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push })
}));

describe("IntroScreen", () => {
  it("keeps the completed hero video visible behind the supplied start image", () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<IntroScreen />);
    fireEvent.click(screen.getByRole("button", { name: "TAP TO START" }));
    const video = screen.getByTestId("hero-video");
    expect(screen.queryByRole("button", { name: "GAME START" })).not.toBeInTheDocument();
    fireEvent.ended(video);
    const start = screen.getByRole("button", { name: "GAME START" });
    expect(screen.getByTestId("hero-video")).toBeInTheDocument();
    expect(start.querySelector("img")).toHaveAttribute("src", "/media/game-start.png");
  });

  it("starts the hero video and BGM together after TAP TO START", () => {
    render(<IntroScreen />);
    const video = screen.getByTestId("hero-video") as HTMLVideoElement;
    const audio = screen.getByTestId("intro-audio") as HTMLAudioElement;
    const videoPlay = vi.spyOn(video, "play").mockResolvedValue(undefined);
    const audioPlay = vi.spyOn(audio, "play").mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole("button", { name: "TAP TO START" }));

    expect(videoPlay).toHaveBeenCalledOnce();
    expect(audioPlay).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "TAP TO START" })).not.toBeInTheDocument();
  });

  it("stops the BGM when the hero video ends", () => {
    render(<IntroScreen />);
    const video = screen.getByTestId("hero-video") as HTMLVideoElement;
    const audio = screen.getByTestId("intro-audio") as HTMLAudioElement;
    vi.spyOn(video, "play").mockResolvedValue(undefined);
    vi.spyOn(audio, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(audio, "pause").mockImplementation(() => undefined);

    fireEvent.click(screen.getByRole("button", { name: "TAP TO START" }));
    fireEvent.ended(video);

    expect(pause).toHaveBeenCalledOnce();
  });

  it.each(["error", "autoplay rejection"])("reveals GAME START after %s", async (reason) => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    play.mockImplementation(() => reason === "autoplay rejection" ? Promise.reject(new Error("blocked")) : Promise.resolve());
    render(<IntroScreen />);
    fireEvent.click(screen.getByRole("button", { name: "TAP TO START" }));
    if (reason === "error") fireEvent.error(screen.getByTestId("hero-video"));
    await waitFor(() => expect(screen.getByRole("button", { name: "GAME START" })).toBeInTheDocument());
  });

  it("pushes to the roulette route only once", () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<IntroScreen />);
    fireEvent.click(screen.getByRole("button", { name: "TAP TO START" }));
    fireEvent.ended(screen.getByTestId("hero-video"));
    const start = screen.getByRole("button", { name: "GAME START" });
    fireEvent.click(start);
    fireEvent.click(start);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/roulette");
  });
});
