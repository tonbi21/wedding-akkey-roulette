import type { Keychain } from "../gameTypes";
import { secureRandomIndex } from "./random";

export function getAvailableKeychains(keychains: Keychain[], winnerIds: string[]): Keychain[] {
  const confirmedWinners = new Set(winnerIds);
  return keychains.filter((keychain) => !confirmedWinners.has(keychain.id));
}

export function selectWinner(keychains: Keychain[], winnerIds: string[]): Keychain {
  const availableKeychains = getAvailableKeychains(keychains, winnerIds);

  if (availableKeychains.length === 0) {
    throw new Error("No available keychains remain.");
  }

  return availableKeychains[secureRandomIndex(availableKeychains.length)];
}
