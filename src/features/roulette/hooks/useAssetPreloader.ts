"use client";

import { useEffect, useState } from "react";
import { AUDIO_ASSETS, IMAGE_ASSETS, type AssetLoadState, preloadAssets } from "../lib/assets";

const initialState: AssetLoadState = { ready: false, progress: 0, failedAssets: [] };

export function useAssetPreloader(enabled = true): AssetLoadState {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void preloadAssets(IMAGE_ASSETS, Object.values(AUDIO_ASSETS), undefined, undefined, (progressState) => {
      if (active) setState(progressState);
    }).then((nextState) => {
      if (active) setState(nextState);
    });
    return () => { active = false; };
  }, [enabled]);

  return state;
}
