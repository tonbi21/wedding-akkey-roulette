# Hero Video Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the supplied hero video at `/`, reveal the supplied GAME START image when playback ends, and move the existing roulette experience to `/roulette`.

**Architecture:** A focused client `IntroScreen` owns only video playback state and route navigation. The App Router keeps `/` and `/roulette` as separate static routes; `RouletteScreen`, its game persistence, and the Ballpit remain unchanged. The hero media lives in `public/media` and is included in the service worker's cache along with the `/roulette` route.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest + Testing Library, Playwright, CSS, existing service worker.

**Spec:** `docs/superpowers/specs/2026-09-22-hero-video-entry-design.md`

## Global Constraints

- The top page video uses `muted`, `autoPlay`, `playsInline`, `preload="auto"`, no controls, and no loop.
- Use `object-fit: contain` on a black full-viewport surface so no supplied video content is cropped.
- Do not render any visible text, button, or roulette UI while the video is playing.
- Use the supplied GAME START image as-is, including its black background; do not recreate its lettering in CSS.
- The image control must expose the accessible name `GAME START`, work with a keyboard, and visibly focus.
- If video loading or muted autoplay fails, reveal the GAME START image rather than blocking access to `/roulette`.
- Respect `prefers-reduced-motion: reduce` by rendering the GAME START image without its blink animation.
- Preserve the current roulette logic, stored winner history, RETRY, reset behavior, audio behavior, and transparent-capsule background.
- Keep all source Downloads files unchanged. Copy only the supplied video and image to `public/media`.
- Update the service-worker cache version and precache `/`, `/roulette`, `/media/akkey-roulette-hero-web.mp4`, and `/media/game-start.png`.

## Review Focus

- Autoplay rejection: a browser that rejects `video.play()` must immediately expose the same accessible GAME START control as a normally ended video. Tested in Task 1.
- Media errors: an `error` event before playback must not leave an empty black page. Tested in Task 1.
- Repeated user activation: repeated clicks on GAME START must issue only one route push. Tested in Task 1.
- Narrow and reduced-motion displays: the complete video and start image must remain visible at 390px width, and the start image must not animate with reduced motion. Tested in Task 3.
- Offline route entry: after precache, the service worker must have both media files and the `/roulette` response, and an offline navigation request for `/roulette` must resolve from its own cached response. Tested in Task 3.

---

### Task 1: Intro screen component and supplied assets

**Files:**
- Create: `src/features/intro/components/IntroScreen.tsx`
- Create: `src/features/intro/components/IntroScreen.test.tsx`
- Create: `public/media/akkey-roulette-hero-web.mp4`
- Create: `public/media/game-start.png`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `/media/akkey-roulette-hero-web.mp4`, `/media/game-start.png`, `useRouter` from `next/navigation`.
- Produces: `IntroScreen(): JSX.Element`, rendering `data-testid="hero-video"` during playback and a `GAME START` button after completion/failure.

- [ ] **Step 1: Write the failing IntroScreen tests**

Create `src/features/intro/components/IntroScreen.test.tsx` with a `next/navigation` mock and tests that exercise the component's public behavior.

```tsx
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push })
}));

it("reveals the supplied start image only after the hero video ends", () => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  render(<IntroScreen />);
  const video = screen.getByTestId("hero-video");
  expect(screen.queryByRole("button", { name: "GAME START" })).not.toBeInTheDocument();
  fireEvent.ended(video);
  const start = screen.getByRole("button", { name: "GAME START" });
  expect(start.querySelector("img")).toHaveAttribute("src", "/media/game-start.png");
});

it.each(["error", "autoplay rejection"])("reveals GAME START after %s", async (reason) => {
  const play = vi.spyOn(HTMLMediaElement.prototype, "play");
  play.mockImplementation(() => reason === "autoplay rejection" ? Promise.reject(new Error("blocked")) : Promise.resolve());
  render(<IntroScreen />);
  if (reason === "error") fireEvent.error(screen.getByTestId("hero-video"));
  await waitFor(() => expect(screen.getByRole("button", { name: "GAME START" })).toBeInTheDocument());
});

it("pushes to the roulette route only once", () => {
  render(<IntroScreen />);
  fireEvent.ended(screen.getByTestId("hero-video"));
  const start = screen.getByRole("button", { name: "GAME START" });
  fireEvent.click(start);
  fireEvent.click(start);
  expect(push).toHaveBeenCalledTimes(1);
  expect(push).toHaveBeenCalledWith("/roulette");
});
```

- [ ] **Step 2: Run the new test file and verify it fails because the component does not exist**

Run: `node node_modules/vitest/vitest.mjs run src/features/intro/components/IntroScreen.test.tsx`

Expected: FAIL with a module-resolution error for `./IntroScreen`.

- [ ] **Step 3: Copy the approved binary assets without altering the Downloads originals**

Run:

