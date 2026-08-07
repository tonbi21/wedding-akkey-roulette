import { webcrypto } from "node:crypto";
import { afterEach, vi } from "vitest";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});
