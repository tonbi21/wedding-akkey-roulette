"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KEYCHAINS } from "../keychains";
import { type AssetLoadState } from "../lib/assets";
import { AUDIO_ASSETS } from "../lib/assets";
import { getRestoredPhase, getRestoredRound, loadGameState, PERSISTENCE_KEY, saveGameState } from "../lib/persistence";
import { useAssetPreloader } from "../hooks/useAssetPreloader";
import { useAudioController, type AudioController } from "../hooks/useAudioController";
import { useRouletteAnimation } from "../hooks/useRouletteAnimation";
import type { GameAction, GameState, Keychain } from "../gameTypes";
import { gameReducer, initialGameState } from "../state/gameReducer";
import { CountdownOverlay } from "./CountdownOverlay";
import { HistoryDialog } from "./HistoryDialog";
import { RouletteImage } from "./RouletteImage";
import { StartButton } from "./StartButton";
import { StopButton } from "./StopButton";
import { WinnerOverlay } from "./WinnerOverlay";

const keychainMap = new Map(KEYCHAINS.map((keychain) => [keychain.id, keychain]));

type ResolveWinnerId = (availableIds: string[], state: GameState) => string;

export type RouletteScreenProps = {
  assetState?: AssetLoadState;
  audioController?: AudioController;
  initialState?: GameState;
  resolveWinnerId?: ResolveWinnerId;
};

const defaultResolveWinnerId: ResolveWinnerId = (availableIds) => availableIds[0] ?? KEYCHAINS[0].id;

const getVisibleKeychain = (state: GameState): Keychain => {
  if (state.currentKeychainId) {
    return keychainMap.get(state.currentKeychainId) ?? KEYCHAINS[0];
  }

  return KEYCHAINS.find((keychain) => !state.winnerIds.includes(keychain.id)) ?? KEYCHAINS[0];
};

const getHistoryKeychains = (winnerIds: string[]): Keychain[] =>
  winnerIds
    .map((winnerId) => keychainMap.get(winnerId))
    .filter((winner): winner is Keychain => winner !== undefined);

