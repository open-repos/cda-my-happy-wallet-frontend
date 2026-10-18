import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/pwa-policy",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4175",
    serviceWorkers: "allow",
    trace: "off",
    screenshot: "off",
    video: "off",
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
    command: "node test/pwa-policy/server.mjs",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
    timeout: 10000,
  },
});
