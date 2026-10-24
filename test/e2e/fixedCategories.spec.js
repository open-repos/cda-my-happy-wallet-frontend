import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";

for (const width of [320, 390, 1440]) {
  test(`fixed categories show their icons and persist compatible choices at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await prepareProtectedPage(page);
    const categories = [
      {
        id: 10,
        name: "Assurances",
        icon: "solid:shield-halved",
        color: null,
        fixedKind: "CHARGE",
      },
      {
        id: 11,
        name: "Salaires",
        icon: "solid:money-bill-wave",
        color: null,
        fixedKind: "REVENU",
      },
      { id: 12, name: "Personnel", icon: "solid:star", color: null },
    ];
    await page.route(/\/v1\/operation-categories(?:\?.*)?$/, (route) =>
      route.fulfill({
        json: {
          data: categories,
          meta: { limit: 100, hasNext: false, nextCursor: null },
        },
      })
    );
    let charge = {
      idOperationFixe: 7,
      titre: "Assurance habitation",
      montant: "120",
      devise: "EUR",
      periodicite: "ANNUELLE",
      pourcentagePersonnel: 50,
      montantPersonnel: "60.00",
      montantMensuelPersonnel: "5.00",
      categoryId: 10,
      category: categories[0],
    };
    const writes = [];
    await page.route(
      /\/v1\/operations-fixes\/(charges|revenus)(?:\/\d+)?(?:\?.*)?$/,
      async (route) => {
        const request = route.request();
        if (request.method() === "PUT") {
          const body = request.postDataJSON();
          writes.push(body);
          charge = {
            ...charge,
            ...body,
            category: categories.find((c) => c.id === body.categoryId) ?? null,
          };
          return route.fulfill({ json: { success: true, message: "Updated" } });
        }
        return route.fulfill({
          json: {
            data: request.url().includes("revenus")
              ? [
                  {
                    idOperationFixe: 7,
                    titre: "Salaire",
                    montant: "2400",
                    devise: "EUR",
                    categoryId: 11,
                    category: categories[1],
                  },
                ]
              : [charge],
            meta: { limit: 100, hasNext: false, nextCursor: null },
          },
        });
      }
    );
    await page.goto("/home/operations-fixes");
    if (width < 1024)
      await page
        .getByRole("button", { name: charge.titre, exact: true })
        .click();
    const item = () =>
      width < 1024
        ? page
            .locator(".compact-money-table__details")
            .filter({ hasText: charge.titre })
        : page.getByRole("row").filter({
            has: page.getByRole("button", {
              name: "Modifier Assurance habitation",
            }),
          });
    await expect(
      item().locator(".category-label:visible").first()
    ).toContainText("Assurances");
    await expect(
      item().locator(".category-label:visible svg").first()
    ).toBeVisible();
    await page
      .getByLabel("Trier par", { exact: true })
      .selectOption("category");
    await page
      .getByRole("button", { name: "Modifier Assurance habitation" })
      .click();
    const selector = page.getByRole("combobox", {
      name: "Catégorie",
      exact: true,
    });
    await expect(selector).toHaveValue("10");
    await expect(
      selector.getByRole("option", { name: "Salaires" })
    ).toHaveCount(0);
    await selector.selectOption("12");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      )
    ).toBe(false);
    await page.screenshot({
      path: test.info().outputPath("fixed-category-inline.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Enregistrer la charge" }).click();
    await expect(
      item().locator(".category-label:visible").first()
    ).toContainText("Personnel");
    expect(writes[0].categoryId).toBe(12);
    await page
      .getByRole("button", { name: "Modifier Assurance habitation" })
      .click();
    await selector.selectOption("");
    await page.getByRole("button", { name: "Enregistrer la charge" }).click();
    await expect(
      item().locator(".category-label:visible").first()
    ).toContainText("Non catégorisé");
    expect(writes[1].categoryId).toBeNull();
    await page.getByRole("button", { name: "Modifier Salaire" }).click();
    await expect(selector).toHaveValue("11");
    await expect(
      selector.getByRole("option", { name: "Assurances" })
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
  });
}
