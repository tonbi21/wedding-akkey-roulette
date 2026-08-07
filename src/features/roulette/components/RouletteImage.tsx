import type { Keychain } from "../gameTypes";

type RouletteImageProps = {
  keychain: Keychain;
  alt: string;
  className?: string;
};

export function RouletteImage({ keychain, alt, className }: RouletteImageProps) {
  return <img alt={alt} className={className} src={keychain.imageSrc} />;
}
