import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 1,
  reporter: "html",
  use: { baseURL: "http://127.0.0.1:5173", trace: "on-first-retry" },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173/api/health",
    reuseExistingServer: true,
    env: {
      ADMIN_PASSWORD: "e2e-admin-password",
      ADMIN_SESSION_SECRET: "e2e-only-session-secret-that-is-long-enough",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
