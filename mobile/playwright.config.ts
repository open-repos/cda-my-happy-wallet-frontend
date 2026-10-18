import { defineConfig } from "@playwright/test";

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    },
  },
  forbidOnly: true,
  fullyParallel: true,
  projects: [
    { name: "mobile", use: { viewport: { height: 740, width: 360 } } },
    { name: "tablet", use: { viewport: { height: 1024, width: 768 } } },
    { name: "desktop", use: { viewport: { height: 900, width: 1440 } } },
  ],
  reporter: "list",
  retries: process.env.CI ? 1 : 0,
  testDir: "./test/visual",
  use: {
    baseURL: "http://127.0.0.1:4174",
    colorScheme: "light",
    locale: "fr-FR",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "EXPO_PUBLIC_API_ORIGIN=http://127.0.0.1:4174 npx expo export --platform web --clear && npm run serve:test",
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://127.0.0.1:4174/sign-in",
  },
});
