import { expect, test } from "@playwright/test";
import { prepareSavingsPage } from "../e2e/savingsFixture.mjs";
import { prepareFullContentCapture } from "./fullContentCapture.mjs";

for (const theme of ["light", "dark"])
  test(`savings overview and transfer ${theme}`, async ({ page }) => {
    await prepareSavingsPage(page);
    await page.addInitScript(
      (theme) => localStorage.setItem("mhw-theme", theme),
      theme
    );
    await page.goto("/coffre");
    const card = page.getByRole("article", {
      name: "Voyage au Japon",
      exact: true,
    });
    await expect(card).toContainText("60 %");
    await prepareFullContentCapture(page);
    await expect(page).toHaveScreenshot(`savings-${theme}.png`, {
      fullPage: true,
    });
    await card.getByRole("button", { name: "↓ Déposer" }).click();
    await page.getByLabel("Montant à déposer").fill("150,00");
    await expect(page).toHaveScreenshot(`savings-transfer-${theme}.png`);
  });
