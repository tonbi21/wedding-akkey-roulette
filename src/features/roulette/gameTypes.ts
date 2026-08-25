export type Keychain = {
  id: string;
  imageSrc: string;
};

export type GamePhase =
  | "boot"
  | "ready"
  | "idle"
  | "spinning"
  | "winner"
  | "complete"
  | "error";

export type GameRound = 1 | 2 | 3;

export type GameState = {
  phase: GamePhase;
  round: GameRound;
  currentKeychainId: string | null;
  pendingWinnerId: string | null;
  winnerIds: string[];
  assetsReady: boolean;
};

export type GameAction =
  | { type: "ASSETS_READY" }
  | { type: "ASSETS_FAILED" }
  | { type: "ENTER" }
  | { type: "START" }
  | { type: "DISPLAY_KEYCHAIN"; keychainId: string }
  | { type: "STOP"; winnerId: string }
  | { type: "NEXT" }
  | { type: "RESET" };
