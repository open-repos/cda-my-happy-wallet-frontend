import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";

const viewports = [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

for (const theme of ["light", "dark"]) {
  for (const viewport of viewports) {
    test(`updated and theoretical RAV at ${viewport.width}px in ${theme}`, async ({
      page,
    }) => {
      await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
      await page.setViewportSize(viewport);
      await prepareProtectedPage(page);
      await page.addInitScript((value) => {
        localStorage.setItem("mhw-theme", value);
      }, theme);

      await page.goto("/home");
      await expect(page.locator(".home-budget__amount-current")).toHaveText(
        /767,50\s*€/
      );
      await expect(page.locator(".home-budget__amount-theoretical")).toHaveText(
        /1\s*200,00\s*€/
      );
      await expect(page.getByRole("progressbar")).toHaveAccessibleName(
        /767,50\s*€ sur 1\s*200,00\s*€ théorique/
      );
      await page
        .getByRole("button", { name: "Voir le détail du calcul" })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Détail du calcul" })
      ).toContainText("Reste à vivre actualisé");
      await page.getByRole("button", { name: "Fermer", exact: true }).click();

      await page.goto("/calendrier");
      await page.getByText("Prévisionnel", { exact: true }).click();
      const forecastLabel = page.getByText("Prévisionnel", { exact: true });
      await expect(forecastLabel).toBeVisible();
      expect((await forecastLabel.boundingBox()).width).toBeGreaterThan(70);
      await expect(
        page.getByRole("status", { name: "Repère théorique du calendrier" })
      ).toContainText(/Théorique\s*1\s*200,00\s*€.*part du jour\s*38,71\s*€/);
      const twentieth = page.getByRole("button", {
        name: /^20 octobre 2026, .*reste à vivre du jour 611,50\s*€ sur 774,19\s*€ théorique/,
      });
      await expect(twentieth).toBeVisible();
      await twentieth.click();
      await expect(page.getByText(/^Reste à vivre du jour :/)).toContainText(
        /611,50\s*€ \/ 774,19\s*€ théorique/
      );

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1
        )
      ).toBe(true);
    });
  }
}
