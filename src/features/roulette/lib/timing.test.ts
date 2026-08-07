import { describe, expect, it } from "vitest";
import { DECELERATION_STEPS_MS, SPIN_INTERVAL_MS, getNextCandidate } from "./timing";

describe("roulette timing", () => {
  it("uses the specified spin interval and deceleration schedule", () => {
    expect(SPIN_INTERVAL_MS).toBe(75);
    expect(DECELERATION_STEPS_MS).toEqual([90, 110, 140, 180, 230, 300, 390, 500, 650]);
  });

  it("does not repeat the current candidate", () => {
    expect(getNextCandidate(["a", "b"], "a", () => 0)).toBe("b");
  });
});
