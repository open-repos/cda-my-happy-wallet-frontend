import { expect, Page, Route, test } from "@playwright/test";

// Versements à confirmer, Calendrier et cloche « À traiter » (#425) :
// contrats `savings-accounts.md` (#183) et `month-end-decisions.md` (#184),
// simulés avec un état par test. Le serveur retire un versement traité.
interface Options {
  /** Décision d'octobre déjà prise (sinon en attente, 150 €). */
  decided?: boolean;
  /** Réponse de la lecture des versements prévus. */
  occurrencesStatus?: number;
  /** La prochaine résolution répond « déjà traité ». */
  alreadyResolved?: boolean;
  /** Nombre de versements prévus (un par défaut). */
  occurrenceCount?: number;
}

const refusal = (route: Route, status: number, code: string) =>
  route.fulfill({ status, json: { error: { details: { code } } } });
const page1 = (data: unknown[]) => ({
  data,
  meta: { limit: 20, hasNext: false, nextCursor: null },
});

const mockPendingItems = async (page: Page, options: Options = {}) => {
  const state = {
    occurrences: Array.from(
      { length: options.occurrenceCount ?? 1 },
      (_, index) => ({
        accountId: index + 1,
        goalId: index + 3,
        month: "2026-11",
        operationDate: "2026-11-01",
        title: index === 0 ? "Voyage au Japon" : `Objectif n° ${index + 1}`,
        amountMinorUnits: 12000,
        currency: "EUR",
      }),
    ),
    balance: 243000,
    writes: [] as { path: string; body: unknown }[],
    alreadyResolved: options.alreadyResolved ?? false,
  };
  const decision = {
    month: "2026-10",
    currency: "EUR",
    status: options.decided ? "DECIDED" : "PENDING",
    revision: options.decided ? 1 : 0,
    savings: options.decided ? [{ accountId: 1, amountMinorUnits: 10000 }] : [],
    coverage: [],
    exceptionalIncomeMinorUnits: 0,
    savingsMinorUnits: options.decided ? 10000 : 0,
    coverageMinorUnits: 0,
    referenceResultMinorUnits: 15000,
    resultBeforeDecisionMinorUnits: 15000,
    carryMinorUnits: options.decided ? 5000 : 15000,
    requiresReview: false,
    correctionDeltaMinorUnits: 0,
  };

  await page.route(/\/v1\/budget-periods\/(\d{4}-\d{2})\/decision/, (route) =>
    /2026-10/.test(route.request().url())
      ? route.fulfill({ json: { data: decision } })
      : refusal(route, 409, "PERIOD_NOT_CLOSED"),
  );
  // Résumé d'octobre clos ; `monthEndDecision` n'existe qu'une fois décidé.
  await page.route(/\/v1\/budget-periods\/2026-10\/summary/, (route) =>
    route.fulfill({
      json: {
        data: {
          month: "2026-10",
          currency: "EUR",
          status: "CLOSED",
          base: "100.00",
          carryIn: "40.00",
          carryFromMonth: "2026-09",
          actualIncome: "20.00",
          actualExpense: "10.00",
          monthResult: "110.00",
          realRemaining: "150.00",
          remainingDays: 0,
          realDailyAllowance: null,
          forecast: null,
          days: [],
          ...(options.decided ? { monthEndDecision: decision } : {}),
        },
      },
    }),
  );
  await page.route(/\/v1\/savings-occurrences\/pending\?/, (route) =>
    options.occurrencesStatus
      ? route.fulfill({ status: options.occurrencesStatus, json: {} })
      : route.fulfill({ json: page1(state.occurrences) }),
  );
  await page.route(/\/v1\/savings-accounts(\/|\?|$)/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "PUT" && /\/occurrences\//.test(url.pathname)) {
      const body = request.postDataJSON() as { status: string };
      state.writes.push({ path: url.pathname.replace("/v1", ""), body });
      if (state.alreadyResolved) {
        state.alreadyResolved = false;
        state.occurrences = [];
        return refusal(route, 409, "OCCURRENCE_ALREADY_RESOLVED");
      }
      state.occurrences = [];
      if (body.status === "CONFIRMED") state.balance += 12000;
      return route.fulfill({
        json: { data: { status: body.status, movement: null } },
      });
    }
    return route.fulfill({
      json: page1([
        {
          id: 1,
          name: "Voyage au Japon",
          currency: "EUR",
          initialBalanceMinorUnits: 0,
          balanceMinorUnits: state.balance,
          archived: false,
          goalId: null,
        },
      ]),
    });
  });
  await page.route(/\/v1\/accounts\/current(\/movements)?\?/, (route) =>
    new URL(route.request().url()).pathname.endsWith("/movements")
      ? route.fulfill({ json: page1([]) })
      : route.fulfill({
          json: {
            data: {
              type: "CURRENT",
              month: "2026-11",
              currency: "EUR",
              balanceMinorUnits: 124760 - (243000 - state.balance),
              balanceBasis: "AVAILABLE_BUDGET",
              budget: {
                baseMinorUnits: 200000,
                carryInMinorUnits: 5000,
                actualIncomeMinorUnits: 0,
                actualExpenseMinorUnits: 80240,
              },
            },
          },
        }),
  );
  return state;
};

