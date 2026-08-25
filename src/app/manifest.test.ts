import manifest from "./manifest";
import { describe, expect, it } from "vitest";

describe("PWA manifest", () => {
  it("declares an installable landscape app with local icons", () => {
    expect(manifest()).toMatchObject({
      name: "Wedding Lucky Draw",
      short_name: "Lucky Draw",
      display: "standalone",
      orientation: "landscape",
      start_url: "/"
    });
    expect(manifest().icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icons/icon-192.svg" }),
        expect.objectContaining({ src: "/icons/icon-512.svg" })
      ])
    );
  });
});
