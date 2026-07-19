import { expect, test } from "@playwright/test";

test("navigates from login to registration", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: /Bienvenue sur MyHappyWallet/i })
  ).toBeVisible();
  await page.getByRole("link", { name: /Enregistrez vous ici/i }).click();

  await expect(page).toHaveURL(/\/register$/);
  await expect(
    page.getByRole("button", { name: "S'enregistrer" })
  ).toBeVisible();
});
