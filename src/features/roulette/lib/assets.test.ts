import { describe, expect, it } from "vitest";
import { AUDIO_ASSETS, preloadAssets } from "./assets";

type FakeAsset = {
  src: string;
  decode?: () => Promise<void>;
  load: () => void;
};

const factory = (failures: Set<string> = new Set()) => (src: string): FakeAsset => ({
  src,
  decode: async () => {
    if (failures.has(src)) throw new Error(`failed: ${src}`);
  },
  load: () => undefined
});

describe("preloadAssets", () => {
  it("uses the long drum roll for roulette playback", () => {
    expect(AUDIO_ASSETS.roulette).toBe("/audio/percussion_drumroll_90s.mp3?v6");
  });

  it("uses the half-second-trimmed winner cue with a refreshed cache key", () => {
    expect(AUDIO_ASSETS.winner).toBe("/audio/winner.mp3?v16");
  });

  it("reports progress after each asset settles", async () => {
    const progress: number[] = [];
    await preloadAssets(["image-a"], ["audio-a"], factory(), factory(), (state) => {
      progress.push(state.progress);
    });

    expect(progress).toEqual([50, 100]);
  });

  it("reports ready after every image and audio asset is decoded", async () => {
    await expect(preloadAssets(["image-a", "image-b"], ["audio-a"], factory(), factory()))
      .resolves.toEqual({ ready: true, progress: 100, failedAssets: [] });
  });

  it("reports every failed required asset and does not become ready", async () => {
    await expect(
      preloadAssets(["image-a"], ["audio-a"], factory(new Set(["image-a"])), factory(new Set(["audio-a"])))
    ).resolves.toEqual({ ready: false, progress: 100, failedAssets: ["image-a", "audio-a"] });
  });
});
