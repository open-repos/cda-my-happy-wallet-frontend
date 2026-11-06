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
      const potentialLink = page.getByRole("link", {
        name: "Gérer Projet potentiel dans la Simulation",
      });
      const contrast = await potentialLink.evaluate((el) => {
        const rgb = (value) => value.match(/[\d.]+/g).map(Number);
        const lum = (c) =>
          c
            .slice(0, 3)
            .map((v) => v / 255)
            .map((v) =>
              v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
            )
            .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
        let parent = el;
        while (parent) {
          const bg = rgb(getComputedStyle(parent).backgroundColor);
          if (bg.length === 3 || bg[3] === 1) {
            const [high, low] = [
              lum(rgb(getComputedStyle(el).color)),
              lum(bg),
            ].sort((a, b) => b - a);
            return (high + 0.05) / (low + 0.05);
          }
          parent = parent.parentElement;
        }
        return 0;
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      for (const action of await page
        .locator(".budget-occurrence__actions button")
        .all()) {
        const bounds = await action.boundingBox();
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeLessThanOrEqual(80);
      }
      const edit = page.getByRole("button", {
        name: "Modifier Courses 1",
        exact: true,
      });
      await edit.click();
      const title = page.getByLabel("Titre", { exact: true });
      await title.fill("Brouillon du calendrier");
      await page.getByRole("button", { name: "Annuler", exact: true }).click();
      await expect(edit).toBeFocused();
      const remove = page.getByRole("button", {
        name: "Supprimer Courses 1",
        exact: true,
      });
      await remove.click();
      const confirmation = page.getByRole("group", {
        name: "Supprimer « Courses 1 » ?",
      });
      await expect(
        confirmation.getByRole("button", { name: "Annuler", exact: true })
      ).toBeFocused();
      await expect(
        confirmation.getByRole("button", { name: "Oui, supprimer" })
      ).toHaveAttribute("data-variant", "danger");
      await confirmation
        .getByRole("button", { name: "Annuler", exact: true })
        .click();
      await expect(remove).toBeFocused();
      await expect(day).toHaveAttribute("aria-pressed", "true");
      await page.locator("html").evaluate((el) => (el.style.fontSize = "200%"));
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: test.info().outputPath(`calendar-${width}-${theme}.png`),
        fullPage: false,
      });
    });

// #379: every cell shows its cumulative daily remaining, which must fit the
// narrowest day cell, including a long negative value.
for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"])
    test(`forecast cells show the daily remaining at ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
      await prepareProtectedPage(page, {
        dailyRemaining: { "2026-10-23": "-1234.50" },
      });
      await page.addInitScript((t) => {
        localStorage.setItem("mhw-theme", t);
        localStorage.setItem("mhw.calendar.mode", "forecast");
      }, theme);
      await page.goto("/calendrier");
      // 38.70 × 20 − 42.50 expense − 120.00 planned event.
      const twentieth = page.getByRole("button", {
        name: /^20 octobre 2026, .*reste à vivre du jour 611,50/,
      });
      await expect(twentieth).toContainText("611,5");
      const negative = page.getByRole("button", {
        name: /^23 octobre 2026, .*reste à vivre du jour [−-]1\u202f?\s?234,50/,
      });
      await expect(negative.locator(".budget-day__value")).toHaveText(
        /^[−-]1,2\s?k$/
      );
      await expect(page.locator(".budget-day__value")).toHaveCount(31);
      const overflowing = await page
        .locator(".budget-day__value")
        .evaluateAll((values) =>
          values
            .filter((value) => {
              const cell = value.closest(".budget-day").getBoundingClientRect();
              const box = value.getBoundingClientRect();
              return (
                value.scrollWidth > value.clientWidth + 1 ||
                box.left < cell.left - 1 ||
                box.right > cell.right + 1
              );
            })
            .map((value) => value.textContent)
        );
      expect(overflowing).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth
        )
      ).toBe(false);
      await twentieth.click();
      await expect(
        page.getByText(/^Reste à vivre du jour : 611,50/)
      ).toBeVisible();
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
