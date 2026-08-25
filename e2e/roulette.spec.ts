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

  await expect(page.getByText("抽選終了")).toBeVisible();
  await page.getByRole("button", { name: /history/i }).click();
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

test("reload restores the next round from persisted history", async ({ page }) => {
  await completeRound(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "START" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /history/i }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toHaveCount(1);
});
