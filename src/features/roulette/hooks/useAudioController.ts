"use client";

import { useEffect, useRef } from "react";

export type AudioElementLike = {
  src?: string;
  currentTime: number;
  loop: boolean;
  muted: boolean;
  paused: boolean;
  volume: number;
  load(): void;
  pause(): void;
  play(): Promise<void> | void;
};

export type AudioController = {
  unlock(): Promise<void>;
  startWaiting(): Promise<void>;
  stopWaiting(): Promise<void>;
  startRoulette(): Promise<void>;
  startDeceleration(): Promise<void>;
  playWinner(): Promise<void>;
  stopAll(): void;
};

type TrackName = "waiting" | "roulette" | "deceleration" | "winner";
type AudioSources = Record<TrackName, string>;
type AudioFactory = (source: string) => AudioElementLike;

const defaultAudioFactory: AudioFactory = (source) => {
  if (typeof Audio === "function") return new Audio(source);
  return {
    src: source,
    currentTime: 0,
    loop: false,
    muted: false,
    paused: true,
    volume: 1,
    load: () => undefined,
    pause: () => undefined,
    play: async () => undefined
  };
};

export function createAudioController(
  sources: AudioSources,
  factory: AudioFactory = defaultAudioFactory
): AudioController {
  const tracks = Object.fromEntries(
    Object.entries(sources).map(([name, source]) => [name, factory(source)])
  ) as Record<TrackName, AudioElementLike>;

  const stop = (track: AudioElementLike) => {
    track.pause();
    track.currentTime = 0;
  };

  const play = async (name: TrackName, loop = false) => {
    Object.entries(tracks).forEach(([trackName, track]) => {
      if (trackName !== name) stop(track);
    });
    const track = tracks[name];
    track.loop = loop;
    try {
      await track.play();
    } catch {
      // Audio is optional; an unsupported or blocked source must not stop the draw.
    }
  };

  return {
    async unlock() {
      for (const track of Object.values(tracks)) {
        const muted = track.muted;
        track.muted = true;
        track.load();
        try { await track.play(); } catch { /* autoplay remains blocked until a later gesture */ }
        track.pause();
        track.currentTime = 0;
        track.muted = muted;
      }
    },
    startWaiting: () => play("waiting", true),
    stopWaiting: async () => { stop(tracks.waiting); },
    startRoulette: () => play("roulette"),
    startDeceleration: () => play("deceleration"),
    playWinner: () => play("winner"),
    stopAll: () => Object.values(tracks).forEach((track) => {
      stop(track);
      track.src = "";
      track.load();
    })
  };
}

export function useAudioController(sources: AudioSources): AudioController {
  const controllerRef = useRef<AudioController | null>(null);
  if (controllerRef.current === null) controllerRef.current = createAudioController(sources);

  useEffect(() => () => controllerRef.current?.stopAll(), []);
  return controllerRef.current;
}
