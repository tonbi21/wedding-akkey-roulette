"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function IntroScreen() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showStart, setShowStart] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const navigatingRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const playback = video.play();
    if (playback) void playback.catch(() => setShowStart(true));
  }, []);

  const startGame = () => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    setNavigating(true);
    router.push("/roulette");
  };

  return (
    <main className="intro-screen" data-stage={showStart ? "start" : "video"}>
      {!showStart ? (
        <video ref={videoRef} data-testid="hero-video" className="intro-screen__video" autoPlay muted playsInline preload="auto" onEnded={() => setShowStart(true)} onError={() => setShowStart(true)}>
          <source src="/media/akkey-roulette-hero-web.mp4" type="video/mp4" />
        </video>
      ) : (
        <button type="button" className="intro-screen__start" aria-label="GAME START" disabled={navigating} onClick={startGame}>
          <img src="/media/game-start.png" alt="" />
        </button>
      )}
    </main>
  );
}
