import { afterEach, describe, expect, it, vi } from "vitest";
import { CanvasTexture, Scene, SphereGeometry } from "three";
import { KEYCHAINS } from "../keychains";
import { createBallpit } from "./createBallpit";

const render = vi.hoisted(() => vi.fn());
// jsdom has no GPU. Keep the scene, textures and physics real; replace only the renderer.
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return { ...actual, WebGLRenderer: class {
    render = render;
    setPixelRatio() {}
    setSize() {}
    dispose() {}
    forceContextLoss() {}
  } };
});

afterEach(() => { vi.unstubAllGlobals(); render.mockClear(); });

async function mountBackground(width = 1200, height = 800, seed?: number) {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal("Image", class {
    naturalWidth = 1360;
    naturalHeight = 1625;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) { if (value) queueMicrotask(() => this.onload?.()); }
  });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  let randomState = seed ?? 0;
  vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation((array) => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    (array as Uint32Array)[0] = seed === undefined ? 500000 : randomState % 1000000;
    return array;
  });
  let frameCallback: FrameRequestCallback = () => {};
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frameCallback = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const canvas = document.createElement("canvas");
  const parent = document.createElement("div");
  Object.defineProperties(parent, { clientWidth: { value: width }, clientHeight: { value: height } });
  parent.appendChild(canvas);
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width, height } as DOMRect);
  const unavailable = vi.fn();
  const controller = await createBallpit(canvas, KEYCHAINS, new AbortController().signal, unavailable);
  let time = performance.now();
  return { canvas, controller, unavailable, nextFrame: () => { time += 1000 / 60; frameCallback(time); } };
}

describe("Ballpit runtime lifecycle", () => {
  it.each([1, 42, 2026])("keeps 48 enlarged capsules floating after two minutes on a narrow screen (seed %i)", async (seed) => {
    const { controller, nextFrame } = await mountBackground(320, 844, seed);
    try {
      const scene = render.mock.calls[0][0] as Scene;
      for (let frame = 0; frame < 6600; frame++) nextFrame();
      const positions = scene.children.map((group) => group.position.clone());
      for (let frame = 0; frame < 600; frame++) nextFrame();
      const moving = scene.children.filter((group, index) =>
        Math.hypot(group.position.x - positions[index].x, group.position.y - positions[index].y) > 0.25
      );
      expect(scene.children).toHaveLength(48);
      expect(moving.length).toBeGreaterThanOrEqual(24);
    } finally { controller.dispose(); }
  });

  it("releases all textures on terminal context loss, not only on component unmount", async () => {
    const textureDispose = vi.spyOn(CanvasTexture.prototype, "dispose");
    const geometryDispose = vi.spyOn(SphereGeometry.prototype, "dispose");
    const { canvas, controller, unavailable } = await mountBackground();
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    expect(textureDispose).toHaveBeenCalledTimes(48);
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(unavailable).toHaveBeenCalledOnce();
    controller.dispose();
    expect(textureDispose).toHaveBeenCalledTimes(48);
  });

  it("a pointer tap nudges the real capsule positions even if released before the next frame", async () => {
    const { controller, nextFrame } = await mountBackground();
    const scene = render.mock.calls[0][0] as Scene;
    expect(scene.children.every((group) => group.position.x === 0)).toBe(true);
    window.dispatchEvent(new MouseEvent("pointerdown", { clientX: 590, clientY: 400 }));
    window.dispatchEvent(new MouseEvent("pointerup"));
    nextFrame();
    expect(scene.children.some((group) => group.position.x > 0.001)).toBe(true);
    controller.dispose();
  });
});
