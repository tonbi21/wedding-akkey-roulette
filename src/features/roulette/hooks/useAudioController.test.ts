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
      waiting: "/waiting.mp3",
      roulette: "/roulette.mp3",
      deceleration: "/deceleration.mp3",
      winner: "/winner.mp3"
    })).not.toThrow();
    vi.unstubAllGlobals();
  });

  it("unlocks audio and starts/stops the expected tracks", async () => {
    const audios = new Map<string, AudioElementLike>();
    const controller = createAudioController(
      { waiting: "/waiting.mp3", roulette: "/roulette.mp3", deceleration: "/deceleration.mp3", winner: "/winner.mp3" },
      (src) => { const audio = createFakeAudio(); audio.src = src; audios.set(src, audio); return audio; }
    );

    await controller.unlock();
    await controller.startWaiting();
    await controller.startRoulette();

    expect(audios.get("/waiting.mp3")?.pause).toHaveBeenCalled();
    expect(audios.get("/roulette.mp3")?.play).toHaveBeenCalled();
  });

  it("stops and resets every audio element", () => {
    const audio = createFakeAudio();
    const controller = createAudioController(
      { waiting: "/waiting.mp3", roulette: "/roulette.mp3", deceleration: "/deceleration.mp3", winner: "/winner.mp3" },
      () => audio
    );

    controller.stopAll();

    expect(audio.pause).toHaveBeenCalled();
    expect(audio.currentTime).toBe(0);
    expect(audio.src).toBe("");
    expect(audio.load).toHaveBeenCalled();
  });

  it("does not reject when a browser cannot play an audio source", async () => {
    const audio = createFakeAudio();
    audio.play = vi.fn(async () => {
      throw new DOMException("The element has no supported sources.", "NotSupportedError");
    });
    const controller = createAudioController(
      { waiting: "/waiting.mp3", roulette: "/roulette.mp3", deceleration: "/deceleration.mp3", winner: "/winner.mp3" },
      () => audio
    );

    await expect(controller.startRoulette()).resolves.toBeUndefined();
  });
});
