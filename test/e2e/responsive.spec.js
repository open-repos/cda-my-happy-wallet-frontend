import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const pages = [
  {
    path: "/login",
    heading: /Bienvenue sur MyHappyWallet/i,
    action: "Connexion",
  },
  {
    path: "/register",
    heading: /Créer un compte pour utiliser MyHappyWallet/i,
    action: "S'enregistrer",
  },
  {
    path: "/forgot-password",
    heading: /Vous avez oublié votre mot de passe/i,
    action: "Changer de mot de passe",
  },
  {
    path: "/new-password",
    heading: /Choisissez votre nouveau mot de passe/i,
    action: "Confirmation du nouveau mot de passe",
  },
];

const storedUser = {
  payload: {
    accessToken:
      "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJleHAiOjQxMDI0NDQ4MDAsInN1YiI6InRlc3QifQ.",
    user: {
      email: "happy@example.test",
      firstname: "Happy",
      lastname: "Wallet",
    },
  },
};

const prepareProtectedPage = async (page) => {
  await page.addInitScript((user) => {
    window.localStorage.setItem(JSON.stringify("user"), JSON.stringify(user));
  }, storedUser);
  await page.route("**/v1/operations-fixes/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        data: [
          {
            devise: "EUR",
            idOperationFixe: 1,
            montant: 100,
            titre: "Test",
          },
        ],
        message: "Test data",
        success: true,
      },
    })
  );
  await page.route(/\/v1\/operation-categories(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        data: [{ id: 4, name: "Alimentation", color: "#55AA22" }],
        meta: { limit: 100, hasNext: false, nextCursor: null },
      },
    })
  );
  await page.route(/\/v1\/operations(?:\?.*)?$/, (route) => {
    const isNextPage = new URL(route.request().url()).searchParams.has(
      "cursor"
    );
    return route.fulfill({
      contentType: "application/json",
      json: {
        data: isNextPage
          ? [
              {
                id: 1,
                title: "Courses",
                amount: "42.50",
                currency: "EUR",
                type: "DEPENSE",
                operationDate: "2026-08-18",
                categoryId: 4,
              },
              {
                id: 2,
                title: "Prime",
                amount: "125.00",
                currency: "EUR",
                type: "ENTREE",
                operationDate: "2026-08-17",
                categoryId: 4,
              },
            ]
          : [
              {
                id: 1,
                title: "Courses",
                amount: "42.50",
                currency: "EUR",
                type: "DEPENSE",
                operationDate: "2026-08-18",
                categoryId: 4,
              },
            ],
        meta: isNextPage
          ? { limit: 20, hasNext: false, nextCursor: null }
          : { limit: 20, hasNext: true, nextCursor: "v1.opaque" },
      },
    });
  });
  await page.route(/\/v1\/events(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        data: [
          {
            id: 8,
            title: "Assurance",
            amount: "120.00",
            currency: "EUR",
            kind: "DEPENSE",
            startDate: "2026-09-20",
            recurrence: "MENSUELLE",
            endDate: null,
          },
        ],
        meta: { limit: 100, hasNext: false, nextCursor: null },
      },
    })
  );
  await page.route(/\/v1\/event-occurrences(?:\?.*)?$/, (route) => {
    const month = new URL(route.request().url()).searchParams.get("month");
    return route.fulfill({
      contentType: "application/json",
      json: {
        data: [
          {
            id: 8,
            title: "Assurance",
            amount: "120.00",
            currency: "EUR",
            kind: "DEPENSE",
            startDate: "2026-09-20",
            recurrence: "MENSUELLE",
            endDate: null,
            occurrenceDate: `${month}-20`,
          },
        ],
        meta: { limit: 100, hasNext: false, nextCursor: null },
      },
    });
  });
};

const protectedPages = [
  { path: "/home", selector: ".container-home-all" },
  { path: "/calendrier", selector: ".calendrier-container" },
  { path: "/objectifs-evenements", selector: ".objEv-container" },
  { path: "/operations", selector: ".operations-container" },
  { path: "/profil", selector: ".profil-container" },
];

for (const viewport of viewports) {
  for (const pageDefinition of pages) {
    test(`${pageDefinition.path} fits the ${viewport.name} viewport`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(pageDefinition.path);

      await expect(
        page.getByRole("heading", { name: pageDefinition.heading })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: pageDefinition.action })
      ).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(hasHorizontalOverflow).toBe(false);
    });
  }

  test(`protected shell fits the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page);
    await page.goto("/calendrier");

    await expect(
      page.getByRole("heading", { name: "Calendrier" })
    ).toBeVisible();

    const contentBounds = await page
      .locator(".protected-layout__content")
      .boundingBox();
    expect(contentBounds.x).toBeGreaterThanOrEqual(0);
    expect(contentBounds.x + contentBounds.width).toBeLessThanOrEqual(
      viewport.width
    );
  });

  test(`operations fixes fit the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page);
    await page.goto("/home/operations-fixes");

    await expect(
      page.getByRole("heading", { name: "Home - Operations Fixes" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sauvegarder" })
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  for (const protectedPage of protectedPages) {
    test(`${protectedPage.path} fits the protected ${viewport.name} viewport`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await prepareProtectedPage(page);
      await page.goto(protectedPage.path);

      await expect(page.locator(protectedPage.selector)).toBeVisible();
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(hasHorizontalOverflow).toBe(false);
    });
  }
}

for (const theme of ["light", "dark"]) {
  for (const viewport of viewports) {
    test(`profile theme ${theme} fits the ${viewport.name} viewport`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await prepareProtectedPage(page);
      await page.addInitScript((preference) => {
        window.localStorage.setItem("mhw-theme", preference);
      }, theme);
      await page.goto("/profil");

      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("combobox", { name: "Thème" })).toHaveValue(
        theme
      );
      await expect(page.locator(".theme-selector")).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(hasHorizontalOverflow).toBe(false);
    });
  }
}

test("allows vertical scrolling on a compact mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/register");

  const scrollMetrics = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(
    scrollMetrics.clientHeight
  );

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
});

test("loads the next operation page without duplicating rows", async ({
  page,
}) => {
  await page.setViewportSize(viewports[2]);
  await prepareProtectedPage(page);
  await page.goto("/operations");

  await expect(page.getByRole("row", { name: /Courses/ })).toHaveCount(1);
  await page.getByRole("button", { name: "Afficher la suite" }).click();
  await expect(page.getByRole("row", { name: /Prime/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Courses/ })).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Afficher la suite" })
  ).toHaveCount(0);
});

test("keeps the operation actions and local icons at their design sizes", async ({
  page,
}) => {
  await page.setViewportSize(viewports[2]);
  await prepareProtectedPage(page);
  await page.goto("/operations");

  const addButton = page.getByRole("button", {
    name: "Ajouter une opération",
  });
  const editButton = page.getByRole("button", { name: "Modifier Courses" });
  const addIcon = addButton.locator("img");
  const editIcon = editButton.locator("img");

  await expect(addButton).toHaveCSS("min-height", "48px");
  await expect(editButton).toHaveCSS("width", "44px");
  await expect(editButton).toHaveCSS("height", "44px");
  await expect(addIcon).toHaveCSS("width", "16px");
  await expect(addIcon).toHaveCSS("height", "16px");
  await expect(editIcon).toHaveCSS("width", "20px");
  await expect(editIcon).toHaveCSS("height", "20px");
});
