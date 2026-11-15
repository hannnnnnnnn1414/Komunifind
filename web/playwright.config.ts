import { defineConfig, devices } from "@playwright/test";

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgres://komunifind:komunifind_dev@localhost:5433/komunifind_e2e?sslmode=disable";

export default defineConfig({
  testDir: "./e2e",

  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,

  timeout: 90000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",

    reuseExistingServer: false,
    timeout: 180000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      DEV_LOGIN: "true",
      JWT_SECRET: "e2e-test-secret-min-32-chars-00000000",
      JWT_TTL_HOURS: "168",
      APP_BASE_URL: "http://localhost:3000",
      STORAGE_DRIVER: "local",
      UPLOAD_DIR: "./data/uploads",
      MAX_UPLOAD_BYTES: "5242880",
    },
  },
});
