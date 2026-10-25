import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";
import fixtures from "../fixtures/savingsTrajectories.json";
async function setup(page, theme = "light") {
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
  const calls = [];
  await page.route("**/v1/savings-capacity/trajectories", async (route) => {
    const body = route.request().postDataJSON();
    calls.push(body);
    if (process.env.SAVINGS_REAL_API) {
      const result = await route.fetch({
        url: `${process.env.SAVINGS_REAL_API}/v1/savings-capacity/trajectories`,
      });
      return route.fulfill({ response: result });
    }
    const adjusted = body.futureAdditionalVariableExpense === "700.00";
    const data =
      fixtures.cases[
        `${body.scenario}-${body.months}-${body.selectedGoalId}-${adjusted}`
      ];
    if (!data) throw Error("Missing actual-backend fixture");
    return route.fulfill({ json: { data } });
  });
  await page.goto("/objectifs-evenements");
  await page.getByRole("button", { name: "Simuler avec mon budget" }).click();
  const region = page.getByRole("region", {
    name: "Comparaison des trajectoires d’épargne",
  });
  await expect(
    region.getByRole("article", { name: "Maximum théorique", exact: true })
  ).toBeVisible();
  return { region, calls };
}
async function apply(region) {
  await region.getByLabel(/Complément variable restant ce mois-ci/).fill("100");
  await region.getByLabel(/Complément variable par mois futur/).fill("700");
  await region.getByLabel(/Marge de sécurité mensuelle/).fill("100");
  await region
    .getByRole("button", { name: "Appliquer les hypothèses" })
    .click();
  await expect(
    region.getByRole("article", { name: "Estimation raisonnable", exact: true })
  ).toContainText("mai 2027");
}
for (const theme of ["light", "dark"])
  for (const width of [320, 390, 768, 1440])
    test(`budget comparison at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const { region, calls } = await setup(page, theme);
      const writes = [];
      page.on("request", (request) => {
        if (
          ["POST", "PUT", "DELETE", "PATCH"].includes(request.method()) &&
          !request.url().endsWith("/savings-capacity/trajectories")
        )
          writes.push(request.url());
      });
      await apply(region);
      await expect(
        region.getByRole("article", { name: "Rythme prévu", exact: true })
      ).toContainText("octobre 2027");
      await expect(
        region.getByRole("article", { name: "Maximum théorique", exact: true })
      ).toContainText("janvier 2027");
      await expect(
        region.getByRole("article", {
          name: "Estimation raisonnable",
          exact: true,
        })
      ).toContainText(/650,00\s*€/);
      for (const size of ["100%", "200%"]) {
        await page
          .locator("html")
          .evaluate((element, size) => (element.style.fontSize = size), size);
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1
            )
          )
          .toBe(true);
        await expect(
          region.getByRole("button", { name: "Appliquer les hypothèses" })
        ).toBeVisible();
      }
      const textIssues = await region.evaluate((root) => {
        const luminance = (color) =>
          color
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number)
            .map((n) => {
              n /= 255;
              return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            })
            .reduce(
              (sum, n, index) => sum + n * [0.2126, 0.7152, 0.0722][index],
              0
            );
        return [...root.querySelectorAll("h4,h5,p,dt,dd,label,legend,strong")]
          .filter((el) => el.checkVisibility())
          .flatMap((el) => {
            let node = el,
              background = "rgb(255,255,255)";
            while (node) {
              const value = getComputedStyle(node).backgroundColor;
              if (value !== "transparent" && !value.endsWith(", 0)")) {
                background = value;
                break;
              }
              node = node.parentElement;
            }
            const style = getComputedStyle(el),
              values = [luminance(style.color), luminance(background)].sort(
                (a, b) => b - a
              );
            const range = document.createRange();
            range.selectNodeContents(el);
            const overflow = [...range.getClientRects()].some(
              (box) => box.left < -1 || box.right > innerWidth + 1
            );
            return (values[0] + 0.05) / (values[1] + 0.05) <
              (parseFloat(style.fontSize) >= 24 ? 3 : 4.5) || overflow
              ? [
                  el.tagName +
                    "." +
                    el.className +
                    ": " +
                    el.textContent.trim() +
                    " overflow=" +
                    overflow +
                    " color=" +
                    style.color,
                ]
              : [];
          });
      });
      expect(textIssues).toEqual([]);
      await region
        .getByText("Lire les trois trajectoires en tableau", { exact: true })
        .click();
      await expect(region.getByRole("table")).toContainText(/1.800,00\s*€/);
      await region
        .getByText("Comprendre le mois courant et l’allocation", {
          exact: true,
        })
        .click();
      await expect(region).toContainText(/500,00\s*€/);
      await expect(region).toContainText(fixtures.goals[1].title);
      expect(calls.at(-1)).toMatchObject({
        currency: "EUR",
        scenario: "standard",
        currentRemainingVariableExpense: "100.00",
        futureAdditionalVariableExpense: "700.00",
        monthlySafetyMargin: "100.00",
      });
      expect(writes).toEqual([]);
      await page
        .locator("html")
        .evaluate((element) => (element.style.fontSize = "100%"));
      await region
        .getByText("Lire les trois trajectoires en tableau", { exact: true })
        .click();
      await region
        .getByText("Comprendre le mois courant et l’allocation", {
          exact: true,
        })
        .click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: test.info().outputPath(`comparison-${width}-${theme}.png`),
        fullPage: true,
      });
    });
test("hypotheses apply explicitly, retry, reset, scenario and horizon stay independent", async ({
  page,
}) => {
  const { region, calls } = await setup(page);
  const before = calls.length;
  await region.getByLabel(/Marge de sécurité mensuelle/).fill("100");
  await expect(region).toContainText("Modifications non appliquées");
  expect(calls).toHaveLength(before);
  await apply(region);
  await page.getByRole("switch", { name: "Simulation", exact: true }).check();
  await expect.poll(() => calls.at(-1)?.scenario).toBe("simulation");
  await expect(
    region.getByRole("article", { name: "Estimation raisonnable", exact: true })
  ).toContainText(/450,00\s*€/);
  await page.getByRole("switch", { name: "Simulation", exact: true }).uncheck();
  await region.getByLabel("Période, mois courant inclus").selectOption("12");
  await expect(
    region.getByRole("article", { name: "Rythme prévu", exact: true })
  ).toContainText("Non atteint dans cet horizon");
  await region
    .getByRole("button", { name: "Réinitialiser les hypothèses" })
    .click();
  await expect.poll(() => calls.at(-1)?.monthlySafetyMargin).toBe("0.00");
  await expect(region.getByLabel(/Marge de sécurité mensuelle/)).toHaveValue(
    "0.00"
  );
});
test("comparison errors can be retried without losing assumptions", async ({
  page,
}) => {
  const { region } = await setup(page);
  const unavailable = (route) =>
    route.fulfill({ status: 503, json: { message: "unavailable" } });
  await page.route("**/v1/savings-capacity/trajectories", unavailable);
  await region.getByLabel(/Complément variable restant ce mois-ci/).fill("100");
  await region.getByLabel(/Complément variable par mois futur/).fill("700");
  await region.getByLabel(/Marge de sécurité mensuelle/).fill("100");
  await region
    .getByRole("button", { name: "Appliquer les hypothèses" })
    .click();
  await expect(
    region.getByRole("alert").filter({ hasText: "momentanément indisponible" })
  ).toContainText("momentanément indisponible");
  await expect(region.getByLabel(/Marge de sécurité mensuelle/)).toHaveValue(
    "100"
  );
  await page.unroute("**/v1/savings-capacity/trajectories", unavailable);
  await region
    .getByRole("button", { name: "Réessayer la comparaison" })
    .click();
  await expect(
    region.getByRole("article", { name: "Estimation raisonnable", exact: true })
  ).toContainText("mai 2027");
});
