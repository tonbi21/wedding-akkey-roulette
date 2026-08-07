type WinnerOverlayProps = {
  complete?: boolean;
};

export function WinnerOverlay({ complete = false }: WinnerOverlayProps) {
  return (
    <div aria-live="polite" className="roulette-overlay">
      <p className="roulette-overlay__eyebrow">{complete ? "抽選終了" : "当たり / Winner"}</p>
      <p className="roulette-overlay__title">{complete ? "COMPLETE" : "WINNER!"}</p>
    </div>
  );
}
