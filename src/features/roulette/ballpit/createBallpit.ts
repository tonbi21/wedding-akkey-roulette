import { CanvasTexture, PerspectiveCamera, Plane, Raycaster, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer } from "three";
import type { Keychain } from "../gameTypes";
import { createCapsules } from "./capsules";
import { BallpitPhysics } from "./physics";
import { BALLPIT_SETTINGS } from "./settings";

// Downsample only the in-memory GPU copy; the supplied PNG files remain untouched.
function loadTexture(src: string, signal: AbortSignal): Promise<CanvasTexture> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", cancel);
      image.onload = null;
      image.onerror = null;
    };
    const cancel = () => { cleanup(); image.src = ""; reject(new Error("Capsule loading cancelled")); };
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error("Capsule image timed out")); }, 10000);
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) { cancel(); return; }
    image.onload = () => {
      cleanup();
      try {
        const surface = document.createElement("canvas");
        surface.width = 256;
        surface.height = Math.round(256 * image.naturalHeight / image.naturalWidth);
        const context = surface.getContext("2d");
        if (!context) throw new Error("Capsule image canvas unavailable");
        context.drawImage(image, 0, 0, surface.width, surface.height);
        const texture = new CanvasTexture(surface);
        texture.colorSpace = SRGBColorSpace;
        resolve(texture);
      } catch (error) { reject(error); }
    };
    image.onerror = () => { cleanup(); reject(new Error("Capsule image unavailable")); };
    image.src = src;
  });
}

export async function createBallpit(
  canvas: HTMLCanvasElement,
  images: Keychain[],
  signal: AbortSignal,
  onUnavailable: () => void
) {
  const loaded = await Promise.allSettled(images.map((image) => loadTexture(image.imageSrc, signal)));
  const textures = loaded.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (signal.aborted || textures.length !== images.length) {
    textures.forEach((texture) => texture.dispose());
    throw new Error("Capsule images incomplete");
  }
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  } catch (error) {
    textures.forEach((texture) => texture.dispose());
    throw error;
  }
  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.z = 24;
  const capsules = createCapsules(images, textures);
  capsules.items.forEach(({ group }) => scene.add(group));
  const physics = new BallpitPhysics(images.length, { x: 12, y: 8.5, z: BALLPIT_SETTINGS.depth });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  let frame = 0;
  let lastTime = 0;
  let disposed = false;
  let failed = false;

  const draw = () => {
    capsules.items.forEach(({ group }, index) => {
      group.position.copy(physics.balls[index].position);
      group.scale.setScalar(physics.balls[index].radius);
    });
    renderer.render(scene, camera);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.dataset.motion = "paused";
  };
  const animate = (time: number) => {
    frame = 0;
    if (disposed || failed || document.hidden || reducedMotion.matches) return;
    physics.step((time - lastTime) / 1000);
    lastTime = time;
    draw();
    frame = requestAnimationFrame(animate);
  };
  const updateMotion = () => {
    stop();
    if (disposed || failed || document.hidden || reducedMotion.matches) return;
    lastTime = performance.now();
    canvas.dataset.motion = "running";
    frame = requestAnimationFrame(animate);
  };
  const resize = () => {
    if (disposed || failed) return;
    const parent = canvas.parentElement;
    const width = Math.max(parent?.clientWidth ?? window.innerWidth, 1);
    const height = Math.max(parent?.clientHeight ?? window.innerHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    const halfHeight = Math.tan(42 * Math.PI / 360) * (camera.position.z - BALLPIT_SETTINGS.depth);
    physics.resize({ x: halfHeight * camera.aspect, y: halfHeight, z: BALLPIT_SETTINGS.depth });
    draw();
  };
  const move = (event: PointerEvent) => {
    if (disposed || failed || reducedMotion.matches) return;
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    physics.pointerActive = raycaster.ray.intersectPlane(plane, physics.pointer) !== null;
  };
  const leave = () => { physics.pointerActive = false; };
  const press = (event: PointerEvent) => {
    if (disposed || failed || reducedMotion.matches) return;
    move(event);
    // Apply the tap impulse now; pointerup can arrive before the next animation frame.
    physics.nudge();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    failed = true;
    dispose();
    onUnavailable();
  };
  const observer = new ResizeObserver(resize);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    observer.disconnect();
    document.removeEventListener("visibilitychange", updateMotion);
    reducedMotion.removeEventListener("change", updateMotion);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerdown", press);
    window.removeEventListener("pointercancel", leave);
    window.removeEventListener("pointerout", leave);
    window.removeEventListener("pointerup", leave);
    canvas.removeEventListener("webglcontextlost", contextLost);
    capsules.dispose();
    scene.clear();
    renderer.dispose();
    renderer.forceContextLoss();
  };
  try {
    renderer.outputColorSpace = SRGBColorSpace;
    resize();
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    document.addEventListener("visibilitychange", updateMotion);
    reducedMotion.addEventListener("change", updateMotion);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", press, { passive: true });
    window.addEventListener("pointercancel", leave, { passive: true });
    window.addEventListener("pointerout", leave, { passive: true });
    window.addEventListener("pointerup", leave, { passive: true });
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.dataset.capsuleCount = String(capsules.items.length);
    canvas.dataset.imageCount = String(textures.length);
    updateMotion();
    return { dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
