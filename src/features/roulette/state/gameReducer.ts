import type { GameAction, GameState } from "../gameTypes";

export const initialGameState: GameState = {
  phase: "boot",
  round: 1,
  currentKeychainId: null,
  pendingWinnerId: null,
  winnerIds: [],
  assetsReady: false
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "ASSETS_READY":
      if (state.phase !== "boot") {
        return state;
      }

      return {
        ...state,
        phase: "ready",
        assetsReady: true
      };

    case "ASSETS_FAILED":
      return {
        ...state,
        phase: "error",
        assetsReady: false
      };

    case "ENTER":
      if (state.phase !== "ready") {
        return state;
      }

      return {
        ...state,
        phase: "idle"
      };

    case "START":
      if (state.phase !== "idle") {
        return state;
      }

      return {
        ...state,
        phase: "spinning"
      };

    case "DISPLAY_KEYCHAIN":
      if (state.phase !== "spinning") {
        return state;
      }

      return { ...state, currentKeychainId: action.keychainId };

    case "STOP":
      if (state.phase !== "spinning" || state.pendingWinnerId !== null) {
        return state;
      }

      return {
        ...state,
        phase: "winner",
        currentKeychainId: action.winnerId,
        pendingWinnerId: null,
        winnerIds: state.winnerIds.includes(action.winnerId)
          ? state.winnerIds
          : [...state.winnerIds, action.winnerId]
      };

    case "NEXT":
      if (state.phase !== "winner") {
        return state;
      }

      if (state.round === 3) {
        return {
          ...state,
          phase: "complete"
        };
      }

      return {
        ...initialGameState,
        phase: "idle",
        round: (state.round + 1) as GameState["round"],
        winnerIds: state.winnerIds,
        assetsReady: state.assetsReady
      };

    case "RESET":
      return initialGameState;
  }
};
