"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export function WinnerOverlay() {
  useEffect(() => {
    const reducedMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
    if (reducedMotion) return;
    void confetti({ particleCount: 120, spread: 70, origin: { y: 0.62 } });
  }, []);

  return (
    <div
      aria-live="polite"
      className="roulette-overlay winner-overlay winner-overlay--bottom winner-overlay--celebration winner-overlay--compact"
      data-testid="winner-overlay"
    >
      <p className="roulette-overlay__title">当たり</p>
    </div>
  );
}
