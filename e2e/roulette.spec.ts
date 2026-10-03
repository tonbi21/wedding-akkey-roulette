import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class TestAudio extends EventTarget {
      currentTime = 0;
      loop = false;
      muted = false;
      paused = true;
      volume = 1;
      src = "";

      constructor(source?: string) {
        super();
        this.src = source ?? "";
        queueMicrotask(() => this.dispatchEvent(new Event("loadeddata")));
      }

      load() {
        queueMicrotask(() => this.dispatchEvent(new Event("loadeddata")));
      }

      pause() {
        this.paused = true;
      }

      play() {
        this.paused = false;
        return Promise.resolve();
      }
    }

    window.Audio = TestAudio as unknown as typeof Audio;
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "ENTER" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "ENTER" }).click();
});

async function completeRound(page: Page, expectIdle = true) {
  const app = page.locator("main");
  await app.getByRole("button", { name: "START" }).click();
  await expect(app.getByRole("button", { name: "STOP" })).toBeVisible({ timeout: 10_000 });
  const stop = app.getByRole("button", { name: "STOP" });
  await stop.evaluate((button) => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await expect(app).toHaveAttribute("data-phase", "winner", { timeout: 10_000 });
  await app.getByRole("button", { name: "NEXT" }).evaluate((button) => button.click());
  if (expectIdle) {
    await expect(app).toHaveAttribute("data-phase", "idle", { timeout: 2_000 });
  }
}

test("completes three rounds and preserves a three-image history", async ({ page }) => {
  await completeRound(page);
  await completeRound(page);
  await completeRound(page, false);

  await expect(page.locator("main")).toHaveAttribute("data-phase", "complete");
  await expect(page.getByRole("button", { name: "START" })).toHaveCount(0);
  await page.getByRole("button", { name: "当選者", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("img")).toHaveCount(3);
});

test("double START does not create a second countdown", async ({ page }) => {
  const app = page.locator("main");
  const start = app.getByRole("button", { name: "START" });
  await start.evaluate((button) => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await expect(app.getByRole("button", { name: "STOP" })).toBeVisible({ timeout: 10_000 });
  await expect(app.getByRole("button", { name: "START" })).not.toBeVisible();
});

test("completed draw can be cancelled or reset, and the next draw survives reload", async ({ page }, testInfo) => {
  const app = page.locator("main");
  const reset = page.getByRole("button", { name: "はじめからやり直す" });
  await expect(reset).toHaveCount(0);
  await completeRound(page);
  await completeRound(page);
  await completeRound(page, false);
  await expect(reset).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("completed-with-reset.png") });

  page.once("dialog", (dialog) => dialog.dismiss());
  await reset.click();
  await expect(app).toHaveAttribute("data-phase", "complete");
  await expect(app).toHaveAttribute("data-winner-count", "3");

  page.once("dialog", (dialog) => dialog.accept());
  await reset.click();
  await expect(page.getByRole("button", { name: "ENTER" })).toBeVisible();
  await expect(app).toHaveAttribute("data-winner-count", "0");
  await page.getByRole("button", { name: "当選者", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toHaveCount(0);
  await page.getByRole("button", { name: "当選者を閉じる" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "ENTER" })).toBeVisible();
  await page.getByRole("button", { name: "ENTER" }).click();
  await completeRound(page);
  await page.reload();
  await expect(app).toHaveAttribute("data-phase", "idle");
  await expect(app).toHaveAttribute("data-winner-count", "1");
});

test("reload restores the next round from persisted history", async ({ page }) => {
  await completeRound(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "START" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "当選者", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toHaveCount(1);
});

test("each round can be retried repeatedly without changing earlier winners", async ({ page }) => {
  const app = page.locator("main");
  const accepted: string[] = [];
  for (let round = 1; round <= 3; round++) {
    await page.getByRole("button", { name: "START", exact: true }).click();
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.getByRole("button", { name: "STOP", exact: true }).click();
      await expect(app).toHaveAttribute("data-winner-count", String(round));
      await expect(page.getByRole("button", { name: "RETRY", exact: true })).toBeVisible();
      await expect(page.locator(".roulette-stage img")).toHaveCount(1);
      if (attempt === 2) break;
      await page.getByRole("button", { name: "RETRY", exact: true }).evaluate((button) => {
        button.click();
        button.click();
      });
      await expect(app).toHaveAttribute("data-phase", "spinning");
      await expect(app).toHaveAttribute("data-winner-count", String(round - 1));
      await expect(page.getByTestId("winner-overlay")).toHaveCount(0);
      await page.getByRole("button", { name: "当選者", exact: true }).click();
      expect(await page.getByRole("dialog").getByRole("img").evaluateAll((images) =>
        images.map((image) => image.getAttribute("src")))).toEqual(accepted);
      await page.getByRole("button", { name: "当選者を閉じる" }).click();
    }
    accepted.push(await page.getByRole("img", { name: "Current roulette image" }).getAttribute("src") as string);
    await page.getByRole("button", { name: "NEXT", exact: true }).click();
  }
  await expect(app).toHaveAttribute("data-phase", "complete");
  await expect(page.getByRole("button", { name: "RETRY", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "はじめからやり直す" })).toBeVisible();
  expect(new Set(accepted).size).toBe(3);
});

for (const round of [1, 2, 3]) {
  test(`reloading during round ${round} retry never restores the cancelled result`, async ({ page }) => {
    for (let previous = 1; previous < round; previous++) await completeRound(page);
    await page.getByRole("button", { name: "START", exact: true }).click();
    await page.getByRole("button", { name: "STOP", exact: true }).click();
    await page.getByRole("button", { name: "RETRY", exact: true }).click();
    await page.reload();
    await expect(page.locator("main")).toHaveAttribute("data-phase", "idle");
    await expect(page.locator("main")).toHaveAttribute("data-winner-count", String(round - 1));
    await completeRound(page, round !== 3);
    await expect(page.locator("main")).toHaveAttribute("data-winner-count", String(round));
    await expect(page.locator("main")).toHaveAttribute("data-phase", round === 3 ? "complete" : "idle");
  });
}

test("all 48 final PNGs decode and the draw only uses final images", async ({ page }) => {
  const sizes = await page.evaluate(async () => Promise.all(
    Array.from({ length: 48 }, async (_, index) => {
      const image = new Image();
      image.src = `/assets/keychains/keychain-${String(index + 1).padStart(2, "0")}.png`;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    })
  ));
  expect(sizes).toHaveLength(48);
  expect(sizes.every(({ width, height }) => width > 0 && height > 0)).toBe(true);
  const image = page.getByRole("img", { name: "Current roulette image" });
  const finalImage = /^\/assets\/keychains\/keychain-(0[1-9]|[1-3][0-9]|4[0-8])\.png$/;
  await expect(image).toHaveAttribute("src", finalImage);
  await page.getByRole("button", { name: "START" }).click();
  await page.getByRole("button", { name: "STOP" }).click();
  await expect(image).toHaveAttribute("src", finalImage);
  await page.getByRole("button", { name: "当選者", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toHaveAttribute("src", await image.getAttribute("src") as string);
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`drops one winner from above the viewport and bounces into place at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const app = page.locator("main");
    const image = app.getByRole("img", { name: "Current roulette image" });
    const restingBounds = await image.boundingBox();
    expect(restingBounds).not.toBeNull();

    for (let round = 1; round <= 2; round++) {
      await app.getByRole("button", { name: "START" }).click();
      await expect(image).toHaveJSProperty("complete", true);
      await app.getByRole("button", { name: "STOP" }).evaluate((button) => {
        button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      await expect(app).toHaveAttribute("data-phase", "winner");
      await expect(app).toHaveAttribute("data-winner-count", String(round));
      await expect(page.locator(".roulette-stage img")).toHaveCount(1);

      const positions = await image.evaluate((element) => {
        const animations = element.getAnimations();
        if (animations.length !== 1) throw new Error(`Expected one drop animation, got ${animations.length}`);
        const animation = animations[0];
        animation.pause();
        const duration = Number(animation.effect!.getComputedTiming().duration);
        animation.currentTime = 0;
        const startBottom = element.getBoundingClientRect().bottom;
        animation.currentTime = duration * 0.56;
        const landingTop = element.getBoundingClientRect().top;
        animation.currentTime = duration * 0.72;
        const bounceTop = element.getBoundingClientRect().top;
        animation.finish();
        const end = element.getBoundingClientRect();
        return { startBottom, landingTop, bounceTop, endTop: end.top, endWidth: end.width };
      });

      expect(positions.startBottom).toBeLessThan(0);
      expect(positions.bounceTop).toBeLessThan(positions.landingTop);
      expect(positions.endTop).toBeCloseTo(restingBounds!.y, 0);
      expect(positions.endWidth).toBeCloseTo(restingBounds!.width, 0);
      await expect(page.getByTestId("winner-overlay")).toBeVisible();
      const contentBottom = await image.evaluate((element) =>
        element.getBoundingClientRect().bottom - parseFloat(getComputedStyle(element).paddingBottom)
      );
      const badgeBounds = await page.getByTestId("winner-overlay").boundingBox();
      expect(contentBottom).toBeLessThanOrEqual(badgeBounds!.y);
      if (round === 1) {
        const fallingBounds = await image.evaluate(async (element) => {
          const animation = element.getAnimations()[0];
          animation.pause();
          await animation.ready;
          animation.currentTime = Number(animation.effect!.getComputedTiming().duration) * 0.52;
          const bounds = element.getBoundingClientRect();
          return { top: bounds.top, bottom: bounds.bottom };
        });
        expect(fallingBounds.top).toBeLessThan(restingBounds!.y);
        expect(fallingBounds.bottom).toBeGreaterThan(0);
        await page.screenshot({ path: testInfo.outputPath("winner-falling.png") });
        await image.evaluate((element) => element.getAnimations()[0].finish());
        await page.screenshot({ path: testInfo.outputPath("winner-landed.png") });
      }
      await app.getByRole("button", { name: "NEXT" }).click();
      await expect(app).toHaveAttribute("data-phase", "idle");
      expect(await image.evaluate((element) => element.getAnimations().length)).toBe(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("NEXT cancels a drop in progress without leaving an extra image", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "START" }).click();
  await page.getByRole("button", { name: "STOP" }).click();
  const image = page.getByRole("img", { name: "Current roulette image" });
  await image.evaluate((element) => {
    const animation = element.getAnimations()[0];
    animation.pause();
    animation.currentTime = 400;
  });
  await page.getByRole("button", { name: "NEXT", exact: true }).click();
  expect(await image.evaluate((element) => element.getAnimations().length)).toBe(0);
  await expect(page.locator(".roulette-stage img")).toHaveCount(1);
  await expect(image).toBeInViewport();
});

test("reduced motion shows the winner immediately without dropping", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "START" }).click();
  await page.getByRole("button", { name: "STOP" }).click();
  const image = page.getByRole("img", { name: "Current roulette image" });
  await expect(page.locator(".roulette-stage img")).toHaveCount(1);
  await expect(image).toBeInViewport();
  expect(await image.evaluate((element) => element.getAnimations().length)).toBe(0);
  await expect(page.getByTestId("winner-overlay")).toBeVisible();
});
