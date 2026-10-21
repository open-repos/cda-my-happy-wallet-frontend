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
    page.getByText("Transport : 12,00", { exact: false }),
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

test("describes retired icons and counts only search matches", async ({
  page,
}) => {
  await page.route("**/operation-categories?*", async (route) => {
    await route.fulfill({
      json: {
        data: [
          { color: "#EA7C69", icon: "solid:zz-retired", id: 4, name: "Ancien" },
          { color: null, icon: "solid:bus", id: 5, name: "Transport" },
        ],
        meta: { hasNext: false, limit: 100, nextCursor: null },
      },
    });
  });
  await signIn(page);
  await page.getByRole("tab", { name: "Opérations ponctuelles" }).click();
  await page.getByRole("link", { name: "Gérer les catégories" }).click();
  await page.getByRole("button", { name: "Modifier Ancien" }).click();
  await expect(
    page.getByLabel("Aperçu : Ancien, icône indisponible, pastille de couleur"),
  ).toBeVisible();
  const retired = page.getByRole("radio", {
    name: "icône indisponible, pastille de couleur",
  });
  await expect(retired).toBeChecked();
  await page.getByLabel("Rechercher une icône").fill("zzzz-none");
  await expect(
    page.getByText("Aucune icône ne correspond à « zzzz-none ».", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(retired).toBeChecked();

  await page.getByRole("button", { name: "Fermer le formulaire" }).click();
  await page.getByRole("button", { name: "Modifier Transport" }).click();
  await page.getByLabel("Rechercher une icône").fill("courses");
  await expect(
    page.getByText("1 icône proposée.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "bus (plein)" })).toBeChecked();
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

test("manages monthly events from the objectives tab (#225)", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("tab", { name: "Objectifs et événements" }).click();
  await expect(
    page.getByText("Événements mensuels", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Assurance", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/^Chaque année · Du 15\/10\/2026 au 15\/10\/2028$/),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Création : validations du Web, puis contrat de l'API.
  await page.getByRole("button", { name: "Ajouter un événement" }).click();
  await page.getByLabel("Titre", { exact: true }).fill("A");
  await page.getByLabel("Montant en euros").fill("0");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(
    page.getByText("Le titre doit contenir entre 2 et 50 caractères."),
  ).toBeVisible();
  await expect(
    page.getByText("Saisissez un montant positif avec deux décimales maximum."),
  ).toBeVisible();
  await page.getByLabel("Titre", { exact: true }).fill("Salaire");
  await page.getByLabel("Montant en euros").fill("2100,5");
  await page.getByRole("radio", { name: "Entrée" }).click();
  await expect(page.getByRole("radio", { name: "Entrée" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Chaque mois" })).toBeChecked();
  // Une fois / chaque mois seulement à la création (#216 pour le reste).
  await expect(page.getByRole("radio", { name: "Chaque année" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("radio", { name: "Sans date de fin" }),
  ).toBeChecked();
  const created = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      new URL(request.url()).pathname.endsWith("/events"),
  );
  await page.getByRole("button", { name: "Enregistrer" }).click();
  expect((await created).postDataJSON()).toMatchObject({
    title: "Salaire",
    amount: "2100.50",
    currency: "EUR",
    kind: "ENTREE",
    recurrence: "MENSUELLE",
    endDate: null,
  });
  await expect(page.getByText("Événement ajouté.")).toBeVisible();

  // Modification d'un événement annuel du Web : sa répétition est conservée.
  await page.getByRole("button", { name: "Modifier Taxe foncière" }).click();
  await expect(page.getByRole("radio", { name: "Chaque année" })).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Jusqu’à une date" }),
  ).toBeChecked();
  const updated = page.waitForRequest(
    (request) =>
      request.method() === "PUT" &&
      new URL(request.url()).pathname.endsWith("/events/22"),
  );
  await page.getByRole("button", { name: "Enregistrer" }).click();
  expect((await updated).postDataJSON()).toMatchObject({
    recurrence: "ANNUELLE",
    endDate: "2028-10-15",
  });
  await expect(page.getByText("Événement modifié.")).toBeVisible();

  // Un échec d'enregistrement est affiché dans le formulaire, resté ouvert.
  await page.getByRole("button", { name: "Modifier Taxe foncière" }).click();
  await page.getByLabel("Titre", { exact: true }).fill("Panne");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(
    page.getByText("L’événement n’a pas pu être enregistré. Réessayez."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Fermer le formulaire" }),
  ).toBeVisible();
  // « Une seule fois » retire la date de fin de l'envoi.
  await page.getByLabel("Titre", { exact: true }).fill("Taxe foncière");
  await page.getByRole("radio", { name: "Une seule fois" }).click();
  await expect(
    page.getByRole("radio", { name: "Sans date de fin" }),
  ).toHaveCount(0);
  const once = page.waitForRequest(
    (request) =>
      request.method() === "PUT" &&
      new URL(request.url()).pathname.endsWith("/events/22"),
  );
  await page.getByRole("button", { name: "Enregistrer" }).click();
  expect((await once).postDataJSON()).toMatchObject({
    recurrence: "AUCUNE",
    endDate: null,
  });
  await expect(page.getByText("Événement modifié.")).toBeVisible();

  // Suppression confirmée dans le formulaire.
  await page.getByRole("button", { name: "Modifier Assurance" }).click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  const deleted = page.waitForRequest(
    (request) =>
      request.method() === "DELETE" &&
      new URL(request.url()).pathname.endsWith("/events/21"),
  );
  await page.getByRole("button", { name: "Oui, supprimer" }).click();
  await deleted;
  await expect(page.getByText("Événement supprimé.")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("manages financial goals from the objectives tab (#226)", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("tab", { name: "Objectifs et événements" }).click();
  await expect(
    page.getByText("Objectifs financiers", { exact: true }),
  ).toBeVisible();
  // Progression exposée en valeur, pas seulement par la barre.
  const progress = page.getByRole("progressbar", {
    name: /^25 % de l’objectif Voyage atteint/,
  });
  await expect(progress).toHaveAttribute("aria-valuenow", "25");
  await expect(progress).toHaveAttribute("aria-valuemax", "100");
  await expect(
    page.getByText(
      "À ce rythme, objectif atteint en mars 2027, avant la date souhaitée.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Dans les temps", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Ajouter un objectif" }).click();
  await page.getByLabel("Titre", { exact: true }).fill("A");
  await page.getByLabel("Montant cible en euros").fill("0");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(
    page.getByText("Le titre doit contenir entre 2 et 50 caractères."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Saisissez un montant cible positif, par exemple 1200 ou 1200,50.",
    ),
  ).toBeVisible();
  await page.getByLabel("Titre", { exact: true }).fill("Vélo");
  await page.getByLabel("Montant cible en euros").fill("1200,5");
  await page.getByLabel("Versement mensuel prévu en euros").fill("75");
  await expect(page.getByRole("radio", { name: "Sans date" })).toBeChecked();
  const created = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      new URL(request.url()).pathname.endsWith("/goals"),
  );
  await page.getByRole("button", { name: "Enregistrer" }).click();
  expect((await created).postDataJSON()).toEqual({
    title: "Vélo",
    targetAmount: "1200.50",
    savedAmount: "0.00",
    monthlyContribution: "75.00",
    currency: "EUR",
    targetDate: null,
  });
  await expect(page.getByText("Objectif ajouté.")).toBeVisible();

  // Échec affiché dans le formulaire, qui reste ouvert.
  await page
    .getByRole("button", { name: "Modifier l’objectif Voyage" })
    .click();
  await expect(
    page.getByRole("radio", { name: "Avant une date" }),
  ).toBeChecked();
  await page.getByLabel("Titre", { exact: true }).fill("Panne");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(
    page.getByText("L’objectif n’a pas pu être enregistré. Réessayez."),
  ).toBeVisible();
  // Refus de validation du backend : expliqué comme sur le Web.
  await page.getByLabel("Titre", { exact: true }).fill("Refus");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(
    page.getByText(
      "Certaines valeurs sont refusées : vérifiez les montants et la date.",
    ),
  ).toBeVisible();
  await page.getByLabel("Titre", { exact: true }).fill("Voyage");
  const updated = page.waitForRequest(
    (request) =>
      request.method() === "PUT" &&
      new URL(request.url()).pathname.endsWith("/goals/1"),
  );
  await page.getByRole("button", { name: "Enregistrer" }).click();
  expect((await updated).postDataJSON()).toMatchObject({
    title: "Voyage",
    targetDate: "2027-06-30",
  });
  await expect(page.getByText("Objectif modifié.")).toBeVisible();

  await page
    .getByRole("button", { name: "Modifier l’objectif Voyage" })
    .click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  const deleted = page.waitForRequest(
    (request) =>
      request.method() === "DELETE" &&
      new URL(request.url()).pathname.endsWith("/goals/1"),
  );
  await page.getByRole("button", { name: "Oui, supprimer" }).click();
  await deleted;
  await expect(page.getByText("Objectif supprimé.")).toBeVisible();
});

test("shows upcoming months from the dashboard and the calendar (#214)", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: /Prochains mois/ }).click();
  // Les onglets restent montés : « Prochains mois » existe aussi sur
  // l'accueil, d'où un texte propre à l'écran.
  await expect(
    page.getByText("Horizon de prévision", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "6 mois" })).toBeChecked();
  await expect(
    page.getByText("Reste de fin de mois", { exact: true }),
  ).toHaveCount(6);
  // Mois négatif : signalé par un texte, pas seulement par la couleur.
  await expect(page.getByText("Solde négatif", { exact: true })).toHaveCount(1);
  await expect(page.getByText(/^-35,50\s€$/)).toBeVisible();
  await expect(
    page.getByText(/^Les mois signalés « Solde négatif »/),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const shorter = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname.endsWith("/budget-forecast") &&
      new URL(request.url()).searchParams.get("months") === "3",
  );
  await page.getByRole("radio", { name: "3 mois" }).click();
  await shorter;
  await expect(
    page.getByText("Reste de fin de mois", { exact: true }),
  ).toHaveCount(3);

  await page.getByRole("link", { name: "Retour" }).click();
  await page.getByRole("tab", { name: "Calendrier" }).click();
  await page.getByRole("link", { name: "Prochains mois" }).click();
  await expect(
    page.getByText("Horizon de prévision", { exact: true }),
  ).toBeVisible();
});

test("explores analytics from the dashboard (#215)", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: /Analyses/ }).click();
  await expect(page.getByText("Indicateur", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Dépenses" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Catégorie" })).toBeChecked();
  // Liste textuelle : catégories triées par montant, équivalent du graphique.
  // Limitée au résultat : les onglets restent montés et l'accueil affiche
  // aussi « Alimentation : 42,50 € ».
  const result = page.getByTestId("analytics-result");
  const details = result.getByText(/^(Alimentation|Transport) : /);
  await expect(details).toHaveText([
    /^Alimentation : 42,50\s€$/,
    /^Transport : 12,00\s€$/,
  ]);
  await expectNoHorizontalOverflow(page);

  // Solde net par mois : valeurs signées, ordre chronologique.
  const byMonth = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.pathname.endsWith("/analytics/operations") &&
      url.searchParams.get("groupBy") === "month" &&
      !url.searchParams.has("kind")
    );
  });
  await page.getByRole("radio", { name: "Solde net" }).click();
  await page.getByRole("radio", { name: "Mois", exact: true }).click();
  await byMonth;
  await expect(result.getByText(/^août 2026 : 80,00\s€$/)).toBeVisible();
  await expect(result.getByText(/^sept\.? 2026 : -150,00\s€$/)).toBeVisible();

  // Entrées sans opération : état vide.
  await page.getByRole("radio", { name: "Entrées" }).click();
  await expect(
    page.getByText("Aucune opération sur cette période.", { exact: true }),
  ).toBeVisible();
});
