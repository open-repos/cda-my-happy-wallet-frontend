import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, Page, test } from "@playwright/test";

// Comparaison des trajectoires sous hypothèses (#285) : réponses générées par
// le backend réel (#132), partagées avec le Web #284.
const fixtures = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../test/fixtures/savingsTrajectories.json"),
    "utf8",
  ),
);
const TITLE = fixtures.goals[0].title as string;

interface Options {
  savedAmount?: string;
  failFirst?: boolean;
}

const mockGoals = async (page: Page, options: Options = {}) => {
  const bodies: Record<string, unknown>[] = [];
  let failures = options.failFirst ? 1 : 0;
  const goals = fixtures.goals.map((goal: Record<string, unknown>) =>
    goal.id === 1 && options.savedAmount
      ? { ...goal, savedAmount: options.savedAmount }
      : goal,
  );
  await page.route(/\/v1\/goals(\?.*)?$/, (route) =>
    route.request().method() === "GET"
      ? route.fulfill({
          json: {
            data: goals,
            meta: { limit: 100, hasNext: false, nextCursor: null },
          },
        })
      : route.fallback(),
  );
  await page.route("**/v1/savings-capacity/trajectories", (route) => {
    const body = route.request().postDataJSON();
    bodies.push(body);
    if (failures > 0) {
      failures -= 1;
      return route.fulfill({ status: 503, json: {} });
    }
    const assumed = body.monthlySafetyMargin !== "0.00";
    const key = `${body.scenario}-${body.months}-${body.selectedGoalId}-${assumed}`;
    return route.fulfill({ json: { data: fixtures.cases[key] } });
  });
  return bodies;
};

const openSimulation = async (page: Page) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("happy@example.test");
  await page
    .getByRole("textbox", { exact: true, name: "Mot de passe" })
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.getByRole("tab", { name: "Objectifs et événements" }).click();
  const open = page.getByRole("button", {
    name: `Simuler avec mon budget : ${TITLE}`,
  });
  const box = await open.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);
  await open.click();
  await expect(
    page.getByRole("heading", { name: "Simuler avec mon budget" }),
  ).toBeVisible();
};

const fill = async (page: Page, values: [string, string][]) => {
  for (const [label, value] of values) {
    await page.getByLabel(new RegExp(`^${label}`)).fill(value);
  }
};

const ASSUMPTIONS: [string, string][] = [
  ["Complément variable restant ce mois-ci", "100"],
  ["Complément variable par mois futur", "700,00"],
  ["Marge de sécurité mensuelle", "100"],
];

test("compares the three server trajectories under applied assumptions", async ({
  page,
}) => {
  const bodies = await mockGoals(page);
  await openSimulation(page);
  await expect(
    page.getByText("Comparaison des trois trajectoires de"),
  ).toBeVisible();
  expect(bodies[0]).toEqual({
    currency: "EUR",
    scenario: "standard",
    months: 24,
    selectedGoalId: 1,
    currentRemainingVariableExpense: "0.00",
    futureAdditionalVariableExpense: "0.00",
    monthlySafetyMargin: "0.00",
  });

  await fill(page, ASSUMPTIONS);
  await expect(page.getByText(/^Modifications non appliquées/)).toBeVisible();
  await page.getByRole("button", { name: "Appliquer les hypothèses" }).click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1]).toMatchObject({
    currentRemainingVariableExpense: "100.00",
    futureAdditionalVariableExpense: "700.00",
    monthlySafetyMargin: "100.00",
  });
  // Dates du serveur : raisonnable, maximum et rythme prévu.
  await expect(page.getByText("mai 2027", { exact: true })).toBeVisible();
  await expect(page.getByText("janvier 2027", { exact: true })).toBeVisible();
  // Carte (date serveur au rythme prévu) et comparaison.
  await expect(page.getByText("octobre 2027", { exact: true })).toHaveCount(2);
  await expect(page.getByText(/^Hypothèses réversibles/)).toBeVisible();
  // Capture cadrée sur la légende et le graphique des trois courbes.
  await page.getByText(/^● Départ/).scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot("goal-scenarios.png");

  // Tableau lisible sans graphique : 24 mois, mois courant déclaré.
  await page
    .getByRole("button", { name: "Lire les trois trajectoires en tableau" })
    .click();
  await expect(page.getByText(/ · déclaré$/)).toHaveCount(1);
  await expect(page.getByText(/ · projeté$/)).toHaveCount(23);

  // Une courbe masquée reste lisible dans le tableau.
  await page.getByRole("checkbox", { name: /^Maximum théorique/ }).click();
  await expect(
    page.getByRole("checkbox", { name: /^Maximum théorique/ }),
  ).toHaveAttribute("aria-checked", "false");

  await page
    .getByRole("button", { name: "Réinitialiser les hypothèses" })
    .click();
  await expect.poll(() => bodies.length).toBe(3);
  expect(bodies[2]).toMatchObject({ monthlySafetyMargin: "0.00" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});

test("refuses invalid assumptions without calling the server", async ({
  page,
}) => {
  const bodies = await mockGoals(page);
  await openSimulation(page);
  await expect.poll(() => bodies.length).toBe(1);
  await fill(page, [["Marge de sécurité mensuelle", "-5"]]);
  await page.getByRole("button", { name: "Appliquer les hypothèses" }).click();
  await expect(
    page.getByText(/^Saisissez des montants positifs ou nuls/),
  ).toBeVisible();
  expect(bodies).toHaveLength(1);
});

test("asks for 12 months and retries after a failure", async ({ page }) => {
  const bodies = await mockGoals(page, { failFirst: true });
  await openSimulation(page);
  await page.getByRole("button", { name: "Réessayer la comparaison" }).click();
  // Carte (date serveur au rythme prévu) et comparaison.
  await expect(page.getByText("octobre 2027", { exact: true })).toHaveCount(2);
  await page.getByRole("radio", { name: /^12 mois/ }).click();
  await expect.poll(() => bodies.at(-1)?.months).toBe(12);
  await expect(
    page.getByText("Non atteint dans cet horizon").first(),
  ).toBeVisible();
});

test("never mixes a goal changed concurrently with the gauge", async ({
  page,
}) => {
  await mockGoals(page, { savedAmount: "2000.00" });
  await openSimulation(page);
  await expect(
    page.getByRole("button", { name: "Actualiser les objectifs" }),
  ).toBeVisible();
});
