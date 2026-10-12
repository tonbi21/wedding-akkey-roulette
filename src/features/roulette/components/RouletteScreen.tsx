"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KEYCHAINS } from "../keychains";
import { type AssetLoadState } from "../lib/assets";
import { AUDIO_ASSETS } from "../lib/assets";
import { selectWinner } from "../lib/roulette";
import { getRestoredPhase, getRestoredRound, loadGameState, PERSISTENCE_KEY, saveGameState } from "../lib/persistence";
import { useAssetPreloader } from "../hooks/useAssetPreloader";
import { useAudioController, type AudioController } from "../hooks/useAudioController";
import { useRouletteAnimation } from "../hooks/useRouletteAnimation";
import type { GameAction, GameState, Keychain } from "../gameTypes";
import { gameReducer, initialGameState } from "../state/gameReducer";
import { HistoryDialog } from "./HistoryDialog";
import { RouletteImage } from "./RouletteImage";

const keychainMap = new Map(KEYCHAINS.map((keychain) => [keychain.id, keychain]));

type ResolveWinnerId = (availableIds: string[], state: GameState) => string;

export type RouletteScreenProps = {
  assetState?: AssetLoadState;
  audioController?: AudioController;
  initialState?: GameState;
  resolveWinnerId?: ResolveWinnerId;
};

