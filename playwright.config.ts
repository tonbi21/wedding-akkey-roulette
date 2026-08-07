import { defineConfig, devices } from "@playwright/test";

const nodeBinary = process.env.WEDDING_ROULETTE_NODE ?? "node";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"]
  },
  webServer: {
    command: `${nodeBinary} node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100`,
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
