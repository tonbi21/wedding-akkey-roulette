"use client";

import { useEffect } from "react";
import { KEYCHAINS } from "../keychains";
import { secureRandomIndex } from "../lib/random";
import { DECELERATION_STEPS_MS, getNextCandidate, SPIN_INTERVAL_MS } from "../lib/timing";
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

  useEffect(() => {
    if (state.phase !== "decelerating" || state.pendingWinnerId === null) return;
    const candidates = KEYCHAINS.map((keychain) => keychain.id).filter(
      (id) => !state.winnerIds.includes(id) && id !== state.pendingWinnerId
    );
    let step = 0;
    let timer: number | undefined;
    const advance = () => {
      if (step >= DECELERATION_STEPS_MS.length) {
        dispatch({ type: "DECELERATION_COMPLETE" });
        return;
      }
      if (candidates.length > 0) {
        dispatch({
          type: "DISPLAY_KEYCHAIN",
          keychainId: getNextCandidate(candidates, state.currentKeychainId, secureRandomIndex)
        });
      }
      timer = window.setTimeout(() => {
        step += 1;
        advance();
      }, DECELERATION_STEPS_MS[step]);
    };
    advance();
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [dispatch, state.currentKeychainId, state.pendingWinnerId, state.phase, state.winnerIds]);
}
