import { defineConfig, devices } from "@playwright/test";

if (process.env.MHW_E2E !== "1" || !process.env.E2E_PASSWORD) {
  throw new Error(
    "Use npm run test:e2e:stack to create an isolated environment."
  );
}

export default defineConfig({
  testDir: "./test/full-stack/journeys",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  outputDir: "/tmp/mhw-e2e-results",
  // Reports/traces can contain cookies, JWTs and form values. Keep them off.
  preserveOutput: "never",
  use: {
    baseURL: "http://127.0.0.1:4175",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "off",
    screenshot: "off",
    video: "off",
    serviceWorkers: "block",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    {
      name: "tablet",
      use: { viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command:
      "npx vite build --config test/full-stack/vite.config.mjs && npx vite preview --config test/full-stack/vite.config.mjs",
    url: "http://127.0.0.1:4175/login",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
