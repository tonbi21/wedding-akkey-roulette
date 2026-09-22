import { expect, test } from "@playwright/test";

test("shows only the muted hero video before completion, then enters the roulette route", async ({ page }) => {
  await page.goto("/");
  const video = page.getByTestId("hero-video");
  await expect(video).toHaveJSProperty("muted", true);
  await expect(video).toHaveAttribute("playsinline", "");
  await expect(page.getByRole("button", { name: "GAME START" })).toHaveCount(0);
  await video.evaluate((element) => element.dispatchEvent(new Event("ended")));
  const start = page.getByRole("button", { name: "GAME START" });
  await expect(video).toBeVisible();
  await expect(start).toBeVisible();
  const startBox = await start.boundingBox();
  expect(startBox).not.toBeNull();
  expect(startBox!.x + startBox!.width / 2).toBeCloseTo((await page.viewportSize())!.width / 2, 1);
  expect(startBox!.y).toBeGreaterThan((await page.viewportSize())!.height / 2);
  await start.click();
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

test("replays an online-warmed roulette route offline", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(async () => {
    const cachesForApp = await caches.keys();
    const cache = await caches.open(cachesForApp.find((name) => name === "wedding-akkey-roulette-v10")!);
    const matches = await Promise.all(["/", "/roulette", "/media/akkey-roulette-hero-web.mp4", "/media/game-start.png"].map((path) => cache.match(path)));
    return matches.every(Boolean);
  })).toBe(true);
  await page.goto("/roulette");
  await expect(page.getByRole("button", { name: "ENTER" })).toBeVisible();
  await page.context().setOffline(true);
  try {
    await page.goto("/roulette");
    await expect(page.getByRole("button", { name: "ENTER" })).toBeVisible();
  } finally {
    await page.context().setOffline(false);
  }
});
