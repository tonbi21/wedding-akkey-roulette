import { describe, expect, it, vi } from "vitest";
import { createAudioController, type AudioElementLike } from "./useAudioController";

const createFakeAudio = () => {
  const audio: AudioElementLike = {
    currentTime: 0,
    loop: false,
    muted: false,
    paused: true,
    volume: 1,
    load: vi.fn(),
    pause: vi.fn(() => { audio.paused = true; }),
    play: vi.fn(async () => { audio.paused = false; })
  };
  return audio;
};

describe("createAudioController", () => {
  it("can be created during server rendering without Audio", () => {
    vi.stubGlobal("Audio", undefined);
    expect(() => createAudioController({
      roulette: "/roulette.mp3",
      deceleration: "/deceleration.mp3",
      winner: "/winner.mp3"
    })).not.toThrow();
    vi.unstubAllGlobals();
  });

  it("unlocks audio and starts the expected tracks", async () => {
    const audios = new Map<string, AudioElementLike>();
    const controller = createAudioController(
      { roulette: "/roulette.mp3", deceleration: "/deceleration.mp3", winner: "/winner.mp3" },
      (src) => { const audio = createFakeAudio(); audio.src = src; audios.set(src, audio); return audio; }
    );

    await controller.unlock();
    await controller.startRoulette();

    expect(audios.get("/roulette.mp3")?.play).toHaveBeenCalled();
    expect(audios.get("/roulette.mp3")?.loop).toBe(true);
    expect("startWaiting" in controller).toBe(false);
    expect("stopWaiting" in controller).toBe(false);
  });

  it("stops and resets every audio element", () => {
    const audio = createFakeAudio();
    audio.src = "/winner.mp3";
    const controller = createAudioController(
      { roulette: "/roulette.mp3", deceleration: "/deceleration.mp3", winner: "/winner.mp3" },
      () => audio
    );

    controller.stopAll();

    expect(audio.pause).toHaveBeenCalled();
    expect(audio.currentTime).toBe(0);
    expect(audio.src).toBe("/winner.mp3");
    expect(audio.load).not.toHaveBeenCalled();
  });

  it("does not reject when a browser cannot play an audio source", async () => {
    const audio = createFakeAudio();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    audio.play = vi.fn(async () => {
      throw new DOMException("The element has no supported sources.", "NotSupportedError");
    });
    const controller = createAudioController(
      { roulette: "/roulette.mp3", deceleration: "/deceleration.mp3", winner: "/winner.mp3" },
      () => audio
    );

    await expect(controller.startRoulette()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith("Audio playback failed for roulette", expect.any(DOMException));
    warn.mockRestore();
  });

  it("does not reload audio elements while unlocking audio", async () => {
    const audio = createFakeAudio();
    const controller = createAudioController(
      { roulette: "/roulette.mp3", deceleration: "/deceleration.mp3", winner: "/winner.mp3" },
      () => audio
    );

    await controller.unlock();

    expect(audio.play).not.toHaveBeenCalled();
    expect(audio.load).not.toHaveBeenCalled();
  });
});
