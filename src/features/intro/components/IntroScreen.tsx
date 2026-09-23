"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function IntroScreen() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const navigatingRef = useRef(false);

  const finishIntro = () => {
    audioRef.current?.pause();
    setShowStart(true);
  };

  const beginIntro = () => {
    if (hasStarted) return;
    setHasStarted(true);
    const videoPlayback = videoRef.current?.play();
    if (videoPlayback) void videoPlayback.catch(finishIntro);
    const audioPlayback = audioRef.current?.play();
    if (audioPlayback) void audioPlayback.catch(() => undefined);
  };

  const startGame = () => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    setNavigating(true);
    router.push("/roulette");
  };

  return (
    <main className="intro-screen" data-stage={showStart ? "start" : hasStarted ? "video" : "tap"}>
      {!videoFailed && (
        <video ref={videoRef} data-testid="hero-video" className="intro-screen__video" muted playsInline preload="auto" onEnded={finishIntro} onError={() => { setVideoFailed(true); finishIntro(); }}>
          <source src="/media/akkey-roulette-hero-web.mp4" type="video/mp4" />
        </video>
      )}
      <audio ref={audioRef} data-testid="intro-audio" preload="auto" src="/audio/wedding_akkey_roulette_retro_game_10s.wav" />
      {!hasStarted && !showStart && (
        <button type="button" className="intro-screen__tap" aria-label="TAP TO START" onClick={beginIntro}>
          <img src="/media/tap-to-start.png" alt="" />
        </button>
      )}
      {showStart && (
        <button type="button" className="intro-screen__start" aria-label="GAME START" disabled={navigating} onClick={startGame}>
          <img src="/media/game-start.png" alt="" />
        </button>
      )}
    </main>
  );
}
