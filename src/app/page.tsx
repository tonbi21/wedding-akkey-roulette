import { RouletteScreen } from "@/features/roulette/components/RouletteScreen";
import { Ballpit } from "@/features/roulette/components/Ballpit";
import { KEYCHAINS } from "@/features/roulette/keychains";
import { KEYCHAIN_COUNT } from "@/features/roulette/config";

export default function Page() {
  return (
    <>
      <Ballpit count={KEYCHAIN_COUNT} images={KEYCHAINS} />
      <RouletteScreen />
    </>
  );
}