const defaultResolveWinnerId: ResolveWinnerId = (_availableIds, state) =>
  selectWinner(KEYCHAINS, state.winnerIds).id;

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
  const [resetError, setResetError] = useState(false);
  const [retryError, setRetryError] = useState(false);
  const resetRequestedRef = useRef(false);

  const dispatch = useCallback((action: GameAction) => {
    setState((currentState) => gameReducer(currentState, action));
  }, []);

  useRouletteAnimation({ dispatch, state });

  const resetGame = useCallback(() => {
    if (!window.confirm("抽選当選者を削除して、最初からやり直しますか？")) return;
    try {
      window.localStorage.removeItem(PERSISTENCE_KEY);
    } catch {
      setResetError(true);
      return;
    }
    resetRequestedRef.current = true;
    activeAudioController.stopAll();
    setHistoryOpen(false);
    setPersistenceWarning(false);
    setResetError(false);
    setRetryError(false);
    dispatch({ type: "RESET" });
  }, [activeAudioController, dispatch]);

  useEffect(() => {
    if (initialState) {
      setState(initialState);
    }
  }, [initialState]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (url.searchParams.get("reset") !== "1") return;

    resetGame();

    url.searchParams.delete("reset");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [resetGame]);

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
    if (resetRequestedRef.current) {
      resetRequestedRef.current = false;
      return;
    }
    if (state.winnerIds.length === 0 || typeof window === "undefined") return;
    const result = saveGameState(window.localStorage, state.winnerIds, state.winnerIds.length === 3);
    setPersistenceWarning(!result.ok);
  }, [state.winnerIds]);

  const visibleKeychain = useMemo(() => getVisibleKeychain(state), [state]);
  const historyKeychains = useMemo(() => getHistoryKeychains(state.winnerIds), [state.winnerIds]);

  const handleStart = () => {
    if (state.phase !== "ready" && state.phase !== "idle") return;
    if (state.phase === "ready") {
      dispatch({ type: "ENTER" });
    }
    dispatch({ type: "START" });
    void activeAudioController.unlock();
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
    void activeAudioController.playWinner();
  };

  const handleNext = () => {
    if (state.phase !== "winner") return;
    setRetryError(false);
    dispatch({ type: "NEXT" });
  };

  const handleRetry = () => {
    if (state.phase !== "winner") return;
    const retried = gameReducer(state, { type: "RETRY" });
    // Save even an empty history so a reload cannot restore the cancelled first result.
    try {
      const result = saveGameState(window.localStorage, retried.winnerIds, false);
      if (!result.ok) throw result.error;
    } catch {
      setRetryError(true);
      return;
    }
    setRetryError(false);
    setPersistenceWarning(false);
    activeAudioController.stopAll();
    dispatch({ type: "RETRY" });
    void activeAudioController.startRoulette();
  };

  return (
    <main className="arcade-mock arcade-live" data-phase={state.phase} data-winner-count={state.winnerIds.length}>
      <header className="arcade-mock__logo">
        <h1 aria-label="Akkey Roulette">
          <img alt="WEDDING AKKEY-ROULETTE" src="/media/akkey-roulette-title.png" />
        </h1>
      </header>

      <section className="arcade-mock__console" aria-label="Akkey roulette">
        <section className="arcade-mock__game">
          <span aria-hidden="true" className="arcade-mock__screw arcade-mock__screw--tl" />
          <span aria-hidden="true" className="arcade-mock__screw arcade-mock__screw--tr" />
          <span aria-hidden="true" className="arcade-mock__screw arcade-mock__screw--bl" />
          <span aria-hidden="true" className="arcade-mock__screw arcade-mock__screw--br" />

          <div className="arcade-mock__viewport roulette-stage">
            {state.phase === "boot" ? <p className="arcade-live__loading">NOW LOADING...</p> : null}
            {state.phase === "error" ? <p className="arcade-live__loading" role="alert">LOADING ERROR</p> : null}
            {state.phase === "ready" || state.phase === "idle" ? (
              <>
                <div aria-hidden="true" className="arcade-mock__mystery"><b>?</b></div>
                <p>READY?</p>
                <p className="arcade-mock__hint">手元のアクキーと同じ絵柄が出たら当たり！</p>
              </>
            ) : null}
            {state.phase === "spinning" || state.phase === "winner" ? (
              <div className="arcade-live__keychain-display">
                <RouletteImage
                  alt="Current roulette image"
                  className="roulette-stage__image"
                  keychain={visibleKeychain}
                />
              </div>
            ) : null}
            {state.phase === "complete" ? (
              <div className="arcade-live__complete">
                <p>COMPLETE!</p>
                <span>THANK YOU FOR PLAYING!</span>
              </div>
            ) : null}
          </div>

          {persistenceWarning ? <p className="arcade-live__status" role="alert">当選者を保存できません。ページを閉じないでください。</p> : null}
          {resetError ? <p className="arcade-live__status" role="alert">当選者を削除できませんでした。もう一度お試しください。</p> : null}
          {retryError ? <p className="arcade-live__status" role="alert">回し直しを保存できませんでした。もう一度RETRYを押してください。</p> : null}

          <div className="arcade-live__controls">
            {state.phase === "ready" || state.phase === "idle" ? (
              <button aria-label="START" className="arcade-mock__start" onClick={handleStart} type="button"><i>▶</i>START</button>
            ) : null}
            {state.phase === "spinning" ? (
              <button aria-label="STOP" className="arcade-live__button arcade-live__button--stop" onClick={handleStop} type="button"><i>■</i>STOP</button>
            ) : null}
            {state.phase === "winner" ? (
              <div className="arcade-live__result-actions">
                <button aria-label="RETRY" className="arcade-live__button arcade-live__button--retry" onClick={handleRetry} type="button">↻</button>
                <button aria-label="NEXT" className="arcade-live__button arcade-live__button--next" onClick={handleNext} type="button"><i>▶</i>NEXT</button>
              </div>
            ) : null}
            {state.phase === "complete" ? (
              <button aria-label="はじめからやり直す" className="arcade-live__button arcade-live__button--next" onClick={resetGame} type="button"><i>▶</i>PLAY AGAIN</button>
            ) : null}
          </div>
        </section>

        <aside
          aria-label="当選者を表示"
          className="arcade-mock__prizes arcade-live__results-trigger"
          onClick={() => setHistoryOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setHistoryOpen(true);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <h2>RESULTS</h2>
          <ol>
            {[1, 2, 3].map((round) => {
              const winner = historyKeychains[round - 1];
              return (
                <li className={winner ? "arcade-live__result is-winner" : "arcade-live__result"} key={round}>
                  <strong>ROUND<br />0{round}</strong>
                  {winner ? (
                    <span className="arcade-live__result-surface">
                      <RouletteImage alt={`Round ${round} result`} className="arcade-live__result-image" keychain={winner} />
                    </span>
                  ) : <span className="arcade-mock__prize-unknown">?</span>}
                </li>
              );
            })}
          </ol>
        </aside>
      </section>
      <HistoryDialog
        hideTrigger
        onClose={() => setHistoryOpen(false)}
        onOpen={() => setHistoryOpen(true)}
        open={historyOpen}
        winners={historyKeychains}
      />
    </main>
  );
}
