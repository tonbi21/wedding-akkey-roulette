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
  startRoulette(): Promise<void>;
  startDeceleration(): Promise<void>;
  playWinner(): Promise<void>;
  stopAll(): void;
};

type TrackName = "roulette" | "deceleration" | "winner";
type AudioSources = Record<TrackName, string>;
type AudioFactory = (source: string) => AudioElementLike;
type AudioBufferLike = {
  duration?: number;
  sampleRate?: number;
  length?: number;
  numberOfChannels?: number;
  getChannelData?: (channel: number) => Float32Array;
};
type AudioBufferSourceLike = {
  buffer: AudioBufferLike | null;
  loop: boolean;
  connect(destination: unknown): void;
  start(when?: number, offset?: number): void;
  stop(): void;
  disconnect?(): void;
};
type AudioContextLike = {
  destination: unknown;
  resume(): Promise<void>;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBufferLike>;
  createBufferSource(): AudioBufferSourceLike;
};
type AudioContextFactory = () => AudioContextLike | null;

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

const defaultAudioContextFactory: AudioContextFactory = () => {
  if (typeof window === "undefined" || typeof window.AudioContext !== "function") return null;
  return new window.AudioContext();
};

export function createAudioController(
  sources: AudioSources,
  factory: AudioFactory = defaultAudioFactory,
  contextFactory: AudioContextFactory = defaultAudioContextFactory
): AudioController {
  const tracks = Object.fromEntries(
    Object.entries(sources).map(([name, source]) => [name, factory(source)])
  ) as Record<TrackName, AudioElementLike>;
  let audioContext: AudioContextLike | null = null;
  let rouletteBufferPromise: Promise<AudioBufferLike | null> | null = null;
  let rouletteSource: AudioBufferSourceLike | null = null;
  let rouletteStartToken = 0;

  const stop = (track: AudioElementLike) => {
    track.pause();
    track.currentTime = 0;
  };

  const stopRouletteSource = () => {
    if (!rouletteSource) return;
    try {
      rouletteSource.stop();
    } catch {
      // A source that already stopped can be safely discarded.
    }
    rouletteSource.disconnect?.();
    rouletteSource = null;
  };

  const cancelRouletteStart = () => {
    rouletteStartToken += 1;
    stopRouletteSource();
  };

  const getAudioContext = () => {
    if (audioContext === null) audioContext = contextFactory();
    return audioContext;
  };

  const prepareAudioContext = async () => {
    const context = getAudioContext();
    if (!context) return null;
    try {
      await context.resume();
      return context;
    } catch {
      return null;
    }
  };

  const loadRouletteBuffer = async (context: AudioContextLike) => {
    if (!rouletteBufferPromise) {
      rouletteBufferPromise = fetch(sources.roulette)
        .then((response) => {
          if (!response.ok) throw new Error(`Failed to load ${sources.roulette}`);
          return response.arrayBuffer();
        })
        .then((data) => context.decodeAudioData(data))
        .catch(() => null);
    }
    return rouletteBufferPromise;
  };

  const play = async (name: TrackName, loop = false) => {
    cancelRouletteStart();
    Object.entries(tracks).forEach(([trackName, track]) => {
      if (trackName !== name) stop(track);
    });
    const track = tracks[name];
    track.loop = loop;
    try {
      await track.play();
    } catch (error) {
      // Audio is optional; an unsupported or blocked source must not stop the draw.
      const isExpectedInterruption = error instanceof Error && error.name === "AbortError";
      if (!isExpectedInterruption && process.env.NODE_ENV !== "production") {
        console.warn(`Audio playback failed for ${name}`, error);
      }
    }
  };

  const startRoulette = async () => {
    const requestToken = ++rouletteStartToken;
    stopRouletteSource();
    const context = await prepareAudioContext();
    let fallbackReason: "context-unavailable" | "decode-failed";
    if (context) {
      const buffer = await loadRouletteBuffer(context);
      if (buffer && requestToken === rouletteStartToken) {
        Object.values(tracks).forEach(stop);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = false;
        source.connect(context.destination);
        source.start(0, 0);
        rouletteSource = source;
        if (process.env.NODE_ENV !== "production") {
          console.info("[audio] roulette path=web-audio", {
            duration: buffer.duration,
            sampleRate: buffer.sampleRate,
            length: buffer.length,
            numberOfChannels: buffer.numberOfChannels,
            loop: source.loop
          });
        }
        return;
      }
      fallbackReason = "decode-failed";
    } else {
      fallbackReason = "context-unavailable";
    }

    if (requestToken === rouletteStartToken) {
      if (process.env.NODE_ENV !== "production") {
        console.info("[audio] roulette path=html-audio-fallback", { reason: fallbackReason });
      }
      await play("roulette");
    }
  };

  return {
    async unlock() {
      const context = await prepareAudioContext();
      if (context) void loadRouletteBuffer(context);
    },
    startRoulette,
    startDeceleration: () => play("deceleration"),
    playWinner: () => play("winner"),
    stopAll: () => {
      cancelRouletteStart();
      Object.values(tracks).forEach(stop);
    }
  };
}

export function useAudioController(sources: AudioSources): AudioController {
  const controllerRef = useRef<AudioController | null>(null);
  if (controllerRef.current === null) controllerRef.current = createAudioController(sources);

  useEffect(() => () => controllerRef.current?.stopAll(), []);
  return controllerRef.current;
}
