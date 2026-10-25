import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";
const date = "2026-10-25";
const event = {
  id: 8,
  title: "Facture confirmée",
  amount: "30.00",
  currency: "EUR",
  kind: "DEPENSE",
  startDate: date,
  occurrenceDate: date,
  recurrence: "MENSUELLE",
  endDate: null,
  status: "CONFIRME",
};
const operation = {
  id: 1,
  title: "Courses réelles",
  amount: "20.00",
  currency: "EUR",
  type: "DEPENSE",
  operationDate: date,
  categoryId: 4,
};
const meta = (next) => ({
  limit: 100,
  hasNext: !!next,
  nextCursor: next ?? null,
});
for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"])
    test(`complete day with all types at ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.setFixedTime(new Date("2026-10-26T00:30:00-12:00"));
      await prepareProtectedPage(page);
      await page.addInitScript(
        (t) => localStorage.setItem("mhw-theme", t),
        theme
      );
      const operations = Array.from({ length: 122 }, (_, i) => ({
        ...operation,
        id: i + 1,
        title: i === 121 ? "Dernière page entrée" : `Courses ${i + 1}`,
        type: i === 121 ? "ENTREE" : "DEPENSE",
      }));
      let pages = [];
      await page.route(/\/v1\/operations(?:\?.*)?$/, (route) => {
        const query = new URL(route.request().url()).searchParams;
        pages.push(query.get("cursor"));
        const next = query.has("cursor");
        return route.fulfill({
          json: {
            data: next ? operations.slice(100) : operations.slice(0, 100),
            meta: meta(next ? null : "next.operations"),
          },
        });
      });
      await page.route(/\/v1\/event-occurrences(?:\?.*)?$/, (route) =>
        route.fulfill({
          json: {
            data: [
              event,
              {
                ...event,
                id: 9,
                title: "Projet potentiel",
                status: "POTENTIEL",
              },
              { ...event, id: 10, title: "Déjà converti" },
            ],
            meta: meta(),
          },
        })
      );
      await page.route(
        /\/v1\/event-occurrence-resolutions(?:\?.*)?$/,
        (route) =>
          route.fulfill({
            json: {
              data: [
                {
                  eventId: 10,
                  occurrenceDate: date,
                  status: "REALIZED",
                  title: "Déjà converti",
                  amount: "30.00",
                  currency: "EUR",
                  kind: "DEPENSE",
                  resolvedAt: "2026-10-25T10:00:00Z",
                  operation: {
                    id: 1,
                    title: "Courses 1",
                    amount: "20.00",
                    operationDate: date,
                    categoryId: 4,
                  },
                },
              ],
              meta: meta(),
            },
          })
      );
      await page.goto("/calendrier");
      const day = page.getByRole("button", {
        name: /^25 octobre 2026.*122 opérations réelles.*1 événement prévu.*1 élément potentiel.*1 événement en retard/,
      });
      await expect(day).toBeVisible();
      expect(new Set(pages)).toEqual(new Set([null, "next.operations"]));
      await expect(day.locator(".budget-marker")).toHaveCount(4);
      await day.focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("heading", { name: "Éléments du 25 octobre 2026" })
      ).toBeVisible();
      await expect(
        page.getByText("Dernière page entrée", { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText("Projet potentiel", { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText("Facture confirmée", { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText("Élément potentiel · à confirmer · exclu du réel")
      ).toBeVisible();
      await expect(
        page.getByText("Déjà converti", { exact: true })
      ).toHaveCount(0);
      await page.locator("html").evaluate((el) => (el.style.fontSize = "200%"));
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: test.info().outputPath(`calendar-${width}-${theme}.png`),
        fullPage: false,
      });
    });
test("future without summary and incomplete read retry", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-26T10:00:00Z"));
  await prepareProtectedPage(page);
  await page.route(/\/v1\/budget-periods\/.*\/summary/, (route) =>
    route.fulfill({
      status: 422,
      json: { error: { details: { code: "FUTURE_PERIOD" } } },
    })
  );
  let fail = true,
    writes = 0;
  await page.route(/\/v1\/event-occurrence-resolutions(?:\?.*)?$/, (route) => {
    if (route.request().method() !== "GET") writes++;
    return fail
      ? route.fulfill({ status: 503, json: { message: "offline" } })
      : route.fulfill({ json: { data: [], meta: meta() } });
  });
  await page.route(/\/v1\/event-occurrences(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            ...event,
            title: "Projet futur",
            status: "POTENTIEL",
            startDate: "2026-11-01",
            occurrenceDate: "2026-11-01",
          },
        ],
        meta: meta(),
      },
    })
  );
  await page.goto("/calendrier");
  await page.getByRole("button", { name: "Mois suivant" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Les éléments n’ont pas pu être chargés." })
  ).toBeVisible();
  await expect(page.getByText("Aucun élément ce mois.")).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Réessayer les éléments" }).click();
  await expect(
    page.getByRole("button", { name: /^1 novembre 2026.*1 élément potentiel/ })
  ).toBeVisible();
  expect(writes).toBe(0);
});
