import { KEYCHAINS } from "../keychains";

export const IMAGE_ASSETS = KEYCHAINS.map((keychain) => keychain.imageSrc);
const AUDIO_ASSET_VERSION = "v4";
export const AUDIO_ASSETS = {
  waiting: `/audio/waiting.mp3?${AUDIO_ASSET_VERSION}`,
  roulette: `/audio/roulette.mp3?${AUDIO_ASSET_VERSION}`,
  deceleration: `/audio/deceleration.mp3?${AUDIO_ASSET_VERSION}`,
  winner: `/audio/winner.mp3?${AUDIO_ASSET_VERSION}`
} as const;

export type AssetLoadState = {
  ready: boolean;
  progress: number;
  failedAssets: string[];
};

type LoadableAsset = {
  src: string;
  decode?: () => Promise<void>;
  load?: () => void;
  addEventListener?: (type: "loadeddata" | "error", listener: () => void) => void;
  removeEventListener?: (type: "loadeddata" | "error", listener: () => void) => void;
};
type AssetFactory = (src: string) => LoadableAsset;

const loadOne = async (source: string, factory: AssetFactory): Promise<void> => {
  const asset = factory(source);
  asset.src = source;
  if (asset.decode) {
    asset.load?.();
    await asset.decode();
    return;
  }

  if (asset.addEventListener && asset.removeEventListener) {
    const addEventListener = asset.addEventListener.bind(asset);
    const removeEventListener = asset.removeEventListener.bind(asset);
    await new Promise<void>((resolve, reject) => {
      const loaded = () => {
        removeEventListener("loadeddata", loaded);
        removeEventListener("error", failed);
        resolve();
      };
      const failed = () => {
        removeEventListener("loadeddata", loaded);
        removeEventListener("error", failed);
        reject(new Error(`Failed to load ${source}`));
      };
      addEventListener("loadeddata", loaded);
      addEventListener("error", failed);
      asset.load?.();
    });
    return;
  }

  asset.load?.();
};

export async function preloadAssets(
  imageSources: string[],
  audioSources: string[],
  imageFactory: AssetFactory = (source) => new Image() as unknown as LoadableAsset,
  audioFactory: AssetFactory = (source) => new Audio(source),
  onProgress?: (state: AssetLoadState) => void
): Promise<AssetLoadState> {
  const sources = [...imageSources, ...audioSources];
  let completed = 0;
  const failedAssets: string[] = [];
  const reportProgress = () => onProgress?.({
    ready: completed === sources.length && failedAssets.length === 0,
    progress: sources.length === 0 ? 0 : Math.round((completed / sources.length) * 100),
    failedAssets: [...failedAssets]
  });
  const results = await Promise.all(
    sources.map(async (source, index) => {
      const factory = index < imageSources.length ? imageFactory : audioFactory;
      try {
        await loadOne(source, factory);
      } catch {
        failedAssets.push(source);
      }
      completed += 1;
      reportProgress();
    })
  );
  void results;
  return {
    ready: sources.length > 0 && failedAssets.length === 0,
    progress: sources.length === 0 ? 0 : 100,
    failedAssets
  };
}
