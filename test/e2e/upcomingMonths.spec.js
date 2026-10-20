import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";
import { forecastFixture } from "../visual/forecastFixture.mjs";

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`upcoming months expose balances, deficits and both entry points on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
    await prepareProtectedPage(page);
    await page.goto("/home");
    await page.getByRole("link", { name: "Voir les prochains mois" }).click();
    await expect(page).toHaveTitle("Prochains mois | My Happy Wallet");
    const table = page.getByRole("table", { name: "Prévisions mensuelles" });
    await expect(table.getByRole("row")).toHaveCount(13);
    await expect(
      table.getByRole("row", { name: /décembre 2026.*Solde négatif/ })
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Reste prévisionnel de fin de mois/ })
    ).toBeVisible();
    await expect(page.locator(".budget-forecast__chart canvas")).toBeVisible();
    const scroll = page.getByRole("region", {
      name: "Tableau des prévisions, défilement horizontal",
    });
    await scroll.focus();
    await page.keyboard.press("ArrowRight");
    if (viewport.width < 1000)
      await expect
        .poll(() => scroll.evaluate((node) => node.scrollLeft))
        .toBeGreaterThan(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      )
    ).toBe(false);
    await page
      .getByRole("combobox", { name: "Horizon de prévision" })
      .selectOption("6");
    await expect(table.getByRole("row")).toHaveCount(7);
    await page.getByLabel("À partir de").fill("2026-11");
    await expect(table.getByRole("rowheader").first()).toHaveText(
      "novembre 2026"
    );
    await page
      .getByRole("main")
      .getByRole("link", { name: "Calendrier", exact: true })
      .click();
    await page
      .getByRole("link", { name: "Prochains mois", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Prochains mois", level: 1 })
    ).toBeVisible();
  });
}

test("forecast loading, retry and empty results remain explicit", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
  await prepareProtectedPage(page);
  let mode = "loading";
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(/\/v1\/budget-forecast(?:\?.*)?$/, async (route) => {
    if (mode === "loading") await held;
    if (mode === "error")
      return route.fulfill({
        status: 503,
        json: { error: "synthetic unavailable service" },
      });
    const forecast = forecastFixture(route.request().url());
    return route.fulfill({
      json: { data: mode === "empty" ? { ...forecast, months: [] } : forecast },
    });
  });
  await page.goto("/prochains-mois");
  await expect(
    page
      .locator(".budget-forecast__panel")
      .filter({ hasText: "Chargement des prévisions…" })
  ).toBeVisible();
  mode = "error";
  release();
  await expect(
    page
      .locator(".budget-forecast__panel")
      .filter({ hasText: "Les prévisions n’ont pas pu être chargées." })
  ).toBeVisible();
  mode = "success";
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(
    page.getByRole("table", { name: "Prévisions mensuelles" })
  ).toBeVisible();
  mode = "empty";
  await page
    .getByRole("combobox", { name: "Horizon de prévision" })
    .selectOption("3");
  await expect(
    page.getByText("Aucune prévision pour cette période.", { exact: true })
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});
