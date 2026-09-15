import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const expectNoHorizontalOverflow = async (page: Page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
};

const signIn = async (page: Page) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("happy@example.test");
  await page
    .getByRole("textbox", { exact: true, name: "Mot de passe" })
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(
    page.getByText("Votre budget en un coup d’œil", { exact: true }),
  ).toBeVisible();
};

test("captures the sign-in screen", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(
    page.getByRole("heading", { name: "Bienvenue sur My Happy Wallet" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot("sign-in.png", { fullPage: true });
});

test("captures the populated dashboard and navigation", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("1 500,00 €", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Opérations ponctuelles" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot("dashboard.png", { fullPage: true });
});

test("captures the populated operations screen", async ({ page }) => {
  await signIn(page);
  await page.getByRole("tab", { name: "Opérations ponctuelles" }).click();
  await expect(
    page.getByText("Vos opérations ponctuelles", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Courses")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot("operations.png", { fullPage: true });
});
