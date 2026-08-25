const MAX_UINT32_EXCLUSIVE = 2 ** 32;

export function secureRandomIndex(length: number): number {
  if (!Number.isInteger(length) || length <= 0) {
    throw new RangeError("length must be a positive integer");
  }

  const crypto = globalThis.crypto;
  if (!crypto?.getRandomValues) {
    throw new Error("Web Crypto API is unavailable.");
  }

  const limit = Math.floor(MAX_UINT32_EXCLUSIVE / length) * length;
  const buffer = new Uint32Array(1);

  while (true) {
    crypto.getRandomValues(buffer);
    const sample = buffer[0];

    if (sample < limit) {
      return sample % length;
    }
  }
}
