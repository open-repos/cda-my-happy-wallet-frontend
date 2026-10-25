import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";
import { forecastFixture } from "../visual/forecastFixture.mjs";

// Observe les écritures DOM dans les régions live ; cela ne remplace pas
// l’écoute réelle NVDA/VoiceOver qui reste suivie dans #171.
const observeAnnouncements = async (page) =>
  page.evaluate(() => {
    window.announcedTexts = [];
    new MutationObserver(() => {
      for (const node of document.querySelectorAll(
        '[role="status"], [role="alert"]'
      ))
        if (node.textContent) window.announcedTexts.push(node.textContent);
    }).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
const clearAnnouncements = async (page) =>
  page.evaluate(() => {
    window.announcedTexts.length = 0;
  });
const noLoading = async (page, text) =>
  expect(
    await page.evaluate(
      (text) => window.announcedTexts.filter((value) => value.includes(text)),
      text
    )
  ).toEqual([]);
const gate = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const meta = { limit: 100, hasNext: false, nextCursor: null };
const categories = [{ id: 4, name: "Courant", color: null, icon: null }];
const operation = {
  id: 1,
  title: "Courses",
  amount: "20.00",
  currency: "EUR",
  type: "DEPENSE",
  operationDate: "2026-10-18",
  categoryId: 4,
};
for (const width of [390, 768, 1440]) {
  for (const kind of ["categories", "operations"]) {
    test(`${kind} mutation keeps loading announcements silent at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
      await prepareProtectedPage(page);
      let held = gate();
      let reads = 0;
      const path =
        kind === "categories"
          ? /\/v1\/operation-categories(?:\?.*)?$/
          : /\/v1\/operations(?:\?.*)?$/;
      await page.route(path, async (route) => {
        const request = route.request();
        if (request.method() === "GET") {
          reads += 1;
          await held.promise;
          return route.fulfill({
            json: {
              data: kind === "categories" ? categories : [operation],
              meta,
            },
          });
        }
        return route.fulfill({
          status: 201,
          json: {
            data:
              kind === "categories"
                ? { ...categories[0], ...request.postDataJSON() }
                : operation,
          },
        });
      });
      await page.goto(kind === "categories" ? "/categories" : "/operations");
      const loading =
        kind === "categories"
          ? "Chargement des catégories…"
          : "Chargement des opérations…";
      await expect(
        page.getByRole("status").filter({ hasText: loading })
      ).toHaveCount(1);
      await observeAnnouncements(page);
      held.resolve();
      const loadedItem =
        kind === "categories"
          ? page.getByRole("button", { name: "Modifier Courant", exact: true })
          : page.getByText("Courses", { exact: true }).first();
      await expect(loadedItem).toBeVisible();
      await page
        .getByRole("button", {
          name:
            kind === "categories"
              ? "Ajouter une catégorie"
              : "Ajouter une opération",
          exact: true,
        })
        .click();
      if (kind === "categories")
        await page.getByLabel("Nom", { exact: true }).fill("Loisirs");
      else {
        await page
          .getByRole("button", { name: /^Dépense Opération réelle/ })
          .click();
        await page.getByLabel(/^Titre/).fill("Courses E2E");
        await page.getByLabel(/^Montant/).fill("20.00");
        await page.getByLabel(/^Date/).fill("2026-10-18");
        await page.getByRole("combobox", { name: "Catégorie" }).click();
        await page.getByRole("option", { name: "Alimentation" }).click();
      }
      const before = reads;
      held = gate();
      await clearAnnouncements(page);
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect.poll(() => reads).toBeGreaterThan(before);
      if (kind === "operations") await expect(loadedItem).toBeVisible();
      await noLoading(page, loading);
      held.resolve();
      await expect(
        page.getByRole("status").filter({
          hasText:
            kind === "categories" ? "Catégorie ajoutée." : "Ajout enregistré.",
        })
      ).toHaveCount(1);
    });
  }
  for (const kind of ["home", "forecast"]) {
    test(`${kind} invalidate keeps loading announcements silent at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
      await prepareProtectedPage(page);
      let held = gate(),
        reads = 0;
      await page.route(
        kind === "home"
          ? /\/v1\/budget-periods\/(\d{4}-\d{2})\/summary/
          : /\/v1\/budget-forecast(?:\?.*)?$/,
        async (route) => {
          reads += 1;
          await held.promise;
          if (kind === "forecast")
            return route.fulfill({
              json: { data: forecastFixture(route.request().url()) },
            });
          return route.fulfill({
            json: {
              data: {
                month: "2026-10",
                currency: "EUR",
                status: "OPEN",
                revision: 1,
                correctedAt: null,
                balanceStatus: "POSITIVE",
                fixedIncome: "2000.00",
                fixedExpense: "800.00",
                base: "1200.00",
                carryIn: "0.00",
                carryFromMonth: null,
                actualIncome: "0.00",
                actualExpense: "0.00",
                monthResult: "1200.00",
                realRemaining: "1200.00",
                remainingDays: 14,
                realDailyAllowance: "85.71",
                unresolvedEvents: 0,
                forecast: null,
                days: [],
              },
            },
          });
        }
      );
      await page.goto(kind === "home" ? "/home" : "/prochains-mois");
      const loading =
        kind === "home"
          ? "Chargement du reste à vivre…"
          : "Chargement des prévisions…";
      await expect(
        page.getByRole("status").filter({ hasText: loading })
      ).toHaveCount(1);
      await observeAnnouncements(page);
      held.resolve();
      const result =
        kind === "home"
          ? page.locator(".home-budget__amount")
          : page.getByRole("table", { name: "Prévisions mensuelles" });
      await expect(result).toBeVisible();
      held = gate();
      const before = reads;
      await clearAnnouncements(page);
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect.poll(() => reads).toBeGreaterThan(before);
      const copy =
        kind === "home"
          ? page.locator('.home-budget__state[aria-hidden="true"]')
          : page.locator('.budget-forecast__panel[aria-hidden="true"]');
      await expect(copy.filter({ hasText: loading })).toBeVisible();
      await noLoading(page, loading);
      held.resolve();
      await expect(result).toBeVisible();
    });
  }
}
