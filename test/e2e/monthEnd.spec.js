import { expect, test } from "@playwright/test";
import { prepareSavingsPage } from "./savingsFixture.mjs";
import {
  decidedDecision,
  pendingDecision,
  reviewDecision,
  savingsOccurrence,
} from "../fixtures/monthEnd.mjs";

/**
 * Parcours #396 : proposition, décision, correction et cloche, à 320, 390,
 * 768 et 1440 px en thème clair et sombre.
 */
const prepareMonthEnd = async (page, { decision, occurrences = [] }) => {
  const state = await prepareSavingsPage(page);
  let current = decision;
  let pending = occurrences;
  const puts = [];
  await page.route(/\/v1\/budget-periods\/\d{4}-\d{2}\/decision/, (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      const body = request.postDataJSON();
      puts.push(body);
      const total = (rows) =>
        rows.reduce((sum, row) => sum + row.amountMinorUnits, 0);
      const result = current.resultBeforeDecisionMinorUnits;
      current = {
        ...current,
        status: "DECIDED",
        revision: current.revision + 1,
        savings: body.savings,
        coverage: body.coverage,
        exceptionalIncomeMinorUnits: body.exceptionalIncomeMinorUnits,
        savingsMinorUnits: total(body.savings),
        coverageMinorUnits: total(body.coverage),
        referenceResultMinorUnits: result,
        carryMinorUnits:
          result -
          total(body.savings) +
          total(body.coverage) +
          body.exceptionalIncomeMinorUnits,
        requiresReview: false,
        correctionDeltaMinorUnits: 0,
      };
    }
    return route.fulfill({ json: { data: current } });
  });
  await page.route(/\/v1\/savings-occurrences\/pending/, (route) =>
    route.fulfill({
      json: {
        data: pending,
        meta: { limit: 20, hasNext: false, nextCursor: null },
      },
    })
  );
  await page.route(/\/v1\/savings-accounts\/\d+\/occurrences\//, (route) => {
    const body = route.request().postDataJSON();
    pending = [];
    return route.fulfill({
      json: { data: { status: body.status, movement: null } },
    });
  });
  return { ...state, puts };
};

const fits = async (page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  const width = await page.evaluate(() => innerWidth);
  for (const control of await page
    .locator("main button:visible, main a:visible, main input:visible")
    .all()) {
    const box = await control.boundingBox();
    if (!box) continue;
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
  }
};
const bell = (page) =>
  page.locator(".notification-bell__button:visible").first();

for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"]) {
    test(`décision de fin de mois ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        (value) => localStorage.setItem("mhw-theme", value),
        theme
      );
      const state = await prepareMonthEnd(page, {
        decision: pendingDecision(),
        occurrences: [savingsOccurrence()],
      });
      await page.goto("/home");
      const banner = page.getByRole("region", {
        name: /Il vous reste 150,00\s€ d’octobre/,
      });
      await expect(banner).toBeVisible();
      await expect(bell(page)).toHaveAccessibleName(
        "Notifications, 2 à traiter"
      );
      await fits(page);

      await bell(page).click();
      const panel = page.locator(".notification-panel:visible");
      await expect(panel).toContainText("Décision d’octobre en attente");
      await expect(panel).toContainText("Versement mensuel à confirmer");
      await page.keyboard.press("Escape");
      await expect(bell(page)).toBeFocused();

      await banner.getByRole("link", { name: "Décider maintenant" }).click();
      await expect(
        page.getByRole("heading", { name: "Décider du solde d’octobre 2026" })
      ).toBeFocused();
      await page.getByLabel(/Répartir/).check();
      await page.getByLabel(/Épargner sur Voyage au Japon/).fill("100");
      await expect(
        page.getByRole("complementary", { name: "Votre décision" })
      ).toContainText(/Report sur novembre\s*50,00/);
      await fits(page);
      await page.getByRole("button", { name: "Valider la décision" }).click();
      await expect(
        page.getByRole("heading", { name: "Décision d’octobre 2026" })
      ).toBeVisible();
      expect(state.puts).toHaveLength(1);
      expect(state.puts[0]).toMatchObject({
        expectedRevision: 0,
        savings: [{ accountId: 1, amountMinorUnits: 10000 }],
        coverage: [],
        exceptionalIncomeMinorUnits: 0,
      });
      await expect(page.getByText("✓ Décidée")).toBeVisible();
      await fits(page);

      await bell(page).click();
      await page
        .locator(".notification-panel:visible")
        .getByRole("button", { name: "Confirmer le virement" })
        .click();
      await expect(bell(page)).toHaveAccessibleName(
        "Notifications, rien à traiter"
      );
    });
  }

test("avertit après une correction sans toucher à l’épargne", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  const state = await prepareMonthEnd(page, { decision: reviewDecision() });
  await page.goto("/fin-de-mois/2026-10");
  const warning = page.getByRole("region", {
    name: /À revoir : octobre a changé/,
  });
  await expect(warning).toContainText(/100,00\s€/);
  await expect(warning).toContainText(/50,00\s€\s→\s20,00\s€/);
  await warning.getByRole("button", { name: "Garder ma décision" }).click();
  await expect(warning).toHaveCount(0);
  expect(state.puts[0]).toMatchObject({
    expectedRevision: 1,
    savings: decidedDecision().savings,
  });
});

test("couvre un déficit par l’épargne et une entrée exceptionnelle", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  const state = await prepareMonthEnd(page, {
    decision: pendingDecision({
      resultBeforeDecisionMinorUnits: -15000,
      referenceResultMinorUnits: -15000,
      carryMinorUnits: -15000,
    }),
  });
  await page.goto("/fin-de-mois/2026-10");
  await page.getByLabel(/Couvrir tout ou partie/).check();
  await page.getByLabel(/Prélever sur Épargne de sécurité/).fill("50");
  await page.getByLabel(/Montant reçu pour couvrir octobre/).fill("70");
  await expect(
    page.getByRole("complementary", { name: "Votre décision" })
  ).toContainText(/Déficit reporté sur novembre\s*[−-]\s?30,00/);
  await fits(page);
  await page.getByRole("button", { name: "Valider la décision" }).click();
  await expect(page.getByText("Couverture du déficit")).toBeVisible();
  expect(state.puts[0]).toMatchObject({
    coverage: [{ accountId: 2, amountMinorUnits: 5000 }],
    exceptionalIncomeMinorUnits: 7000,
  });
});

test("garde la cloche utilisable dans la navigation repliée", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepareMonthEnd(page, {
    decision: pendingDecision(),
    occurrences: [savingsOccurrence()],
  });
  await page.goto("/home");
  await page.getByRole("button", { name: "Réduire la navigation" }).click();
  const button = bell(page);
  await expect(button).toHaveAccessibleName("Notifications, 2 à traiter");
  const nav = await page.locator("#main-navigation").boundingBox();
  const box = await button.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(nav.x);
  expect(box.x + box.width).toBeLessThanOrEqual(nav.x + nav.width + 1);
  await button.click();
  const panel = page.locator(".notification-panel:visible");
  await expect(panel).toBeInViewport({ ratio: 1 });
  await page.keyboard.press("Escape");
  await expect(button).toBeFocused();
});
