import { expect, test } from "@playwright/test";

test("gives each projector rule room after removing the confirmation prompt", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto("/roulette");

  const screenPanel = page.locator(".how-to-play__screen");
  const title = page.getByRole("img", { name: "WEDDING AKKEY-ROULETTE" });
  const firstRule = screenPanel.locator("li p").first();
  const rules = screenPanel.locator("li");

  await expect(firstRule).toBeVisible();
  expect(Number.parseFloat(await firstRule.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(25);
  await expect(page.getByText("ルールを確認したら START!")).toHaveCount(0);
  expect(await rules.evaluateAll((items) => items.every((item) => item.getBoundingClientRect().height >= 54))).toBe(true);
  expect((await title.boundingBox())!.height).toBeLessThanOrEqual(120);
  expect((await screenPanel.boundingBox())!.height).toBeGreaterThanOrEqual(510);
});

test("keeps the title clear of the enlarged instruction panel at projection height", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/roulette");

  const title = page.getByRole("img", { name: "WEDDING AKKEY-ROULETTE" });
  const screenPanel = page.locator(".how-to-play__screen");
  const titleBox = await title.boundingBox();
  const screenBox = await screenPanel.boundingBox();

  expect(titleBox).not.toBeNull();
  expect(screenBox).not.toBeNull();
  expect(titleBox!.y + titleBox!.height).toBeLessThanOrEqual(screenBox!.y);
});
