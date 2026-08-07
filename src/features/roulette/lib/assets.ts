import { KEYCHAINS } from "../keychains";

export const IMAGE_ASSETS = KEYCHAINS.map((keychain) => keychain.imageSrc);
export const AUDIO_ASSETS = {
  waiting: "/audio/waiting.mp3",
  roulette: "/audio/roulette.mp3",
  deceleration: "/audio/deceleration.mp3",
  winner: "/audio/winner.mp3"
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
};
type AssetFactory = (src: string) => LoadableAsset;

const loadOne = async (source: string, factory: AssetFactory): Promise<void> => {
  const asset = factory(source);
  asset.src = source;
  asset.load?.();
  await asset.decode?.();
};

export async function preloadAssets(
  imageSources: string[],
  audioSources: string[],
  imageFactory: AssetFactory = (source) => new Image() as unknown as LoadableAsset,
  audioFactory: AssetFactory = (source) => new Audio(source)
): Promise<AssetLoadState> {
  const sources = [...imageSources, ...audioSources];
  const results = await Promise.all(
    sources.map(async (source, index) => {
      const factory = index < imageSources.length ? imageFactory : audioFactory;
      try {
        await loadOne(source, factory);
        return null;
      } catch {
        return source;
      }
    })
  );
  const failedAssets = results.filter((source): source is string => source !== null);
  return {
    ready: sources.length > 0 && failedAssets.length === 0,
    progress: failedAssets.length === 0 ? 100 : Math.round(((sources.length - failedAssets.length) / sources.length) * 100),
    failedAssets
  };
}
