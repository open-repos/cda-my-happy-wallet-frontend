import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "./fixtures.mjs";
import fixtures from "../fixtures/savingsTrajectories.json";
import { prepareFullContentCapture } from "./fullContentCapture.mjs";
for (const theme of ["light", "dark"])
  test(`savings comparison (${theme})`, async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-25T10:00:00Z"));
    await prepareProtectedPage(page);
    for (const [path, values] of [
      ["savings-capacity", fixtures.capacity],
      ["budget-forecast", fixtures.budgetForecast],
    ]) {
      await page.route(new RegExp("/v1/" + path + "(?:\\?.*)?$"), (route) =>
        route.fulfill({
          json: values[
            new URL(route.request().url()).searchParams.get("scenario") ||
              "standard"
          ],
        })
      );
    }
    await page.route(/\/v1\/events(?:\?.*)?$/, (route) =>
      route.fulfill({
        json: {
          data: [
            new URL(route.request().url()).searchParams.get("status") ===
            "POTENTIEL"
              ? {
                  id: 9,
                  title: "Option pour novembre",
                  amount: "200.00",
                  currency: "EUR",
                  kind: "DEPENSE",
                  startDate: "2026-11-01",
                  recurrence: "AUCUNE",
                  endDate: null,
                  status: "POTENTIEL",
                }
              : {
                  id: 8,
                  title: "Transport prévu ce mois-ci",
                  amount: "80.00",
                  currency: "EUR",
                  kind: "DEPENSE",
                  startDate: "2026-10-31",
                  recurrence: "AUCUNE",
                  endDate: null,
                  status: "CONFIRME",
                },
          ],
          meta: { limit: 100, hasNext: false, nextCursor: null },
        },
      })
    );

    await page.addInitScript(
      (value) => localStorage.setItem("mhw-theme", value),
      theme
    );
    await page.route(/\/v1\/goals(?:\?.*)?$/, (route) =>
      route.fulfill({
        json: {
          data: fixtures.goals,
          meta: { limit: 100, hasNext: false, nextCursor: null },
        },
      })
    );
    await page.route("**/v1/savings-capacity/trajectories", (route) => {
      const request = route.request().postDataJSON();
      return route.fulfill({
        json: {
          data: fixtures.cases[
            `standard-24-1-${
              request.futureAdditionalVariableExpense === "700.00"
            }`
          ],
        },
      });
    });
    await page.goto("/objectifs-evenements");
    await page.getByRole("button", { name: "Simuler avec mon budget" }).click();
    const region = page.getByRole("region", {
      name: "Comparaison des trajectoires d’épargne",
    });
    await region
      .getByLabel(/Complément variable restant ce mois-ci/)
      .fill("100");
    await region.getByLabel(/Complément variable par mois futur/).fill("700");
    await region.getByLabel(/Marge de sécurité mensuelle/).fill("100");
    await region
      .getByRole("button", { name: "Appliquer les hypothèses" })
      .click();
    await expect(
      region.getByRole("article", {
        name: "Estimation raisonnable",
        exact: true,
      })
    ).toContainText("mai 2027");
    await expect(region.locator("canvas")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const canvas = () =>
      page.evaluate(() =>
        [...document.querySelectorAll("main canvas")]
          .map((c) => c.toDataURL())
          .join("|")
      );
    await expect
      .poll(async () => {
        const previous = await canvas();
        await page.waitForTimeout(250);
        return previous === (await canvas());
      })
      .toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      )
    ).toBe(true);
    // Retain the full-page candidate for review even when its first reference is absent.
    await prepareFullContentCapture(page);
    await page.screenshot({
      path: test.info().outputPath(`savings-comparison-${theme}-candidate.png`),
      fullPage: true,
    });
    await expect(page).toHaveScreenshot(`savings-comparison-${theme}.png`, {
      fullPage: true,
    });
  });
