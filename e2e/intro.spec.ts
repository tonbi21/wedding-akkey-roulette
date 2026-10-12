import { expect, test } from "@playwright/test";

test("starts the muted hero video and BGM after TAP TO START, then shows instructions before the roulette", async ({ page }) => {
  await page.goto("/");
  const video = page.getByTestId("hero-video");
  const audio = page.getByTestId("intro-audio");
  const tap = page.getByRole("button", { name: "TAP TO START" });
  await expect(video).toHaveJSProperty("muted", true);
  await expect(video).toHaveAttribute("playsinline", "");
  await expect(tap.locator("img")).toHaveAttribute("src", "/media/tap-to-start.png");
  await expect(page.getByRole("button", { name: "GAME START" })).toHaveCount(0);
  const tapBox = await tap.boundingBox();
  expect(tapBox).not.toBeNull();
  await tap.click();
  await expect(tap).toHaveCount(0);
  await expect.poll(() => video.evaluate((element) => !element.paused)).toBe(true);
  await expect.poll(() => audio.evaluate((element) => !element.paused)).toBe(true);
  await video.evaluate((element) => element.dispatchEvent(new Event("ended")));
  await expect.poll(() => audio.evaluate((element) => element.paused)).toBe(true);
  const start = page.getByRole("button", { name: "GAME START" });
  await expect(video).toBeVisible();
  await expect(start).toBeVisible();
  const startBox = await start.boundingBox();
  expect(startBox).not.toBeNull();
  expect(startBox!.x + startBox!.width / 2).toBeCloseTo((await page.viewportSize())!.width / 2, 1);
  expect(startBox!.x + startBox!.width / 2).toBeCloseTo(tapBox!.x + tapBox!.width / 2, 1);
  expect(startBox!.y + startBox!.height).toBeCloseTo(tapBox!.y + tapBox!.height, 1);
  await start.click();
  await expect(page).toHaveURL(/\/roulette$/);
  await expect(page.getByRole("heading", { name: "HOW TO PLAY" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ROULETTE START" })).toBeVisible();
  await page.getByRole("button", { name: "ROULETTE START" }).click();
  await expect(page).toHaveURL(/\/roulette\/play$/);
  await expect(page.getByRole("button", { name: "START" })).toBeVisible();
});

test("uses the start image after a video error and respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "TAP TO START" }).click();
  await page.getByTestId("hero-video").evaluate((element) => element.dispatchEvent(new Event("error")));
  const start = page.getByRole("button", { name: "GAME START" });
  await expect(start.locator("img")).toHaveAttribute("src", "/media/game-start.png");
  expect(await start.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});

test("keeps the complete video and start image visible at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("hero-video")).toBeInViewport();
  await page.getByRole("button", { name: "TAP TO START" }).click();
  await page.getByTestId("hero-video").evaluate((element) => element.dispatchEvent(new Event("ended")));
  await expect(page.getByRole("button", { name: "GAME START" })).toBeInViewport();
});

test("replays an online-warmed roulette route offline", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(async () => {
    const cachesForApp = await caches.keys();
    const cache = await caches.open(cachesForApp.find((name) => name === "wedding-akkey-roulette-v14")!);
    const matches = await Promise.all(["/", "/roulette", "/roulette/play", "/media/akkey-roulette-hero-web-h264.mp4", "/media/tap-to-start.png", "/media/game-start.png", "/audio/wedding_akkey_roulette_retro_game_10s.mp3"].map((path) => cache.match(path)));
    return matches.every(Boolean);
  })).toBe(true);
  await page.goto("/roulette/play");
  await expect(page.getByRole("button", { name: "START" })).toBeVisible();
  await page.context().setOffline(true);
  try {
    await page.goto("/roulette/play");
    await expect(page.getByRole("button", { name: "START" })).toBeVisible();
  } finally {
    await page.context().setOffline(false);
  }
});
