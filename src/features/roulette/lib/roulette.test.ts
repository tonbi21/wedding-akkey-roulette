import { describe, expect, it, vi } from "vitest";
import { getAvailableKeychains, selectWinner } from "./roulette";
import type { Keychain } from "../gameTypes";

const keychains: Keychain[] = [
  { id: "keychain-01", imageSrc: "/assets/keychains/keychain-01.png" },
  { id: "keychain-02", imageSrc: "/assets/keychains/keychain-02.png" },
  { id: "keychain-03", imageSrc: "/assets/keychains/keychain-03.png" }
];

describe("getAvailableKeychains", () => {
  it("returns a new array without confirmed winners", () => {
    const winners = ["keychain-02"];

    const available = getAvailableKeychains(keychains, winners);

    expect(available).toEqual([keychains[0], keychains[2]]);
    expect(available).not.toBe(keychains);
    expect(keychains).toHaveLength(3);
  });
});

describe("selectWinner", () => {
  it("throws when no candidates remain", () => {
    expect(() => selectWinner(keychains, keychains.map((keychain) => keychain.id))).toThrow(
      /no available keychains/i
    );
  });

  it("selects an available candidate from the remaining pool", () => {
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation((array) => {
      const uint32Array = array as Uint32Array;
      uint32Array[0] = 0;
      return array;
    });

    const winner = selectWinner(keychains, ["keychain-02"]);

    expect(winner).toEqual(keychains[0]);
  });

  it("returns the only remaining candidate", () => {
    expect(selectWinner(keychains, ["keychain-01", "keychain-02"])).toEqual(keychains[2]);
  });
});
