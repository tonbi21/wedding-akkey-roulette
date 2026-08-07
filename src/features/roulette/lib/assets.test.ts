import { describe, expect, it } from "vitest";
import { preloadAssets } from "./assets";

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
  it("reports ready after every image and audio asset is decoded", async () => {
    await expect(preloadAssets(["image-a", "image-b"], ["audio-a"], factory(), factory()))
      .resolves.toEqual({ ready: true, progress: 100, failedAssets: [] });
  });

  it("reports every failed required asset and does not become ready", async () => {
    await expect(
      preloadAssets(["image-a"], ["audio-a"], factory(new Set(["image-a"])), factory(new Set(["audio-a"])))
    ).resolves.toEqual({ ready: false, progress: 0, failedAssets: ["image-a", "audio-a"] });
  });
});
