import { expect, test } from "@playwright/test";

test("gives each projector rule room after removing the confirmation prompt", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto("/roulette");

  const screenPanel = page.locator(".how-to-play__screen");
  const consolePanel = page.locator(".how-to-play__console");
  const title = page.getByRole("img", { name: "WEDDING AKKEY-ROULETTE" });
  const heading = page.getByRole("heading", { name: "HOW TO PLAY" });
  const firstRule = screenPanel.locator("li p").first();
  const rules = screenPanel.locator("li");

  await expect(firstRule).toBeVisible();
  expect(Number.parseFloat(await firstRule.evaluate((element) => getComputedStyle(element).fontSize))).toBe(24);
  await expect(page.getByText("ルールを確認したら START!")).toHaveCount(0);
  expect(await rules.evaluateAll((items) => items.every((item) => item.getBoundingClientRect().height >= 54))).toBe(true);
  expect((await title.boundingBox())!.height).toBeCloseTo(120, 0);
  expect((await screenPanel.boundingBox())!.height).toBeGreaterThanOrEqual(444);
  expect((await consolePanel.boundingBox())!.width).toBeLessThanOrEqual(1250);
  const consoleBounds = await consolePanel.boundingBox();
  expect(consoleBounds).not.toBeNull();
  expect(consoleBounds!.y).toBeGreaterThanOrEqual(150);
  expect(810 - (consoleBounds!.y + consoleBounds!.height)).toBeGreaterThanOrEqual(32);
  const contentTop = (await title.boundingBox())!.y;
  const contentBottom = consoleBounds!.y + consoleBounds!.height;
  expect(Math.abs(contentTop - (810 - contentBottom))).toBeLessThanOrEqual(8);
  expect(Number.parseFloat(await heading.evaluate((element) => getComputedStyle(element).fontSize))).toBeLessThan(45);
  expect(await page.locator(".how-to-play__subtitle").evaluate((element) =>
    getComputedStyle(element, "::before").display
  )).toBe("none");
});

test("keeps the title clear of the enlarged instruction panel at projection height", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/roulette");

  const title = page.getByRole("img", { name: "WEDDING AKKEY-ROULETTE" });
  const screenPanel = page.locator(".how-to-play__screen");
  const consolePanel = page.locator(".how-to-play__console");
  const titleBox = await title.boundingBox();
  const screenBox = await screenPanel.boundingBox();
  const consoleBox = await consolePanel.boundingBox();

  expect(titleBox).not.toBeNull();
  expect(screenBox).not.toBeNull();
  expect(consoleBox).not.toBeNull();
  expect(titleBox!.y + titleBox!.height).toBeLessThanOrEqual(screenBox!.y);
  expect(titleBox!.height).toBeCloseTo(115.2, 0);
  expect(titleBox!.width).toBeCloseTo(664, 0);
  expect(consoleBox!.height).toBeCloseTo(535.68, 0);
});

test("uses flat neutral panels with black copy and orange emphasis", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto("/roulette");

  const screenPanel = page.locator(".how-to-play__screen");
  const prizePanel = page.locator(".how-to-play__prizes");

  await expect(screenPanel).toHaveCSS("background-color", "rgb(195, 195, 195)");
  await expect(prizePanel).toHaveCSS("background-color", "rgb(195, 195, 195)");
  await expect(screenPanel.locator("li p").first()).toHaveCSS("color", "rgb(0, 0, 0)");
  await expect(screenPanel.locator("li strong").first()).toHaveCSS("color", "rgb(234, 83, 36)");
  await expect(prizePanel.getByRole("heading", { name: "PRIZE" })).toHaveCSS("color", "rgb(0, 0, 0)");
  await expect(screenPanel.locator("li > span").first()).toHaveCSS("background-color", "rgb(47, 170, 102)");
  await expect(page.getByRole("button", { name: "ROULETTE START" })).toHaveCSS("background-color", "rgb(47, 170, 102)");
  await expect(page.locator(".how-to-play__corner")).toHaveCount(0);
});

test("lays out each prize as black text beside a square image area", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto("/roulette");

  const prizes = page.locator(".how-to-play__prizes li");
  const expectedPrizes = ["高級チョコ", "季節のフルーツ", "神戸牛食べ比べセット"];

  await expect(prizes).toHaveCount(3);
  for (const [index, prize] of (await prizes.all()).entries()) {
    const info = prize.locator(".how-to-play__prize-info");
    const name = prize.locator(".how-to-play__prize-name");
    const image = prize.locator(".how-to-play__prize-image");

    await expect(info).toBeVisible();
    await expect(name).toHaveText(expectedPrizes[index]);
    await expect(name).toHaveCSS("color", "rgb(0, 0, 0)");
    await expect(name).toHaveCSS("font-size", "17.6px");
    await expect(image).toHaveAttribute("src", `/media/prize-${index + 1}.png`);
    await expect(image).toHaveAccessibleName(`${expectedPrizes[index]}の景品`);

    const infoBox = await info.boundingBox();
    const imageBox = await image.boundingBox();
    expect(infoBox).not.toBeNull();
    expect(imageBox).not.toBeNull();
    expect(imageBox!.x).toBeGreaterThan(infoBox!.x);
    expect(imageBox!.width).toBeCloseTo(imageBox!.height, 1);
  }
});