export function RouletteScreen({
  assetState,
  audioController,
  initialState,
  resolveWinnerId = defaultResolveWinnerId
}: RouletteScreenProps) {
  const internalAssetState = useAssetPreloader(assetState === undefined && initialState === undefined);
  const activeAssetState = assetState ?? internalAssetState;
  const internalAudioController = useAudioController(AUDIO_ASSETS);
  const activeAudioController = audioController ?? internalAudioController;

  const [state, setState] = useState<GameState>(initialState ?? initialGameState);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [persistenceWarning, setPersistenceWarning] = useState(false);
  const resetRequestedRef = useRef(false);

  const dispatch = useCallback((action: GameAction) => {
    setState((currentState) => gameReducer(currentState, action));
  }, []);

  useRouletteAnimation({ dispatch, state });

  useEffect(() => {
    if (initialState) {
      setState(initialState);
    }
  }, [initialState]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (url.searchParams.get("reset") !== "1") return;

    if (window.confirm("抽選履歴を削除して、最初からやり直しますか？")) {
      try {
        resetRequestedRef.current = true;
        window.localStorage.removeItem(PERSISTENCE_KEY);
        setState(initialGameState);
        setPersistenceWarning(false);
      } catch {
        setPersistenceWarning(true);
      }
    }

    url.searchParams.delete("reset");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (state.phase !== "boot") {
      return;
    }

    if (activeAssetState.ready) {
      if (typeof window !== "undefined" && !initialState) {
        const persisted = loadGameState(window.localStorage);
        if (persisted) {
          setState({
            ...initialGameState,
            phase: getRestoredPhase(persisted.winnerIds, persisted.completed),
            round: getRestoredRound(persisted.winnerIds),
            winnerIds: persisted.winnerIds,
            assetsReady: true
          });
          return;
        }
      }
      dispatch({ type: "ASSETS_READY" });
      return;
    }

    if (activeAssetState.failedAssets.length > 0) {
      dispatch({ type: "ASSETS_FAILED" });
    }
  }, [activeAssetState.failedAssets.length, activeAssetState.ready, state.phase]);

  useEffect(() => {
    if (state.winnerIds.length === 0 || typeof window === "undefined") return;
    if (resetRequestedRef.current) {
      resetRequestedRef.current = false;
      return;
    }
    const result = saveGameState(window.localStorage, state.winnerIds, state.winnerIds.length === 3);
    setPersistenceWarning(!result.ok);
  }, [state.winnerIds]);

  useEffect(() => {
    if (state.phase !== "countdown") {
      return;
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: "COUNTDOWN_COMPLETE" });
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state.phase]);

  const visibleKeychain = useMemo(() => getVisibleKeychain(state), [state]);
  const historyKeychains = useMemo(() => getHistoryKeychains(state.winnerIds), [state.winnerIds]);

  const handleEnter = () => {
    if (state.phase !== "ready") return;
    dispatch({ type: "ENTER" });
    void activeAudioController.unlock();
    void activeAudioController.startWaiting();
  };

  const handleStart = () => {
    if (state.phase !== "idle") return;
    dispatch({ type: "START" });
    void activeAudioController.stopWaiting();
    void activeAudioController.startRoulette();
  };

  const handleStop = () => {
    if (state.phase !== "spinning") return;
    const availableIds = KEYCHAINS
      .map((keychain) => keychain.id)
      .filter((keychainId) => !state.winnerIds.includes(keychainId));
    const winnerId = resolveWinnerId(availableIds, state);

    dispatch({ type: "STOP", winnerId });
    activeAudioController.stopAll();
  };

  const handleNext = () => {
    if (state.phase !== "winner") return;
    dispatch({ type: "NEXT" });
    if (state.round === 3) {
      void activeAudioController.playWinner();
    } else {
      void activeAudioController.startWaiting();
    }

  };

  return (
    <main className="roulette-shell" data-phase={state.phase} data-winner-count={state.winnerIds.length}>
      <section className="roulette-card">
        <header className="roulette-header">
          <p className="roulette-header__eyebrow">Wedding Lucky Draw</p>
          <h1 className="roulette-header__title">Akkey Roulette</h1>
        </header>

        <div className="roulette-stage">
          <RouletteImage
            alt="Current roulette image"
            className="roulette-stage__image"
            keychain={visibleKeychain}
          />
          {state.phase === "countdown" ? <CountdownOverlay /> : null}
          {state.phase === "winner" ? <WinnerOverlay /> : null}
          {state.phase === "complete" ? <WinnerOverlay complete /> : null}
        </div>

        {state.phase === "boot" ? (
          <p className="roulette-status">読み込み中 / Loading</p>
        ) : null}
        {state.phase === "error" ? (
          <p className="roulette-status roulette-status--error" role="alert">
            読み込みエラー / Loading error
          </p>
        ) : null}
        {persistenceWarning ? <p className="roulette-status roulette-status--error">履歴を保存できません。ページを閉じないでください。</p> : null}

        <div className="roulette-controls">
          {state.phase === "ready" ? (
            <button className="roulette-button roulette-button--primary" onClick={() => { void handleEnter(); }} type="button">
              ENTER
            </button>
          ) : null}
          {state.phase === "idle" ? <StartButton onClick={() => { void handleStart(); }} /> : null}
          {state.phase === "spinning" ? <StopButton onClick={() => { void handleStop(); }} /> : null}
          {state.phase === "winner" ? (
            <button className="roulette-button roulette-button--secondary" onClick={() => { void handleNext(); }} type="button">
              NEXT
            </button>
          ) : null}
        </div>
      </section>

      <HistoryDialog
        onClose={() => setHistoryOpen(false)}
        onOpen={() => setHistoryOpen(true)}
        open={historyOpen}
        winners={historyKeychains}
      />
    </main>
  );
}
