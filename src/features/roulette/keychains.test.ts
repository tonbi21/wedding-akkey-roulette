import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { KEYCHAINS } from "./keychains";
import { IMAGE_ASSETS } from "./lib/assets";
import { selectWinner } from "./lib/roulette";

const INCLUDED_KEYCHAIN_NUMBERS = [
  1, 2, 3, 4, 6, 8, 9, 10, 11, 12, 14, 15, 17, 18, 21, 22, 23, 24, 25, 26, 27,
  29, 31, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 47, 48
];

describe("final keychain catalog", () => {
  it("contains exactly the 36 eligible numbered PNGs, each with distinct image data", () => {
    expect(KEYCHAINS).toHaveLength(36);
    expect(new Set(KEYCHAINS.map(({ id }) => id)).size).toBe(36);
    expect(readdirSync("public/assets/keychains").filter((name) => name.endsWith(".png"))).toHaveLength(48);
    const hashes = KEYCHAINS.map(({ id, imageSrc }, index) => {
      const number = String(INCLUDED_KEYCHAIN_NUMBERS[index]).padStart(2, "0");
      expect(id).toBe(`keychain-${number}`);
      expect(imageSrc).toBe(`/assets/keychains/keychain-${number}.png`);
      const data = readFileSync(`public${imageSrc}`);
      expect(data.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(data.readUInt32BE(16)).toBeGreaterThan(0);
      expect(data.readUInt32BE(20)).toBeGreaterThan(0);
      return createHash("sha256").update(data).digest("hex");
    });
    expect(new Set(hashes).size).toBe(36);
  });

  it("does not include the 12 excluded keychains", () => {
    const excludedIds = [5, 7, 13, 16, 19, 20, 28, 30, 32, 38, 45, 46]
      .map((number) => `keychain-${String(number).padStart(2, "0")}`);

    expect(KEYCHAINS.map(({ id }) => id)).not.toEqual(expect.arrayContaining(excludedIds));
  });

  it("preloads and precaches the same final 36 designs", () => {
    const source = readFileSync("public/sw.js", "utf8");
    const urls = runInNewContext(`${source}\nPRECACHE_URLS;`, {
      self: { addEventListener: vi.fn() }
    }) as string[];
    expect(IMAGE_ASSETS).toEqual(KEYCHAINS.map(({ imageSrc }) => imageSrc));
    expect(urls.filter((url) => url.startsWith("/assets/keychains/"))).toEqual(IMAGE_ASSETS);
  });

  it("can select every one of the 36 designs", () => {
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
