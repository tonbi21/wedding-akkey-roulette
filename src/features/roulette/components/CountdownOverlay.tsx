export function CountdownOverlay() {
  return (
    <div aria-live="polite" className="roulette-overlay">
      <p className="roulette-overlay__eyebrow">まもなく / Ready</p>
      <p className="roulette-overlay__title">3 → 2 → 1 → START!!</p>
    </div>
  );
}
