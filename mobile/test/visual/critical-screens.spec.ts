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
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await signIn(page);
  await expect(
    page.getByText("Alimentation : 42,50", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("25 % de l’épargne visée atteinte", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Voyage : 250,00", { exact: false }),
  ).toBeVisible();
  await expect(page.locator('[aria-hidden="true"] svg')).toHaveCount(2);
  expect(pageErrors).toEqual([]);
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

test("captures both populated chart cards", async ({ page }) => {
  await signIn(page);
  for (const kind of ["expenses", "goals"]) {
    const card = page.getByTestId(`${kind}-chart-card`);
    await expect(card.locator("svg")).toHaveCount(1);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveScreenshot(`${kind}-chart.png`);
  }
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

test("manages categories from the operations screen", async ({ page }) => {
  await signIn(page);
  await page.getByRole("tab", { name: "Opérations ponctuelles" }).click();
  await page.getByRole("link", { name: "Gérer les catégories" }).click();
  await expect(
    page.getByText("Catégories d’opérations", { exact: true }),
  ).toBeVisible();
  // Les onglets restent montés : « Alimentation » existe aussi sur l'accueil.
  await expect(
    page.getByRole("button", { name: "Modifier Alimentation" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Ajouter une catégorie" }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(
    page.getByText("Le nom doit contenir entre 2 et 50 caractères."),
  ).toBeVisible();
  await page.getByLabel("Nom", { exact: true }).fill("Alimentation");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(
    page.getByText("Une catégorie porte déjà ce nom.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Nom", { exact: true }).fill("Loisirs");
  await page.getByRole("radio", { name: "Bleu" }).click();
  await expect(page.getByRole("radio", { name: "Bleu" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Sans icône" })).toBeChecked();
  await page.getByLabel("Rechercher une icône").fill("cinéma");
  await page.getByRole("radio", { name: "film (plein)" }).click();
  await expect(page.getByRole("radio", { name: "film (plein)" })).toBeChecked();
  await expect(
    page.getByLabel("Aperçu : Loisirs, icône film (plein)"),
  ).toBeVisible();
  const created = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      new URL(request.url()).pathname.endsWith("/operation-categories"),
  );
  await page.getByRole("button", { name: "Enregistrer" }).click();
  expect((await created).postDataJSON()).toEqual({
    name: "Loisirs",
    color: "#275DAD",
    icon: "solid:film",
  });
  await expect(page.getByText("Catégorie ajoutée.")).toBeVisible();

  // « Alimentation » est utilisée par l'opération de démonstration.
  // Icône inchangée : le PUT ne transmet pas `icon` (le backend la garde).
  await page.getByRole("button", { name: "Modifier Alimentation" }).click();
  const updated = page.waitForRequest(
    (request) =>
      request.method() === "PUT" &&
      new URL(request.url()).pathname.endsWith("/operation-categories/4"),
  );
  await page.getByRole("button", { name: "Enregistrer" }).click();
  expect((await updated).postDataJSON()).toEqual({
    name: "Alimentation",
    color: "#EA7C69",
  });
  await expect(page.getByText("Catégorie modifiée.")).toBeVisible();

  await page.getByRole("button", { name: "Modifier Alimentation" }).click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await page.getByRole("button", { name: "Oui, supprimer" }).click();
  await expect(
    page.getByText(/Cette catégorie est utilisée par des opérations/),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Fermer le formulaire" }).click();
  // Les onglets restent montés : revenir sur Opérations relit les catégories.
  const categoriesReloaded = page.waitForRequest(
    (request) =>
      request.method() === "GET" &&
      new URL(request.url()).pathname.endsWith("/operation-categories"),
  );
  await page.getByRole("link", { name: "Retour aux opérations" }).click();
  await expect(
    page.getByText("Vos opérations ponctuelles", { exact: true }),
  ).toBeVisible();
  await categoriesReloaded;
});

test("exposes the checked state of every radio option", async ({ page }) => {
  // Date figée : la file des événements du calendrier est déterministe.
  await page.clock.setFixedTime(new Date("2026-10-11T10:00:00+02:00"));
  await signIn(page);

  // Formulaire d'opération : type et catégorie (#148).
  await page.getByRole("tab", { name: "Opérations ponctuelles" }).click();
  await page.getByRole("button", { name: "Ajouter une opération" }).click();
  await expect(page.getByRole("radio", { name: "Dépense" })).toBeChecked();
  await page.getByRole("radio", { name: "Entrée" }).click();
  await expect(page.getByRole("radio", { name: "Entrée" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Dépense" })).not.toBeChecked();
  await page.getByRole("radio", { name: "Alimentation" }).click();
  await expect(page.getByRole("radio", { name: "Alimentation" })).toBeChecked();
  await page.getByRole("button", { name: "Fermer le formulaire" }).click();

  // Mode du calendrier et conversion d'un événement.
  await page.getByRole("tab", { name: "Calendrier" }).click();
  await expect(page.getByRole("radio", { name: "Repères" })).toBeChecked();
  await page.getByRole("radio", { name: "Dépenses" }).click();
  await expect(page.getByRole("radio", { name: "Dépenses" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Repères" })).not.toBeChecked();
  await page
    .getByRole("button", { name: /^Convertir Loyer du 5 octobre/ })
    .click();
  const category = page.getByRole("radio", { name: "Alimentation" });
  await category.click();
  await expect(category).toBeChecked();
  await page.getByRole("button", { name: "Fermer le formulaire" }).click();

  // Formulaire du budget fixe.
  await page.getByRole("tab", { name: "Tableau de bord" }).click();
  await page.getByRole("button", { name: /Budget fixe/ }).click();
  await page
    .getByRole("button", { name: "Ajouter une charge" })
    .first()
    .click();
  await expect(page.getByRole("radio", { name: "Charge" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Revenu" })).not.toBeChecked();
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
