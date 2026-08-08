"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

type WinnerOverlayProps = {
  complete?: boolean;
};

export function WinnerOverlay({ complete = false }: WinnerOverlayProps) {
  useEffect(() => {
    const reducedMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
    if (complete || reducedMotion) return;
    void confetti({ particleCount: 120, spread: 70, origin: { y: 0.62 } });
  }, [complete]);

  return (
    <div
      aria-live="polite"
      className="roulette-overlay winner-overlay winner-overlay--celebration"
      data-testid="winner-overlay"
    >
      {complete ? (
        <>
          <p className="roulette-overlay__eyebrow">抽選終了</p>
          <p className="roulette-overlay__title">COMPLETE</p>
        </>
      ) : (
        <p className="roulette-overlay__title">当たり</p>
      )}
    </div>
  );
}
