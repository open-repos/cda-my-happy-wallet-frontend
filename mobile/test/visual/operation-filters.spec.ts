import { expect, test, type Page } from "@playwright/test";

const meta = (hasNext = false, nextCursor: string | null = null) => ({
  limit: 20,
  hasNext,
  nextCursor,
});
const operation = (id: number, title: string) => ({
  id,
  title,
  amount: "42.50",
  currency: "EUR",
  type: "DEPENSE",
  operationDate: "2026-11-20",
  categoryId: 4,
});
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
const openOperations = async (page: Page) => {
  await signIn(page);
  await page.getByRole("tab", { name: "Opérations ponctuelles" }).click();
  await expect(
    page.getByText("Vos opérations ponctuelles", { exact: true }),
  ).toBeVisible();
};
const openFilters = (page: Page) =>
  page.getByRole("button", { name: /^Trier et filtrer \(/ }).click();
const apply = (page: Page) =>
  page
    .getByRole("button", {
      name: "Appliquer le tri et les filtres",
      exact: true,
    })
    .click();
const selectSort = async (page: Page, name = "Montant") => {
  await page.getByRole("button", { name: /^Trier par :/ }).click();
  await page.getByRole("radio", { name, exact: true }).click();
};

test("server filters restart pagination, suggestions allow free text and clear preserves sorting", async ({
  page,
}) => {
  const requests: URL[] = [];
  await page.route("**/v1/operations?*", (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    return route.fulfill({
      json: {
        data: url.searchParams.has("title")
          ? []
          : [
              operation(
                url.searchParams.has("cursor") ? 2 : 1,
                url.searchParams.has("cursor") ? "Suite" : "Courses",
              ),
            ],
        meta: meta(
          !url.searchParams.has("cursor") && !url.searchParams.has("title"),
          "opaque-original",
        ),
      },
    });
  });
  const suggestions: URL[] = [];
  await page.route("**/v1/operations/suggestions/titles?*", (route) => {
    const url = new URL(route.request().url());
    suggestions.push(url);
    return route.fulfill({
      json: { data: [{ title: "Café du coin" }], meta: meta() },
    });
  });
  await openOperations(page);
  await page
    .getByRole("button", { name: "Afficher la suite", exact: true })
    .click();
  await expect(page.getByText("Suite", { exact: true })).toBeVisible();
  await openFilters(page);
  await selectSort(page);
  await page.getByRole("button", { name: /^Ordre du tri :/ }).click();
  await page.getByRole("radio", { name: "Croissant", exact: true }).click();
  await page.getByLabel("Filtrer par libellé", { exact: true }).fill("Caf");
  await expect(
    page.getByRole("button", { name: "Choisir le libellé Café du coin" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Choisir le libellé Café du coin" })
    .click();
  await page.getByRole("button", { name: /^Catégories :/ }).click();
  await page
    .getByRole("checkbox", { name: "Alimentation", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "Transport", exact: true }).click();
  await page.getByRole("button", { name: /^Type d’opération :/ }).click();
  await page.getByRole("radio", { name: "Dépenses", exact: true }).click();
  await page
    .getByLabel("Date du (AAAA-MM-JJ)", { exact: true })
    .fill("2026-11-01");
  await page
    .getByLabel("Date au (AAAA-MM-JJ)", { exact: true })
    .fill("2026-11-30");
  await page.getByLabel("Montant minimum", { exact: true }).fill("0,30");
  await page.getByLabel("Montant maximum", { exact: true }).fill("100,5");
  await apply(page);
  await expect(
    page.getByText("Aucune opération ne correspond à ces filtres.", {
      exact: true,
    }),
  ).toBeVisible();
  const params = requests.at(-1)!.searchParams;
  expect(Object.fromEntries(params)).toMatchObject({
    limit: "20",
    sort: "amount",
    order: "asc",
    title: "Café du coin",
    type: "DEPENSE",
    from: "2026-11-01",
    to: "2026-11-30",
    minAmount: "0.30",
    maxAmount: "100.50",
  });
  expect(params.getAll("categoryId")).toEqual(["4", "5"]);
  expect(params.has("cursor")).toBe(false);
  expect(suggestions.some((url) => url.searchParams.get("q") === "Caf")).toBe(
    true,
  );
  await expect(page.getByTestId("list-query-announcement")).toContainText(
    "Tri et filtres appliqués",
  );
  await openFilters(page);
  await page
    .getByLabel("Filtrer par libellé", { exact: true })
    .fill("Texte libre");
  await page.getByLabel("Filtrer par libellé", { exact: true }).press("Enter");
  await apply(page);
  await expect
    .poll(() => requests.at(-1)!.searchParams.get("title"))
    .toBe("Texte libre");
  await page
    .getByRole("button", { name: "Effacer les filtres", exact: true })
    .click();
  await expect(page.getByText("Courses", { exact: true })).toBeVisible();
  expect(requests.at(-1)!.searchParams.get("sort")).toBe("amount");
  expect(requests.at(-1)!.searchParams.has("title")).toBe(false);
  await expect(page.getByTestId("list-query-announcement")).toHaveText(
    "Filtres effacés. Le tri est conservé.",
  );
});

test("invalid ranges do not send requests and a refresh failure keeps rows with a retry", async ({
  page,
}) => {
  let fail = false;
  const requests: URL[] = [];
  await page.route("**/v1/operations?*", (route) => {
    requests.push(new URL(route.request().url()));
    return route.fulfill(
      fail
        ? { status: 503, json: {} }
        : { json: { data: [operation(1, "Courses")], meta: meta() } },
    );
  });
  await openOperations(page);
  await openFilters(page);
  const count = requests.length;
  await page.getByLabel("Date du (AAAA-MM-JJ)").fill("2026-11-30");
  await page.getByLabel("Date au (AAAA-MM-JJ)").fill("2026-11-01");
  await apply(page);
  await expect(
    page.getByText("Filtres à corriger", { exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(count);
  await page.getByLabel("Date du (AAAA-MM-JJ)").fill("");
  await page.getByLabel("Date au (AAAA-MM-JJ)").fill("");
  await page.getByLabel("Montant minimum").fill("50");
  await page.getByLabel("Montant maximum").fill("10");
  await apply(page);
  await expect(page.getByText(/minimum inférieur ou égal/)).toBeVisible();
  expect(requests).toHaveLength(count);
  await page.getByLabel("Montant maximum").fill("100");
  fail = true;
  await apply(page);
  await expect(
    page.getByRole("button", {
      name: "Réessayer l’actualisation",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Courses", { exact: true })).toBeVisible();
  fail = false;
  await page
    .getByRole("button", { name: "Réessayer l’actualisation", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Réessayer l’actualisation",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(requests.at(-1)!.searchParams.get("minAmount")).toBe("50.00");
});

test("stale operation responses never replace the current query", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  let delayed = false;
  await page.route("**/v1/operations?*", async (route) => {
    const title = new URL(route.request().url()).searchParams.get("title");
    if (title === "Ancienne recherche") {
      delayed = true;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    await route.fulfill({
      json: {
        data: [
          operation(title === "Nouvelle recherche" ? 2 : 1, title || "Courses"),
        ],
        meta: meta(),
      },
    });
  });
  await openOperations(page);
  await openFilters(page);
  await page.getByLabel("Filtrer par libellé").fill("Ancienne recherche");
  await apply(page);
  await expect.poll(() => delayed).toBe(true);
  await openFilters(page);
  await page.getByLabel("Filtrer par libellé").fill("Nouvelle recherche");
  await apply(page);
  await expect(
    page.getByText("Nouvelle recherche", { exact: true }),
  ).toBeVisible();
  release!();
  await expect(
    page.getByText("Ancienne recherche", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Nouvelle recherche", { exact: true }),
  ).toBeVisible();
});

const fixedRow = (id: number, title: string, extra = {}) => ({
  idOperationFixe: id,
  titre: title,
  montant: "120.00",
  devise: "EUR",
  typeOperation: "CHARGE",
  periodicite: "ANNUELLE",
  pourcentagePersonnel: "50.00",
  montantPersonnel: "60.00",
  montantMensuelPersonnel: "5.00",
  categoryId: 4,
  category: { id: 4, name: "Alimentation", color: null },
  ...extra,
});

test("fixed budget loads every page before applying local filters and all sort criteria", async ({
  page,
}) => {
  const requests: URL[] = [];
  await page.route("**/v1/operations-fixes?*", (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    return route.fulfill({
      json: {
        data: url.searchParams.has("cursor")
          ? [fixedRow(2, "Électricité", { montantMensuelPersonnel: "10.00" })]
          : [fixedRow(1, "Téléphone")],
        meta: url.searchParams.has("cursor")
          ? meta()
          : meta(true, "all-fixed-next"),
      },
    });
  });
  await signIn(page);
  await page.getByRole("button", { name: /Budget fixe/ }).click();
  await expect(page.getByText("Électricité", { exact: true })).toBeVisible();
  expect(
    requests.some((url) => url.searchParams.get("cursor") === "all-fixed-next"),
  ).toBe(true);
  const count = requests.length;
  await openFilters(page);
  await page.getByRole("button", { name: /^Trier par :/ }).click();
  for (const label of [
    "Libellé",
    "Type",
    "Catégorie",
    "Total / échéance",
    "Devise",
    "Périodicité",
    "Ma part (%)",
    "Personnel / échéance",
    "Personnel / mois",
  ])
    await expect(
      page.getByRole("radio", { name: label, exact: true }),
    ).toBeVisible();
  await page.getByRole("radio", { name: "Libellé", exact: true }).click();
  await page.getByLabel("Filtrer par libellé").fill("electricite");
  await page.getByRole("button", { name: /^Périodicité :/ }).click();
  await page.getByRole("radio", { name: "Annuelle", exact: true }).click();
  await apply(page);
  await expect(page.getByText("Électricité", { exact: true })).toBeVisible();
  await expect(page.getByText("Téléphone", { exact: true })).toHaveCount(0);
  expect(requests).toHaveLength(count);
  await page
    .getByRole("button", { name: "Effacer les filtres", exact: true })
    .click();
  await expect(page.getByText("Téléphone", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(count);
});

for (const width of [320, 390, 768, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`touch filters ${width} ${theme} with enlarged text`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await openOperations(page);
      await openFilters(page);
      await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
        );
        const elements = new Set<HTMLElement>();
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (
            node.textContent?.trim() &&
            node.parentElement &&
            !["SCRIPT", "STYLE"].includes(node.parentElement.tagName)
          )
            elements.add(node.parentElement);
        }
        document
          .querySelectorAll<HTMLInputElement>("input")
          .forEach((input) => elements.add(input));
        const sizes = [...elements].map(
          (element) =>
            [element, parseFloat(getComputedStyle(element).fontSize)] as const,
        );
        for (const [element, size] of sizes)
          if (Number.isFinite(size)) element.style.fontSize = `${size * 2}px`;
      });
      await expect(
        page.getByRole("heading", { name: "Trier et filtrer", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      const controls = await page
        .getByTestId("list-query-panel")
        .locator('[role="button"]:visible, input:visible')
        .evaluateAll((elements) =>
          elements.map((element) => ({
            height: element.getBoundingClientRect().height,
            width: element.getBoundingClientRect().width,
          })),
        );
      for (const control of controls) {
        expect(control.height).toBeGreaterThanOrEqual(48);
        expect(control.width).toBeGreaterThanOrEqual(48);
      }
      if (
        width ===
        { mobile: 390, tablet: 768, desktop: 1440 }[testInfo.project.name]
      )
        await expect(page).toHaveScreenshot(`operation-filters-${theme}.png`, {
          fullPage: true,
        });
      await page
        .getByRole("button", { name: "Fermer les filtres", exact: true })
        .click();
      await expect(
        page.getByText("Vos opérations ponctuelles", { exact: true }),
      ).toBeVisible();
    });
  }
}

for (const theme of ["light", "dark"] as const) {
  test(`captures fixed filters ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await signIn(page);
    await page.getByRole("button", { name: /Budget fixe/ }).click();
    await openFilters(page);
    await expect(
      page.getByRole("heading", { name: "Trier et filtrer", exact: true }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot(`fixed-filters-${theme}.png`, {
      fullPage: true,
    });
  });
}

test("title suggestions paginate without duplicates, retry errors and discard obsolete searches", async ({
  page,
}) => {
  let failNext = true;
  let release: (() => void) | undefined;
  let delayed = false;
  await page.route("**/v1/operations/suggestions/titles?*", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("q") === "Ancien") {
      delayed = true;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      try {
        await route.fulfill({
          json: { data: [{ title: "Ancienne suggestion" }], meta: meta() },
        });
      } catch {
        /* Superseded request was cancelled. */
      }
      return;
    }
    if (url.searchParams.has("cursor") && failNext) {
      failNext = false;
      await route.fulfill({ status: 503, json: {} });
      return;
    }
    await route.fulfill({
      json:
        url.searchParams.get("q") === "Nouveau"
          ? { data: [{ title: "Nouvelle suggestion" }], meta: meta() }
          : {
              data: url.searchParams.has("cursor")
                ? [{ title: "Café" }, { title: "Courses" }]
                : [{ title: "Café" }],
              meta: url.searchParams.has("cursor")
                ? meta()
                : meta(true, "titles-next"),
            },
    });
  });
  await openOperations(page);
  await openFilters(page);
  const input = page.getByLabel("Filtrer par libellé", { exact: true });
  await input.focus();
  await expect(
    page.getByRole("button", { name: "Choisir le libellé Café", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Afficher plus de suggestions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Réessayer les suggestions", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Choisir le libellé Courses",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choisir le libellé Café", exact: true }),
  ).toHaveCount(1);
  await input.fill("Ancien");
  await expect.poll(() => delayed).toBe(true);
  await input.fill("Nouveau");
  await expect(
    page.getByRole("button", {
      name: "Choisir le libellé Nouvelle suggestion",
      exact: true,
    }),
  ).toBeVisible();
  release!();
  await expect(
    page.getByRole("button", {
      name: "Choisir le libellé Ancienne suggestion",
      exact: true,
    }),
  ).toHaveCount(0);
  await input.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Trier et filtrer", exact: true }),
  ).toHaveCount(0);
  await openFilters(page);
  await expect(input).toHaveValue("");
  await input.pressSequentially("x".repeat(60));
  await expect(input).toHaveValue("x".repeat(50));
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Effacer les filtres", exact: true }),
  ).toHaveCount(0);
});
