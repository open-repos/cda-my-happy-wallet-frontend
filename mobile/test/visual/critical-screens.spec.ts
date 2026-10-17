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

test("captures the populated dashboard and navigation", async ({
  page,
}, testInfo) => {
  await signIn(page);
  await expect(page.getByText("Reste réel", { exact: true })).toBeVisible();
  await expect(page.getByText(/^1\s337,50\s€$/)).toBeVisible();
  await expect(page.getByText("Report d’août", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Disponible prudent par jour", { exact: true }),
  ).toBeVisible();
  const operationsTab = page.getByRole("tab", {
    name: "Opérations ponctuelles",
  });
  await expect(operationsTab).toBeVisible();

  const navigationBounds = await page.getByRole("tablist").boundingBox();
  expect(navigationBounds).not.toBeNull();
  if (testInfo.project.name === "desktop") {
    expect(navigationBounds?.x).toBeLessThan(120);
    expect(navigationBounds?.height).toBeGreaterThan(400);
  } else {
    expect(navigationBounds?.y).toBeGreaterThan(500);
    expect(navigationBounds?.width).toBeGreaterThan(300);
  }
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

test("captures the budget calendar and its day filter", async ({ page }) => {
  // Date figée : la grille et sa capture ne dépendent pas du jour d'exécution.
  await page.clock.setFixedTime(new Date("2026-10-11T10:00:00+02:00"));
  await signIn(page);
  await page.getByRole("tab", { name: "Calendrier" }).click();
  await expect(
    page.getByText("Opérations du mois", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Courses", { exact: true })).toBeVisible();

  // Cibles tactiles d'au moins 44 px, y compris sur un écran de 360 px.
  const dayBox = await page
    .getByRole("button", { name: /^3 .* Dépenses 42,50/ })
    .boundingBox();
  expect(dayBox?.width).toBeGreaterThanOrEqual(44);
  expect(dayBox?.height).toBeGreaterThanOrEqual(44);

  // File des événements : le retard d'abord, avec ses deux actions.
  await expect(page.getByText("À traiter (1)", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Convertir Loyer du 5 octobre/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Annuler Assurance du 20 octobre/ }),
  ).toBeVisible();

  await page.getByRole("radio", { name: "Dépenses" }).click();
  await expect(page.getByText("-43", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Repères" }).click();

  await page.getByRole("button", { name: /^3 .* Dépenses 42,50/ }).click();
  await expect(page.getByText(/^Opérations du 3 /)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tout le mois" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot("calendar.png", { fullPage: true });

  await page.getByRole("button", { name: "Tout le mois" }).click();
  await expect(
    page.getByText("Opérations du mois", { exact: true }),
  ).toBeVisible();
});
