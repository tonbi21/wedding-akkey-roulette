import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { KEYCHAINS } from "./keychains";
import { IMAGE_ASSETS } from "./lib/assets";
import { selectWinner } from "./lib/roulette";

describe("final keychain catalog", () => {
  it("contains exactly the 48 numbered final PNGs, each with distinct image data", () => {
    expect(KEYCHAINS).toHaveLength(48);
    expect(new Set(KEYCHAINS.map(({ id }) => id)).size).toBe(48);
    expect(readdirSync("public/assets/keychains").filter((name) => name.endsWith(".png"))).toHaveLength(48);
    const hashes = KEYCHAINS.map(({ id, imageSrc }, index) => {
      const number = String(index + 1).padStart(2, "0");
      expect(id).toBe(`keychain-${number}`);
      expect(imageSrc).toBe(`/assets/keychains/keychain-${number}.png`);
      const data = readFileSync(`public${imageSrc}`);
      expect(data.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(data.readUInt32BE(16)).toBeGreaterThan(0);
      expect(data.readUInt32BE(20)).toBeGreaterThan(0);
      return createHash("sha256").update(data).digest("hex");
    });
    expect(new Set(hashes).size).toBe(48);
  });

  it("preloads and precaches the same final 48 designs", () => {
    const source = readFileSync("public/sw.js", "utf8");
    const urls = runInNewContext(`${source}\nPRECACHE_URLS;`, {
      self: { addEventListener: vi.fn() }
    }) as string[];
    expect(IMAGE_ASSETS).toEqual(KEYCHAINS.map(({ imageSrc }) => imageSrc));
    expect(urls.filter((url) => url.startsWith("/assets/keychains/"))).toEqual(IMAGE_ASSETS);
  });

  it("can select every one of the 48 designs", () => {
    const random = vi.spyOn(globalThis.crypto, "getRandomValues");
    KEYCHAINS.forEach((keychain, index) => {
      random.mockImplementation((array) => {
        (array as Uint32Array)[0] = index;
        return array;
      });
      expect(selectWinner(KEYCHAINS, [])).toEqual(keychain);
    });
  });
});
