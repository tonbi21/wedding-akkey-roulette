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
  await page.goto("/roulette/play");
  await expect(page).toHaveURL(/\/roulette\/play$/);
  await expect(page.getByRole("img", { name: "WEDDING AKKEY-ROULETTE" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "START" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/PLAY COUNT/, { exact: false })).toHaveCount(0);
  await expect(page.locator(".roulette-stage")).toHaveCSS("background-color", "rgb(195, 195, 195)");
  await expect(page.getByText("›››")).toHaveCount(0);
  const titleBounds = await page.getByRole("img", { name: "WEDDING AKKEY-ROULETTE" }).boundingBox();
  const consoleBounds = await page.locator(".arcade-mock__console").boundingBox();
  expect(titleBounds).not.toBeNull();
  expect(consoleBounds).not.toBeNull();
  expect(titleBounds!.x + titleBounds!.width / 2).toBeCloseTo(consoleBounds!.x + consoleBounds!.width / 2, 0);
  expect(consoleBounds!.y - (titleBounds!.y + titleBounds!.height)).toBeGreaterThanOrEqual(10);
  expect(titleBounds!.height).toBeGreaterThanOrEqual(115);
  expect(consoleBounds!.width).toBeLessThanOrEqual(1160);
  expect(consoleBounds!.y).toBeGreaterThanOrEqual(150);
  expect(720 - (consoleBounds!.y + consoleBounds!.height)).toBeGreaterThanOrEqual(15);
  const contentTop = titleBounds!.y;
  const contentBottom = consoleBounds!.y + consoleBounds!.height;
  expect(Math.abs(contentTop - (720 - contentBottom))).toBeLessThanOrEqual(8);
  expect(titleBounds!.height).toBeCloseTo(115.2, 0);
  expect(titleBounds!.width).toBeCloseTo(664, 0);
  expect(consoleBounds!.height).toBeCloseTo(535.68, 0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  await expect(page.locator(".ballpit")).toHaveCount(0);
});

test("suppresses inherited scanlines on the live roulette stage", async ({ page }) => {
  expect(await page.locator(".roulette-stage").evaluate(
    (stage) => getComputedStyle(stage, "::after").display
  )).toBe("none");
});

test("aligns the play header image with the how-to-play header image", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const playTitle = await page.getByRole("img", { name: "WEDDING AKKEY-ROULETTE" }).boundingBox();

  await page.goto("/roulette");
  const howToPlayTitle = await page.getByRole("img", { name: "WEDDING AKKEY-ROULETTE" }).boundingBox();

  expect(playTitle).not.toBeNull();
  expect(howToPlayTitle).not.toBeNull();
  expect(playTitle!.y).toBeCloseTo(howToPlayTitle!.y, 0);
});

test("keeps the READY prompt close to its keychain silhouette", async ({ page }) => {
  const mysteryBounds = await page.locator(".arcade-mock__mystery").boundingBox();
  const readyBounds = await page.getByText("READY?", { exact: true }).boundingBox();

  expect(mysteryBounds).not.toBeNull();
  expect(readyBounds).not.toBeNull();
  expect(readyBounds!.y - (mysteryBounds!.y + mysteryBounds!.height)).toBeLessThanOrEqual(8);
});

test("does not expose the retired roulette_ver2 mock route", async ({ page }) => {
  const response = await page.goto("/roulette_ver2");

  expect(response?.status()).toBe(404);
});

