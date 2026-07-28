import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke — run against a started web server:
 *   pnpm --filter @ai-base/web dev
 *   pnpm --filter @ai-base/web test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    ...devices["Desktop Chrome"],
  },
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: "pnpm exec next dev --port 3000",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
