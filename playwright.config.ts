import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

const fallbackAdminPassword = "e2e-admin-password";
const localDevVarsPath = new URL(".dev.vars", import.meta.url);
const localAdminPassword = existsSync(localDevVarsPath)
  ? readFileSync(localDevVarsPath, "utf8")
      .split(/\r?\n/)
      .find((line) => line.startsWith("ADMIN_PASSWORD="))
      ?.slice("ADMIN_PASSWORD=".length)
      .trim()
      .replace(/^['"]|['"]$/g, "")
  : undefined;
const e2eAdminPassword = localAdminPassword || fallbackAdminPassword;

process.env.E2E_ADMIN_PASSWORD = e2eAdminPassword;

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
      ADMIN_PASSWORD: e2eAdminPassword,
      ADMIN_SESSION_SECRET: "e2e-only-session-secret-that-is-long-enough",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
