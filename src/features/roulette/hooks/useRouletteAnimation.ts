"use client";

import { useEffect } from "react";
import { KEYCHAINS } from "../keychains";
import { secureRandomIndex } from "../lib/random";
import { getNextCandidate, SPIN_INTERVAL_MS } from "../lib/timing";
import type { GameAction, GameState } from "../gameTypes";

type AnimationProps = { state: GameState; dispatch: (action: GameAction) => void };

export function useRouletteAnimation({ state, dispatch }: AnimationProps): void {
  useEffect(() => {
    if (state.phase !== "spinning") return;
    const candidates = KEYCHAINS.map((keychain) => keychain.id).filter(
      (id) => !state.winnerIds.includes(id)
    );
    const timer = window.setInterval(() => {
      const current = state.currentKeychainId;
      const next = getNextCandidate(candidates, current, secureRandomIndex);
      dispatch({ type: "DISPLAY_KEYCHAIN", keychainId: next });
    }, SPIN_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [dispatch, state.currentKeychainId, state.phase, state.winnerIds]);
}