const signIn = async (page: Page) => {
  await page.clock.setFixedTime(new Date("2026-11-11T10:00:00+01:00"));
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

const openVault = async (page: Page) => {
  await page
    .getByRole("button", { name: /Coffre Retrouvez votre épargne/ })
    .click();
  await expect(
    page.getByRole("heading", { exact: true, name: "Coffre" }),
  ).toBeVisible();
};

const expectNoHorizontalOverflow = async (page: Page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
};

test("confirms the monthly payment from the Vault and reads the balance again", async ({
  page,
}) => {
  const state = await mockPendingItems(page);
  await signIn(page);
  await openVault(page);
  const list = page
    .getByTestId("vault-screen")
    .getByTestId("savings-occurrences");
  await expect(
    list.getByRole("heading", { name: "À confirmer (1)" }),
  ).toBeVisible();
  await expect(
    list.getByText(
      /^Prévu le 1 novembre 2026 · 120,00\s€ du compte courant vers l’épargne$/,
    ),
  ).toBeVisible();
  const confirm = list.getByRole("button", {
    name: /^Confirmer le virement de 120,00\s€ vers Voyage au Japon, prévu le 1 novembre 2026$/,
  });
  expect((await confirm.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  await expectNoHorizontalOverflow(page);
  await expect(list).toHaveScreenshot("pending-vault.png");

  await confirm.click();
  await expect(
    list.getByText(/^Virement de 120,00\s€ confirmé vers Voyage au Japon\.$/),
  ).toBeVisible();
  expect(state.writes).toEqual([
    {
      path: "/savings-accounts/1/occurrences/2026-11",
      body: { status: "CONFIRMED" },
    },
  ]);
  // L'élément traité disparaît ; le Coffre relu montre le nouveau solde.
  await expect(list.getByRole("button", { name: /^Confirmer/ })).toHaveCount(0);
  await expect(page.getByText(/^2\s550,00\s€$/)).toBeVisible();
});

test("skips the payment for this month only", async ({ page }) => {
  const state = await mockPendingItems(page);
  await signIn(page);
  await openVault(page);
  await page
    .getByRole("button", {
      name: /^Ne pas verser les 120,00\s€ prévus le 1 novembre 2026 pour Voyage au Japon$/,
    })
    .click();
  await expect(
    page.getByText("Versement de Voyage au Japon non effectué ce mois-ci."),
  ).toBeVisible();
  expect(state.writes[0].body).toEqual({ status: "CANCELED" });
  await expect(page.getByText(/^2\s430,00\s€$/)).toBeVisible();
});

test("explains a payment already resolved elsewhere and drops it", async ({
  page,
}) => {
  await mockPendingItems(page, { alreadyResolved: true });
  await signIn(page);
  await openVault(page);
  await page
    .getByRole("button", { name: /^Confirmer le virement de 120,00/ })
    .click();
  await expect(
    page.getByText("Ce versement a déjà été traité. La liste est actualisée."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Confirmer le virement/ }),
  ).toHaveCount(0);
});

test("lists the pending decision and the payment under the bell", async ({
  page,
}) => {
  await mockPendingItems(page);
  await signIn(page);
  const bell = page.getByRole("button", { name: "À traiter : 2 éléments" });
  expect((await bell.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  await bell.click();
  const sheet = page.getByTestId("attention-sheet");
  await expect(sheet.getByRole("heading", { name: "À traiter" })).toBeVisible();
  await expect(
    sheet.getByText(/^150,00\s€ reportés pour l’instant\.$/),
  ).toBeVisible();
  await expect(
    sheet.getByText(
      /^Voyage au Japon · 120,00\s€ prévus le 1 novembre 2026\.$/,
    ),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(sheet).toHaveScreenshot("pending-bell.png");

  // Une entrée mène à son écran ; la cloche se met à jour au retour.
  await sheet
    .getByRole("button", { name: "Versement mensuel à confirmer" })
    .click();
  await expect(
    page.getByRole("heading", { exact: true, name: "Coffre" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /^Confirmer le virement de 120,00/ })
    .click();
  await expect(page.getByText(/confirmé vers Voyage au Japon/)).toBeVisible();
  await page.getByRole("link", { name: "Retour à l’accueil" }).click();
  await expect(
    page.getByRole("button", { name: "À traiter : 1 élément" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "À traiter : 1 élément" }).click();
  await page
    .getByTestId("attention-sheet")
    .getByRole("button", { name: "Décision d’octobre en attente" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Décider du solde d’octobre 2026" }),
  ).toBeVisible();
});

test("keeps the Home quiet when the bell reads fail", async ({ page }) => {
  await mockPendingItems(page, { occurrencesStatus: 503 });
  await page.route(/\/v1\/budget-periods\/2026-10\/decision/, (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await signIn(page);
  await expect(page.getByText(/n’ont pas pu être vérifiés/)).toHaveCount(0);
  await page
    .getByRole("button", { name: "À traiter : rien pour le moment" })
    .click();
  await expect(
    page
      .getByTestId("attention-sheet")
      .getByText("Certains éléments n’ont pas pu être vérifiés."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fermer « À traiter »" }).click();
  await expect(page.getByTestId("attention-sheet")).toHaveCount(0);
});

test("shows the decision in the summary of a closed month", async ({
  page,
}) => {
  await mockPendingItems(page, { decided: true });
  await signIn(page);
  await page
    .getByRole("button", { name: "Voir la décision d’octobre" })
    .or(page.getByRole("link", { name: "Voir la décision d’octobre" }))
    .click();
  await page.getByRole("button", { name: "Voir le résumé d’octobre" }).click();
  const card = page.getByTestId("closed-month-summary");
  await expect(card.getByText("✓ Décidée")).toBeVisible();
  await expect(
    card.getByText(/^100,00\s€ épargnés ; 50,00\s€ reportés\.$/),
  ).toBeVisible();
  await expect(
    card.getByLabel(/^Report sur novembre : \+50,00\s€$/),
  ).toBeVisible();
  await expect(
    card.getByLabel(/^Report de septembre : \+40,00\s€$/),
  ).toBeVisible();
  // Les versements prévus restent dans « À traiter » du calendrier.
  await expect(
    page
      .getByTestId("calendar-scroll-content")
      .getByRole("heading", { name: "À traiter (1)" }),
  ).toBeVisible();
  // Deux colonnes à partir de 768 px, comme la maquette (« Résumé du mois »
  // à côté de « À traiter »).
  const todo = page
    .getByTestId("calendar-scroll-content")
    .getByTestId("savings-occurrences");
  const [cardBox, todoBox] = [
    await card.boundingBox(),
    await todo.boundingBox(),
  ];
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    expect(todoBox?.y).toBe(cardBox?.y);
    expect(todoBox?.x).toBeGreaterThan(
      (cardBox?.x ?? 0) + (cardBox?.width ?? 0) - 1,
    );
  } else {
    expect(todoBox?.y).toBeGreaterThan(cardBox?.y ?? 0);
  }
  await expectNoHorizontalOverflow(page);
  await expect(page.getByTestId("calendar-month-end")).toHaveScreenshot(
    "pending-calendar.png",
  );
  await card
    .getByRole("button", { name: "Voir ou modifier la décision" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Décision d’octobre 2026" }),
  ).toBeVisible();
});

test("invites to decide a closed month and hides the card for the current one", async ({
  page,
}) => {
  await mockPendingItems(page);
  await signIn(page);
  await page.getByRole("tab", { name: /Calendrier/ }).click();
  await expect(page.getByTestId("closed-month-summary")).toHaveCount(0);
  await page.getByRole("button", { name: "Mois précédent" }).click();
  const card = page.getByTestId("closed-month-summary");
  await expect(
    card.getByText("Décision en attente · tout le solde est reporté."),
  ).toBeVisible();
  await card.getByRole("button", { name: "Décider" }).click();
  await expect(
    page.getByRole("heading", { name: "Décider du solde d’octobre 2026" }),
  ).toBeVisible();
});

// Expo Web n'a pas d'échelle de police système : chaque texte rendu est
// agrandi ×1,3, comme dans `vault.spec.ts`.
const enlargeText = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((root) => {
    for (const el of root.querySelectorAll<HTMLElement>("*")) {
      if (el.childElementCount === 0 && el.textContent?.trim()) {
        const original =
          el.dataset.pendingTestFontSize ?? getComputedStyle(el).fontSize;
        el.dataset.pendingTestFontSize = original;
        el.style.fontSize = `${parseFloat(original) * 1.3}px`;
        el.style.lineHeight = "normal";
      }
    }
  });

/** Textes et boutons visibles qui sortent de l'écran ou sont rognés. */
const overflowing = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((root) => {
    const bad: string[] = [];
    for (const el of root.querySelectorAll<HTMLElement>("*")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || !el.checkVisibility()) {
        continue;
      }
      const label = (el.textContent ?? "").trim().slice(0, 30);
      if (
        el.childElementCount === 0 &&
        label.length > 0 &&
        (rect.right > window.innerWidth + 0.5 ||
          rect.left < -0.5 ||
          el.scrollWidth > el.clientWidth + 1)
      ) {
        bad.push(`débordement: ${label}`);
      }
      if (el.getAttribute("role") === "button" && rect.height < 48) {
        bad.push(`cible ${Math.round(rect.height)} px: ${label}`);
      }
    }
    return bad;
  });

test("keeps the pending items readable with text enlarged 1.3 times", async ({
  page,
}) => {
  await mockPendingItems(page, { decided: true });
  await signIn(page);
  await page.getByRole("button", { name: "À traiter : 1 élément" }).click();
  // Mesure après l'animation d'ouverture de la feuille.
  await page
    .getByRole("button", { name: "Fermer « À traiter »" })
    .click({ trial: true });
  await enlargeText(page, "attention-sheet");
  expect(await overflowing(page, "attention-sheet")).toEqual([]);
  await page.getByRole("button", { name: "Fermer « À traiter »" }).click();

  await openVault(page);
  await enlargeText(page, "savings-occurrences");
  expect(await overflowing(page, "savings-occurrences")).toEqual([]);

  await page.getByRole("tab", { name: /Calendrier/ }).click();
  await page.getByRole("button", { name: "Mois précédent" }).click();
  await expect(page.getByTestId("closed-month-summary")).toBeVisible();
  await enlargeText(page, "closed-month-summary");
  expect(await overflowing(page, "closed-month-summary")).toEqual([]);
  await expectNoHorizontalOverflow(page);
});

test("scrolls a long « À traiter » sheet and keeps its close button", async ({
  page,
}) => {
  await mockPendingItems(page, { occurrenceCount: 8 });
  await signIn(page);
  await page.getByRole("button", { name: "À traiter : 9 éléments" }).click();
  const sheet = page.getByTestId("attention-sheet");
  const close = sheet.getByRole("button", { name: "Fermer « À traiter »" });
  // Mesure après l'animation d'ouverture de la feuille.
  await close.click({ trial: true });
  await enlargeText(page, "attention-sheet");
  const viewport = page.viewportSize()?.height ?? 0;
  const closeBox = await close.boundingBox();
  expect(closeBox?.y).toBeGreaterThanOrEqual(0);
  expect((closeBox?.y ?? 0) + (closeBox?.height ?? 0)).toBeLessThanOrEqual(
    viewport,
  );
  // La dernière entrée s'atteint en faisant défiler la liste.
  const last = sheet
    .getByRole("button", { name: "Versement mensuel à confirmer" })
    .last();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  await expect(close).toBeInViewport();
  await close.click();
  await expect(sheet).toHaveCount(0);
});
