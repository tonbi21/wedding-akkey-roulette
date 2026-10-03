import { RouletteScreen } from "@/features/roulette/components/RouletteScreen";
import { Ballpit } from "@/features/roulette/components/Ballpit";
import { KEYCHAINS } from "@/features/roulette/keychains";

export default function Page() {
  return (
    <>
      <Ballpit count={KEYCHAINS.length} images={KEYCHAINS} />
      <RouletteScreen />
    </>
  );
}
