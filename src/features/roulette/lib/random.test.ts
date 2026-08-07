import { describe, expect, it, vi } from "vitest";
import { secureRandomIndex } from "./random";

describe("secureRandomIndex", () => {
  it("throws for non-positive lengths", () => {
    expect(() => secureRandomIndex(0)).toThrow(RangeError);
    expect(() => secureRandomIndex(-1)).toThrow(RangeError);
  });

  it("rejects out-of-range samples before returning an index", () => {
    const samples = [4294967295, 0];
    const getRandomValues = vi
      .spyOn(globalThis.crypto, "getRandomValues")
      .mockImplementation((array) => {
        const uint32Array = array as Uint32Array;
        uint32Array[0] = samples.shift() ?? 0;
        return array;
      });

    const result = secureRandomIndex(3);

    expect(result).toBe(0);
    expect(getRandomValues).toHaveBeenCalledTimes(2);
  });
});
