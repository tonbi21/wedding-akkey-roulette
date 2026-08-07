"use client";

import { useEffect, useState } from "react";
import { AUDIO_ASSETS, IMAGE_ASSETS, type AssetLoadState, preloadAssets } from "../lib/assets";

const initialState: AssetLoadState = { ready: false, progress: 0, failedAssets: [] };

export function useAssetPreloader(): AssetLoadState {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let active = true;
    void preloadAssets(IMAGE_ASSETS, Object.values(AUDIO_ASSETS)).then((nextState) => {
      if (active) setState(nextState);
    });
    return () => { active = false; };
  }, []);

  return state;
}