```bash
mkdir -p public/media
cp "/Users/hiroyuki_higashio/Downloads/akkey-roulette-hero-web.mp4" public/media/akkey-roulette-hero-web.mp4
cp "/Users/hiroyuki_higashio/Downloads/ChatGPT Image 2026年9月22日 17_55_39.png" public/media/game-start.png
test -s public/media/akkey-roulette-hero-web.mp4
test -s public/media/game-start.png
```

- [ ] **Step 4: Implement `IntroScreen` with a guarded playback fallback and navigation**

Create `src/features/intro/components/IntroScreen.tsx` using this public behavior. The `play()` call is required so its rejected promise can reveal the fallback; the HTML `autoPlay` attribute remains for normal browser playback. `navigating` prevents double activation.

```tsx
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
```

Change `src/app/page.tsx` to import and return `<IntroScreen />` only.

- [ ] **Step 5: Add scoped intro styles**

Append styles that retain the existing roulette styles unchanged.

```css
.intro-screen { min-height: 100vh; display: grid; place-items: center; overflow: hidden; background: #000; }
.intro-screen__video { width: 100%; height: 100vh; object-fit: contain; }
.intro-screen__start { width: min(92vw, 68rem); padding: 0; border: 0; background: transparent; cursor: pointer; animation: intro-start-blink 1.1s steps(2, end) infinite; }
.intro-screen__start img { width: 100%; height: auto; }
.intro-screen__start:focus-visible { outline: 3px solid #fff; outline-offset: 0.5rem; }
@keyframes intro-start-blink { 50% { opacity: 0.62; } }
@media (prefers-reduced-motion: reduce) { .intro-screen__start { animation: none; } }
```

- [ ] **Step 6: Run the IntroScreen tests and verify they pass**

Run: `node node_modules/vitest/vitest.mjs run src/features/intro/components/IntroScreen.test.tsx`

Expected: PASS with the three required behaviors, including two failure paths.

- [ ] **Step 7: Commit the self-contained intro implementation**

```bash
git add src/app/page.tsx src/app/globals.css src/features/intro/components/IntroScreen.tsx src/features/intro/components/IntroScreen.test.tsx public/media/akkey-roulette-hero-web.mp4 public/media/game-start.png
git commit -m "feat: add hero video entry screen"
```

### Task 2: Move the roulette application to `/roulette`

**Files:**
- Create: `src/app/roulette/page.tsx`
- Modify: `e2e/roulette.spec.ts`
- Modify: `e2e/ballpit.spec.ts`

**Interfaces:**
- Consumes: `Ballpit`, `RouletteScreen`, `KEYCHAINS`, and `KEYCHAIN_COUNT` exactly as the former root page did.
- Produces: static App Router route `/roulette` with the unchanged roulette markup and game-storage behavior.

- [ ] **Step 1: Write failing route expectations before adding the route**

In both existing E2E files, replace each roulette-page navigation with `/roulette`. In `e2e/roulette.spec.ts`, change the reset query path from `/?reset=1` to `/roulette?reset=1`. Add a direct-route assertion to the first test setup:

```ts
await page.goto("/roulette");
await expect(page).toHaveURL(/\/roulette$/);
await expect(page.getByRole("button", { name: "ENTER" })).toBeVisible({ timeout: 20_000 });
```

- [ ] **Step 2: Run the migrated route test and verify it fails with the missing route**

Run: `node node_modules/@playwright/test/cli.js test e2e/roulette.spec.ts --grep "double START"`

Expected: FAIL because `/roulette` has no ENTER control before the route exists.

- [ ] **Step 3: Create the route with the exact former root roulette composition**

Create `src/app/roulette/page.tsx`:

```tsx
import { Ballpit } from "@/features/roulette/components/Ballpit";
import { RouletteScreen } from "@/features/roulette/components/RouletteScreen";
import { KEYCHAIN_COUNT } from "@/features/roulette/config";
import { KEYCHAINS } from "@/features/roulette/keychains";

export default function RoulettePage() {
  return (
    <>
      <Ballpit count={KEYCHAIN_COUNT} images={KEYCHAINS} />
      <RouletteScreen />
    </>
  );
}
```

- [ ] **Step 4: Run the migrated roulette and Ballpit suites**

Run: `node node_modules/@playwright/test/cli.js test e2e/roulette.spec.ts e2e/ballpit.spec.ts`

Expected: PASS, including three rounds, RETRY, reset, persisted reload, 48 capsules, touch, reduced motion, and WebGL context-loss fallback under `/roulette`.

- [ ] **Step 5: Commit the isolated route migration**

```bash
git add src/app/roulette/page.tsx e2e/roulette.spec.ts e2e/ballpit.spec.ts
git commit -m "feat: move roulette to dedicated route"
```

### Task 3: Cache the introduction and validate end-to-end entry behavior

**Files:**
- Create: `e2e/intro.spec.ts`
- Modify: `public/sw.js`
- Modify: `README.md`
- Modify: `docs/acceptance-checklist.md`

**Interfaces:**
- Consumes: `IntroScreen` at `/`, the public media URLs, `/roulette`, and the existing classic service worker.
- Produces: cache version `wedding-akkey-roulette-v10` with the hero media and roulette route precached, plus browser-level regression coverage for the entry flow.

