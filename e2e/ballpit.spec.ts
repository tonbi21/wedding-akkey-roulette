import { expect, test } from "@playwright/test";

test("renders 48 transparent image capsules without intercepting roulette controls", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const background = page.locator(".ballpit-background");
  const canvas = background.locator("canvas");
  await expect(background).toHaveAttribute("data-renderer", "webgl", { timeout: 20000 });
  await expect(canvas).toHaveAttribute("data-capsule-count", "48");
  await expect(canvas).toHaveAttribute("data-image-count", "48");
  expect(await background.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
  // This checks ambient animation; pointer-specific motion is tested against real scene positions in the runtime unit test.
  const before = await canvas.screenshot();
  await expect.poll(async () => (await canvas.screenshot()).equals(before)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("glass-capsules-desktop.png") });
  await page.getByRole("button", { name: "ENTER", exact: true }).click();
  await page.getByRole("button", { name: "START", exact: true }).click();
  await page.getByRole("button", { name: "STOP", exact: true }).click();
  await page.getByRole("button", { name: "RETRY", exact: true }).click();
  await expect(page.getByRole("button", { name: "STOP", exact: true })).toBeVisible();
  await expect(canvas).toHaveAttribute("data-capsule-count", "48");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => canvas.evaluate((element) => element.clientWidth)).toBe(390);
  await page.screenshot({ path: testInfo.outputPath("glass-capsules-mobile.png") });
  expect(errors).toEqual([]);
});

test.describe("touch device", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("background taps do not block touch roulette and retry controls", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ballpit-background")).toHaveAttribute("data-renderer", "webgl", { timeout: 20000 });
    await page.touchscreen.tap(50, 740);
    await page.getByRole("button", { name: "ENTER", exact: true }).tap();
    await page.getByRole("button", { name: "START", exact: true }).tap();
    await page.getByRole("button", { name: "STOP", exact: true }).tap();
    await page.getByRole("button", { name: "RETRY", exact: true }).tap();
    await expect(page.getByRole("button", { name: "STOP", exact: true })).toBeVisible();
    await expect(page.locator(".ballpit-canvas")).toHaveAttribute("data-capsule-count", "48");
  });
});

test("reduced motion pauses the capsules and WebGL context loss keeps controls usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const background = page.locator(".ballpit-background");
  const canvas = background.locator("canvas");
  await expect(background).toHaveAttribute("data-renderer", "webgl", { timeout: 20000 });
  await expect(canvas).toHaveAttribute("data-motion", "paused");
  const still = await canvas.screenshot();
  await page.mouse.move(60, 400);
  expect((await canvas.screenshot()).equals(still)).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(canvas).toHaveAttribute("data-motion", "running");
  await canvas.evaluate((element) => element.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext());
  await expect(background).toHaveAttribute("data-renderer", "fallback");
  await page.getByRole("button", { name: "ENTER", exact: true }).click();
  await page.getByRole("button", { name: "START", exact: true }).click();
  await page.getByRole("button", { name: "STOP", exact: true }).click();
  await expect(page.getByRole("button", { name: "RETRY", exact: true })).toBeVisible();
});