test("keeps MATCH RESULTS visibly focused for keyboard users", async ({ page }) => {
  const resultsTrigger = page.locator(".arcade-live__results-trigger");

  await resultsTrigger.focus();

  await expect(resultsTrigger).toHaveCSS("outline-color", "rgb(70, 242, 62)");
  await expect(resultsTrigger).toHaveCSS("outline-width", "4px");
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
  await page.getByRole("button", { name: "当選者を表示", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img")).toHaveCount(3);
  await expect(dialog.getByText("PRIZE", { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("heading", { name: "RESULTS" })).toHaveCSS("color", "rgb(0, 0, 0)");
  await expect(dialog.getByRole("heading", { name: "RESULTS" })).toHaveCSS("font-size", "32px");
  await expect(dialog.getByRole("img", { name: "高級チョコの景品" })).toHaveAttribute("src", "/media/prize-1.png");
  await expect(dialog.getByRole("img", { name: "季節のフルーツの景品" })).toHaveAttribute("src", "/media/prize-2.png");
  await expect(dialog.getByRole("img", { name: "神戸牛食べ比べセットの景品" })).toHaveAttribute("src", "/media/prize-3.png");
  expect(await dialog.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
  const keychainBounds = await dialog.locator(".history-dialog__keychain").first().boundingBox();
  const prizeBounds = await dialog.locator(".history-dialog__prize-placeholder").first().boundingBox();
  expect(keychainBounds).not.toBeNull();
  expect(prizeBounds).not.toBeNull();
  expect(keychainBounds!.width).toBeGreaterThan(144);
  expect(prizeBounds!.width).toBeGreaterThan(144);
  expect(keychainBounds!.width).toBeLessThanOrEqual(168);
  expect(prizeBounds!.width).toBeLessThanOrEqual(168);
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
  await expect(page.getByRole("button", { name: "START" })).toBeVisible();
  await expect(app).toHaveAttribute("data-winner-count", "0");
  await page.getByRole("button", { name: "当選者を表示", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toHaveCount(0);
  await page.getByRole("button", { name: "当選者を閉じる" }).click();
  await page.reload();
  await completeRound(page);
  await page.reload();
  await expect(app).toHaveAttribute("data-phase", "idle");
  await expect(app).toHaveAttribute("data-winner-count", "1");
});

test("reload restores the next round from persisted history", async ({ page }) => {
  await completeRound(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "START" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "当選者を表示", exact: true }).click();
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
      await page.getByRole("button", { name: "当選者を表示", exact: true }).click();
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
  await page.getByRole("button", { name: "START" }).click();
  await expect(image).toHaveAttribute("src", finalImage);
  await page.getByRole("button", { name: "STOP" }).click();
  await expect(image).toHaveAttribute("src", finalImage);
  await page.getByRole("button", { name: "当選者を表示", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toHaveAttribute("src", await image.getAttribute("src") as string);
});

test("keeps keychain surfaces square with expanded white backgrounds", async ({ page }) => {
  const app = page.locator("main");
  await page.getByRole("button", { name: "START" }).click();
  await page.getByRole("button", { name: "STOP" }).click();

  const keychainSurface = await page.locator(".arcade-live__keychain-display").boundingBox();
  const keychainImage = await page.getByRole("img", { name: "Current roulette image" }).boundingBox();
  const resultSurface = await page.locator(".arcade-live__result-surface").first().boundingBox();
  const resultImage = await page.locator(".arcade-live__result-image").first().boundingBox();
  const unknownSurface = await page.locator(".arcade-mock__prize-unknown").first().boundingBox();
  expect(keychainSurface).not.toBeNull();
  expect(keychainImage).not.toBeNull();
  expect(resultSurface).not.toBeNull();
  expect(resultImage).not.toBeNull();
  expect(unknownSurface).not.toBeNull();
  expect(keychainSurface!.width).toBeCloseTo(keychainSurface!.height, 0);
  expect(keychainSurface!.width).toBeGreaterThan(310);
  expect(keychainImage!.width).toBeGreaterThanOrEqual(250);
  expect(keychainSurface!.width - keychainImage!.width).toBeGreaterThanOrEqual(70);
  expect(resultSurface!.width).toBeCloseTo(resultSurface!.height, 0);
  expect(resultSurface!.width).toBeCloseTo(unknownSurface!.width, 0);
  expect(resultSurface!.width - resultImage!.width).toBeGreaterThanOrEqual(18);
  await expect(page.getByText("---", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Current roulette image" })).toHaveCSS("filter", "none");
  await expect(page.locator(".arcade-mock__corner")).toHaveCount(0);
  await expect(page.locator(".arcade-live__result-surface").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".arcade-live__result-surface").first()).toHaveCSS("border-color", "rgb(51, 51, 51)");
  const retryStyles = await app.getByRole("button", { name: "RETRY" }).evaluate((button) => ({
    alignItems: getComputedStyle(button).alignItems,
    display: getComputedStyle(button).display,
    fontSize: Number.parseFloat(getComputedStyle(button).fontSize)
  }));
  expect(retryStyles.display).toBe("grid");
  expect(retryStyles.alignItems).toBe("center");
  expect(retryStyles.fontSize).toBeGreaterThan(30);
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`shows the stopped winner without a drop animation at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const app = page.locator("main");
    const image = app.getByRole("img", { name: "Current roulette image" });

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
      expect(await image.evaluate((element) => element.getAnimations().length)).toBe(0);
      await expect(page.getByTestId("winner-overlay")).toHaveCount(0);
      await expect(page.getByText("MATCH!")).toHaveCount(0);
      if (round === 1) {
        await page.screenshot({ path: testInfo.outputPath("winner-stopped.png") });
      }
      await app.getByRole("button", { name: "NEXT" }).click();
      await expect(app).toHaveAttribute("data-phase", "idle");
      await expect(page.locator(".roulette-stage img")).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  });
}

test("NEXT clears the stopped image without leaving an extra image", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "START" }).click();
  await page.getByRole("button", { name: "STOP" }).click();
  await page.getByRole("button", { name: "NEXT", exact: true }).click();
  await expect(page.locator(".roulette-stage img")).toHaveCount(0);
  await expect(page.getByText("READY?")).toBeVisible();
});

test("reduced motion keeps the winner static after stopping", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "START" }).click();
  await page.getByRole("button", { name: "STOP" }).click();
  const image = page.getByRole("img", { name: "Current roulette image" });
  await expect(page.locator(".roulette-stage img")).toHaveCount(1);
  await expect(image).toBeInViewport();
  expect(await image.evaluate((element) => element.getAnimations().length)).toBe(0);
  await expect(page.getByTestId("winner-overlay")).toHaveCount(0);
});
