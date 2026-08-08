import { describe, expect, it } from "vitest";
import { SPIN_INTERVAL_MS, getNextCandidate } from "./timing";

describe("roulette timing", () => {
  it("uses the specified spin interval", () => {
    expect(SPIN_INTERVAL_MS).toBe(75);
  });

  it("does not repeat the current candidate", () => {
    expect(getNextCandidate(["a", "b"], "a", () => 0)).toBe("b");
  });
});
