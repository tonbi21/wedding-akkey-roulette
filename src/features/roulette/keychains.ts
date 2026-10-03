import { KEYCHAIN_COUNT, KEYCHAIN_IMAGE_BASE_PATH } from "./config";
import type { Keychain } from "./gameTypes";

const toPaddedIndex = (index: number): string => String(index).padStart(2, "0");

const EXCLUDED_KEYCHAIN_IDS = new Set([
  "keychain-05",
  "keychain-07",
  "keychain-13",
  "keychain-16",
  "keychain-19",
  "keychain-20",
  "keychain-28",
  "keychain-30",
  "keychain-32",
  "keychain-38",
  "keychain-46"
]);

export const KEYCHAINS: Keychain[] = Array.from({ length: KEYCHAIN_COUNT }, (_, index) => {
  const number = index + 1;
  const padded = toPaddedIndex(number);

  return {
    id: `keychain-${padded}`,
    imageSrc: `${KEYCHAIN_IMAGE_BASE_PATH}/keychain-${padded}.png`
  };
}).filter((keychain) => !EXCLUDED_KEYCHAIN_IDS.has(keychain.id));
