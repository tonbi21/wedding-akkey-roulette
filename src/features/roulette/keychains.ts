import { KEYCHAIN_COUNT, KEYCHAIN_IMAGE_BASE_PATH } from "./config";
import type { Keychain } from "./gameTypes";

const toPaddedIndex = (index: number): string => String(index).padStart(2, "0");

export const KEYCHAINS: Keychain[] = Array.from({ length: KEYCHAIN_COUNT }, (_, index) => {
  const number = index + 1;
  const padded = toPaddedIndex(number);

  return {
    id: `keychain-${padded}`,
    imageSrc: `${KEYCHAIN_IMAGE_BASE_PATH}/keychain-${padded}.png`
  };
});
