import { expect, Page, Request, test } from "@playwright/test";

// Catégories des charges et entrées fixes (#385), contrat du Web #266.
const housing = {
  id: 21,
  name: "Logement",
  color: null,
  icon: "solid:house",
  fixedKind: "CHARGE",
};
const salaries = {
  id: 22,
  name: "Salaires",
  color: null,
  icon: "solid:money-bill-wave",
  fixedKind: "REVENU",
};
const insurance = {
  id: 23,
  name: "Assurances",
  color: null,
  icon: "solid:shield-halved",
  fixedKind: "CHARGE",
};
const food = { id: 4, name: "Alimentation", color: "#EA7C69", icon: null };

// Charge créée sur le Web : catégorie, périodicité et part personnelle.
const rent = {
  idOperationFixe: 2,
  titre: "Loyer",
  montant: "900.00",
  devise: "EUR",
  typeOperation: "CHARGE",
  periodicite: "ANNUELLE",
  pourcentagePersonnel: "50.00",
  categoryId: 21,
  category: housing,
};
const salary = {
  idOperationFixe: 1,
  titre: "Salaire",
  montant: "2400.00",
  devise: "EUR",
  typeOperation: "REVENU",
  categoryId: null,
  category: null,
};

const page1 = (data: unknown[]) => ({
  data,
  meta: { limit: 100, hasNext: false, nextCursor: null },
});

interface Options {
  write?: { status: number; body?: unknown };
}

const mockFixedBudget = async (page: Page, options: Options = {}) => {
  const writes: Request[] = [];
  const control = { categoriesDown: false };
  await page.route(/\/v1\/operation-categories(?:\?.*)?$/, (route) => {
    if (control.categoriesDown) {
      return route.fulfill({ status: 503, json: {} });
    }
    return route.fulfill({
      json: page1([housing, salaries, insurance, food]),
    });
  });
  await page.route(/\/v1\/operations-fixes(?:\/.*)?(?:\?.*)?$/, (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      return route.fulfill({ json: page1([salary, rent]) });
    }
    writes.push(request);
    const write = options.write ?? { status: 200 };
    return route.fulfill({ status: write.status, json: write.body ?? {} });
  });
  return { writes, control };
};

const openFixedBudget = async (page: Page, beforeOpening?: () => void) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("happy@example.test");
  await page
    .getByRole("textbox", { name: "Mot de passe", exact: true })
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(
    page.getByText("Votre budget en un coup d’œil", { exact: true }),
  ).toBeVisible();
  beforeOpening?.();
  await page.getByRole("button", { name: /Budget fixe/ }).click();
  await expect(page.getByText("Loyer", { exact: true })).toBeVisible();
};

const radio = (page: Page, name: string) =>
  page.getByRole("radio", { name, exact: true });

test("shows fixed categories and keeps a Web category when editing", async ({
  page,
}) => {
  const { writes } = await mockFixedBudget(page);
  await openFixedBudget(page);

  await expect(page.getByText("Logement", { exact: true })).toBeVisible();
  await expect(page.getByText("Non catégorisé", { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot("fixed-categories-list.png", {
    fullPage: true,
  });

  // Téléphone : « Modifier » en icône seule, nom accessible conservé.
  const edit = page.getByRole("button", { name: "Modifier Loyer" });
  const editBox = await edit.boundingBox();
  expect(editBox?.width).toBeGreaterThanOrEqual(48);
  expect(editBox?.height).toBeGreaterThanOrEqual(48);
  if ((page.viewportSize()?.width ?? 0) < 600) {
    await expect(edit).not.toContainText("Modifier");
  } else {
    await expect(edit).toContainText("Modifier");
  }

  await edit.click();
  await expect(radio(page, "Logement")).toBeChecked();
  await expect(radio(page, "Assurances")).toBeVisible();
  await expect(radio(page, "Alimentation")).toBeVisible();
  // Catégorie réservée aux entrées : jamais proposée pour une charge.
  await expect(radio(page, "Salaires")).toHaveCount(0);

  const choice = await radio(page, "Assurances").boundingBox();
  expect(choice?.height).toBeGreaterThanOrEqual(48);
  await expect(page).toHaveScreenshot("fixed-categories-form.png", {
    fullPage: true,
  });

  // Enregistrer sans changer la catégorie : rien d'autre n'est réécrit.
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].method()).toBe("PUT");
  expect(writes[0].url()).toMatch(/\/v1\/operations-fixes\/charges\/2$/);
  expect(writes[0].postDataJSON()).toEqual({
    titre: "Loyer",
    montant: "900.00",
    devise: "EUR",
  });

  // Retirer la catégorie envoie `null`, sans périodicité ni part.
  await page.getByRole("button", { name: "Modifier Loyer" }).click();
  await radio(page, "Non catégorisé").click();
  await expect(radio(page, "Non catégorisé")).toBeChecked();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1].postDataJSON()).toEqual({
    titre: "Loyer",
    montant: "900.00",
    devise: "EUR",
    categoryId: null,
  });
});

test("creates a categorized income with only compatible choices", async ({
  page,
}) => {
  const { writes } = await mockFixedBudget(page);
  await openFixedBudget(page);

  await page.getByRole("button", { name: "Ajouter un revenu" }).click();
  await expect(radio(page, "Non catégorisé")).toBeChecked();
  await expect(radio(page, "Logement")).toHaveCount(0);
  await page.getByLabel("Libellé").fill("Prime");
  await page.getByLabel("Montant mensuel en euros").fill("150");
  await radio(page, "Salaires").click();
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].url()).toMatch(/\/v1\/operations-fixes\/revenus$/);
  expect(writes[0].postDataJSON()).toEqual({
    titre: "Prime",
    montant: "150.00",
    devise: "EUR",
    categoryId: 22,
  });
});

test("ties a refused category to the selector without losing the entry", async ({
  page,
}) => {
  await mockFixedBudget(page, {
    write: {
      status: 422,
      body: {
        response: "error",
        error: {
          statusCode: 422,
          message: "Category unavailable for this fixed operation",
          details: { code: "INVALID_FIXED_CATEGORY" },
        },
      },
    },
  });
  await openFixedBudget(page);

  await page.getByRole("button", { name: "Modifier Loyer" }).click();
  await radio(page, "Assurances").click();
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(
    page
      .getByRole("dialog")
      .getByRole("alert")
      .filter({ hasText: "Cette catégorie n’est plus disponible." }),
  ).toBeVisible();
  await expect(radio(page, "Assurances")).toBeChecked();
  await expect(page.getByLabel("Libellé")).toHaveValue("Loyer");
});

test("keeps the assignment while the catalog is unavailable", async ({
  page,
}) => {
  const { control } = await mockFixedBudget(page);
  await openFixedBudget(page, () => {
    control.categoriesDown = true;
  });

  await page.getByRole("button", { name: "Modifier Loyer" }).click();
  await expect(
    page.getByText("Catégories indisponibles. Votre choix est conservé.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(radio(page, "Logement")).toBeChecked();
  await expect(radio(page, "Logement")).toBeDisabled();

  control.categoriesDown = false;
  await page.getByRole("button", { name: "Réessayer les catégories" }).click();
  await expect(radio(page, "Assurances")).toBeEnabled();
  await expect(radio(page, "Logement")).toBeChecked();
});
