export const SPIN_INTERVAL_MS = 75;
export const DECELERATION_STEPS_MS = [90, 110, 140, 180, 230, 300, 390, 500, 650] as const;

export function getNextCandidate<T>(candidates: T[], current: T | null, randomIndex: (length: number) => number): T {
  if (candidates.length === 0) throw new RangeError("candidates must not be empty");
  if (candidates.length === 1) return candidates[0];
  const available = candidates.filter((candidate) => candidate !== current);
  return available[randomIndex(available.length)];
}
