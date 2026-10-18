import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/visual",
  testMatch: "**/*.spec.js",
  fullyParallel: true,
  workers: process.env.CI ? 4 : 2,
  forbidOnly: true,
  retries: 0,
  updateSnapshots: "none",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.002,
      threshold: 0.15,
    },
  },
  snapshotPathTemplate: "{testDir}/snapshots/{projectName}/{arg}{ext}",
  reporter: "list",
  outputDir: "test-results/web-visual",
  use: {
    baseURL: "http://127.0.0.1:4173",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "tablet",
      use: { viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command:
      "npx vite build --config test/visual/vite.config.mjs && npx vite preview --config test/visual/vite.config.mjs",
    url: "http://127.0.0.1:4173/login",
    timeout: 120_000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
  },
});
