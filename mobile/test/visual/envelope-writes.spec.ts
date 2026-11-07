import { expect, Page, Request, test } from "@playwright/test";

// Écritures des enveloppes (#389), contrat du Web #314.
const signIn = async (page: Page) => {
  // Mois figé : octobre 2026, comme les données de `serve-export.mjs`.
  await page.clock.setFixedTime(new Date("2026-10-11T10:00:00+02:00"));
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

const groceries = {
  idOperationFixe: 3,
  titre: "Courses",
  montant: "300.00",
  devise: "EUR",
  typeOperation: "CHARGE",
  periodicite: "MENSUELLE",
  pourcentagePersonnel: "100.00",
  categoryId: null,
  category: null,
};

test("declares a monthly charge as an envelope from a later month", async ({
  page,
}) => {
  const writes: Request[] = [];
  await page.route(/\/v1\/operations-fixes(?:\/.*)?(?:\?.*)?$/, (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      return route.fulfill({
        json: {
          data: [groceries],
          meta: { limit: 100, hasNext: false, nextCursor: null },
        },
      });
    }
    writes.push(request);
    return route.fulfill({ json: {} });
  });
  await signIn(page);
  await page.getByRole("button", { name: /Budget fixe/ }).click();
  await page.getByRole("button", { name: "Modifier Courses" }).click();

  const flag = page.getByRole("checkbox", {
    name: "Utiliser comme enveloppe budgétaire mensuelle",
  });
  await expect(flag).toHaveAttribute("aria-checked", "false");
  await flag.click();
  await expect(flag).toHaveAttribute("aria-checked", "true");
  const next = page.getByRole("button", { name: "Mois suivant" });
  const box = await next.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);
  await next.click();
  await next.click();
  await expect(page.getByText("décembre 2026", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].method()).toBe("PUT");
  expect(writes[0].url()).toMatch(/\/v1\/operations-fixes\/charges\/3$/);
  // PUT partiel : seuls le drapeau et le mois d'effet s'ajoutent.
  expect(writes[0].postDataJSON()).toEqual({
    titre: "Courses",
    montant: "300.00",
    devise: "EUR",
    isBudgetEnvelope: true,
    effectiveMonth: "2026-12",
  });
  await expect(
    page.getByText(/modification enregistrée à partir de décembre 2026/),
  ).toBeVisible();
});

const openNewExpense = async (page: Page) => {
  await page.getByRole("tab", { name: "Opérations ponctuelles" }).click();
  await page
    .getByRole("button", { name: "Ajouter une opération", exact: true })
    .click();
  await page.getByLabel("Titre").fill("Marché");
  await page.getByLabel("Montant en euros").fill("24");
  await page.getByRole("radio", { name: "Alimentation", exact: true }).click();
};

test("links a new expense to an envelope in the same write", async ({
  page,
}) => {
  const posts: Request[] = [];
  await page.route(/\/v1\/operations$/, (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    posts.push(route.request());
    return route.fulfill({
      status: 201,
      json: {
        data: {
          id: 90,
          title: "Marché",
          amount: "24.00",
          currency: "EUR",
          type: "DEPENSE",
          operationDate: "2026-10-11",
          categoryId: 4,
        },
      },
    });
  });
  await signIn(page);
  await openNewExpense(page);

  // Suggestion d'après la catégorie : un clic explicite reste nécessaire.
  await expect(
    page.getByRole("radio", { name: "Aucun rattachement" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Choisir Alimentation" }).click();
  await expect(
    page.getByRole("radio", { name: /^Alimentation · 223,00/ }),
  ).toBeChecked();
  await expect(page).toHaveScreenshot("envelope-assignment.png");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0].postDataJSON()).toMatchObject({
    title: "Marché",
    kind: "DEPENSE",
    categoryId: 4,
    reconciliation: { occurrenceId: 41, expectedOccurrenceId: null },
  });
  // Une seule relecture locale : le succès n'est pas remplacé (#389).
  await expect(page.getByText("Opération ajoutée.")).toBeVisible();
});

test("keeps a blocked link visible after switching to an income", async ({
  page,
}) => {
  const posts: Request[] = [];
  await page.route(/\/v1\/operations$/, (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    posts.push(route.request());
    return route.fulfill({ status: 201, json: {} });
  });
  await signIn(page);
  await openNewExpense(page);
  await page.getByRole("button", { name: "Choisir Alimentation" }).click();
  await page.getByRole("radio", { name: "Entrée", exact: true }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(
    page.getByText(/^La date, la devise ou le type ne correspond plus/),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Aucun rattachement" }).click();
  await expect(
    page.getByText(/^La date, la devise ou le type ne correspond plus/),
  ).toHaveCount(0);
  expect(posts).toHaveLength(0);
});

test("shows the Web message when the server refuses the link", async ({
  page,
}) => {
  await page.route(/\/v1\/operations$/, (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 409,
          json: {
            error: { statusCode: 409, details: { code: "PERIOD_CLOSED" } },
          },
        })
      : route.fallback(),
  );
  await signIn(page);
  await openNewExpense(page);
  await page.getByRole("radio", { name: /^Loisirs · / }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  // Message affiché dans la fenêtre du formulaire, pas sous elle.
  await expect(
    page
      .getByRole("dialog")
      .getByText(
        "Ce mois est clôturé : ses rattachements ne sont plus modifiables.",
      ),
  ).toBeVisible();
  // Le brouillon reste affiché avec l'erreur.
  await expect(page.getByLabel("Titre")).toHaveValue("Marché");
});
