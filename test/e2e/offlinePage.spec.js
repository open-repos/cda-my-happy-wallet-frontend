import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";

const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
for (const colorScheme of ["light", "dark"])
  for (const viewport of viewports) {
    test(`neutral offline page is usable in ${colorScheme} at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme });
      await prepareProtectedPage(page, { authenticated: false });
      const apiCalls = [];
      page.on("request", (request) => {
        if (new URL(request.url()).pathname.startsWith("/v1/"))
          apiCalls.push(request.url());
      });
      await page.addInitScript(() => {
        localStorage.setItem(
          "offline-private-fixture",
          "synthetic-private-offline-owner"
        );
      });
      await page.goto("/offline.html");
      await expect(
        page.getByRole("heading", { name: "Vous êtes hors ligne", level: 1 })
      ).toBeVisible();
      await expect(page.getByRole("main")).not.toContainText(
        "synthetic-private-offline-owner"
      );
      const retry = page.getByRole("link", { name: "Réessayer", exact: true });
      expect((await retry.boundingBox()).height).toBeGreaterThanOrEqual(44);
      const contrasts = await page.evaluate(() => {
        const rgb = (color) =>
          color
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number);
        const luminance = (color) =>
          rgb(color)
            .map((v) => {
              const c = v / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
        const ratio = (a, b) => {
          const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
          return (values[0] + 0.05) / (values[1] + 0.05);
        };
        const surface = getComputedStyle(
          document.querySelector("main")
        ).backgroundColor;
        return [...document.querySelectorAll("h1, p, a")].map((element) => {
          const style = getComputedStyle(element);
          return ratio(
            style.color,
            element.tagName === "A" ? style.backgroundColor : surface
          );
        });
      });
      expect(Math.min(...contrasts)).toBeGreaterThanOrEqual(4.5);
      await page.keyboard.press("Tab");
      await expect(retry).toBeFocused();
      expect(
        await retry.evaluate((element) =>
          parseFloat(getComputedStyle(element).outlineWidth)
        )
      ).toBeGreaterThanOrEqual(3);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        )
      ).toBe(false);
      await page.locator("html").evaluate((element) => {
        element.style.fontSize = "200%";
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        )
      ).toBe(false);
      await retry.scrollIntoViewIfNeeded();
      await expect(retry).toBeVisible();
      expect(apiCalls).toEqual([]);
      // A retry returns through the normal route/auth boundary, without replaying a write.
      await retry.press("Enter");
      await expect(
        page.getByRole("heading", { name: /Bienvenue sur MyHappyWallet/i })
      ).toBeVisible();
    });
  }
