import { webcrypto } from "node:crypto";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto
  });
}

if (typeof HTMLMediaElement !== "undefined") {
  HTMLMediaElement.prototype.load = vi.fn();
  HTMLMediaElement.prototype.pause = vi.fn();
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