- [ ] **Step 1: Write browser tests for entry, fallback, responsive behavior, and the pending cache contract**

Create `e2e/intro.spec.ts` with these behavior checks:

```ts
test("shows only the muted hero video before completion, then enters the roulette route", async ({ page }) => {
  await page.goto("/");
  const video = page.getByTestId("hero-video");
  await expect(video).toHaveJSProperty("muted", true);
  await expect(video).toHaveAttribute("playsinline", "");
  await expect(page.getByRole("button", { name: "GAME START" })).toHaveCount(0);
  await video.evaluate((element) => element.dispatchEvent(new Event("ended")));
  await page.getByRole("button", { name: "GAME START" }).click();
  await expect(page).toHaveURL(/\/roulette$/);
  await expect(page.getByRole("button", { name: "ENTER" })).toBeVisible();
});

test("uses the start image after a video error and respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByTestId("hero-video").evaluate((element) => element.dispatchEvent(new Event("error")));
  const start = page.getByRole("button", { name: "GAME START" });
  await expect(start.locator("img")).toHaveAttribute("src", "/media/game-start.png");
  expect(await start.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});

test("keeps the complete video and start image visible at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("hero-video")).toBeInViewport();
  await page.getByTestId("hero-video").evaluate((element) => element.dispatchEvent(new Event("ended")));
  await expect(page.getByRole("button", { name: "GAME START" })).toBeInViewport();
});

test("precaches hero media and the roulette route", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(async () => {
    const cachesForApp = await caches.keys();
    const cache = await caches.open(cachesForApp.find((name) => name === "wedding-akkey-roulette-v10")!);
    const matches = await Promise.all(["/roulette", "/media/akkey-roulette-hero-web.mp4", "/media/game-start.png"].map((path) => cache.match(path)));
    return matches.every(Boolean);
  })).toBe(true);
  await page.context().setOffline(true);
  try {
    await page.goto("/roulette");
    await expect(page.getByRole("button", { name: "ENTER" })).toBeVisible();
  } finally {
    await page.context().setOffline(false);
  }
});
```

- [ ] **Step 2: Run the entry tests and verify the expected pre-cache failure**

Run: `node node_modules/@playwright/test/cli.js test e2e/intro.spec.ts`

Expected: the three visual/interaction tests PASS; the cache-contract test FAILS because `public/sw.js` does not yet precache the two media files or `/roulette` under cache version `v10`.

- [ ] **Step 3: Update service-worker cache routing for the new entry flow**

Update `public/sw.js` as follows:

```js
const CACHE_NAME = "wedding-akkey-roulette-v10";
const PRECACHE_URLS = [
  "/",
  "/roulette",
  "/media/akkey-roulette-hero-web.mp4",
  "/media/game-start.png",
  // retain manifest, icons, audio files, and all 48 existing keychain PNGs
];
```

For `request.mode === "navigate"`, cache and fall back to the actual request before falling back to `/`:

```js
fetch(request)
  .then((response) => {
    const copy = response.clone();
    void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    return response;
  })
  .catch(() => caches.match(request).then((response) => response || caches.match("/")).then((response) => response || Response.error()))
```

- [ ] **Step 4: Re-run the entry suite to verify the media and route are actually cached**

Run: `node node_modules/@playwright/test/cli.js test e2e/intro.spec.ts`

Expected: PASS. The cache assertion must observe `wedding-akkey-roulette-v10` and cached responses for `/roulette`, the MP4, and the GAME START PNG; it must not inspect the worker source text.

- [ ] **Step 5: Document changed routes and PWA assets**

Update `README.md` to name `/` as the muted video-entry route and `/roulette` as the draw route. Update `docs/acceptance-checklist.md` with the new entry, fallback, reduced-motion, route, and service-worker cache checks. Do not remove existing roulette acceptance items.

- [ ] **Step 6: Run the entry tests and entire verification suite**

Run:

```bash
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
node scripts/lint.mjs
node node_modules/@playwright/test/cli.js test
node node_modules/next/dist/bin/next build --webpack
git diff --check
```

Expected: all tests pass, TypeScript and lint produce no errors, webpack build exits 0, and `git diff --check` produces no output.

- [ ] **Step 7: Commit the cache, end-to-end coverage, and documentation**

```bash
git add public/sw.js e2e/intro.spec.ts README.md docs/acceptance-checklist.md
git commit -m "feat: cache hero video entry assets"
```

## Plan self-review

- Spec coverage: Task 1 covers full-screen muted video, no visible controls while playing, supplied start-image button, accessibility, fallback, and reduced motion. Task 2 preserves the existing roulette at `/roulette` and its local storage behavior. Task 3 covers the media, route precache, offline fallback behavior, documentation, and browser checks.
- Placeholder scan: no incomplete markers, deferred implementation, or unnamed tests remain.
- Type consistency: `IntroScreen` is the only new component; the exact `data-testid`, button name, media URLs, and `/roulette` route are used consistently in all tasks.
- Review focus: every listed input condition has a concrete test step in Task 1 or Task 3.
