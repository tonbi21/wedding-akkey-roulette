import { Ballpit } from "@/features/roulette/components/Ballpit";
import { RouletteScreen } from "@/features/roulette/components/RouletteScreen";
import { KEYCHAIN_COUNT } from "@/features/roulette/config";
import { KEYCHAINS } from "@/features/roulette/keychains";

export default function RoulettePage() {
  return (
    <>
      <Ballpit count={KEYCHAIN_COUNT} images={KEYCHAINS} />
      <RouletteScreen />
    </>
  );
}
