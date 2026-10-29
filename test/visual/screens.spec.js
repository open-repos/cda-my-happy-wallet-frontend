import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "./fixtures.mjs";
import { prepareSimulationPage } from "../e2e/simulationFixture.mjs";
import { prepareFullContentCapture } from "./fullContentCapture.mjs";

const definitions = [
  { name: "login", path: "/login", ready: ".login_form" },
  { name: "register", path: "/register", ready: ".register_form" },
  { name: "home", path: "/home", ready: ".home-budget__amount", chart: true },
  { name: "calendar", path: "/calendrier", ready: ".budget-day" },
  {
    name: "simulation-calendar",
    path: "/calendrier",
    ready: ".budget-day",
    simulation: true,
  },
  {
    name: "budget-forecast",
    path: "/prochains-mois",
    ready: ".budget-forecast__table",
    chart: true,
  },
  {
    name: "events-goals",
    path: "/objectifs-evenements",
    ready: "text=Assurance",
    chart: true,
  },
  { name: "operations", path: "/operations", ready: "text=Courses" },
  { name: "categories", path: "/categories", ready: ".categories-list__item" },
  {
    name: "analytics",
    path: "/analyses",
    ready: ".analytics-chart",
    chart: true,
  },
  { name: "profile", path: "/profil", ready: ".profil-container h1" },
];

async function ready(page, theme, authenticated = true, simulation = false) {
  await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
  await page.addInitScript(
    (theme) => localStorage.setItem("mhw-theme", theme),
    theme
  );
  if (simulation) await prepareSimulationPage(page, { seedPotential: true });
  else await prepareProtectedPage(page, { authenticated });
}

/**
 * A visible canvas can still be redrawn: theme and category colours trigger a
 * second render. ECharts' "finished" event never fires here because the fixed
 * clock stops zrender's timeline, so wait until every chart canvas stays
 * identical across two reads instead.
 */
async function stableCharts(page) {
  await page.waitForLoadState("networkidle");
  const snapshot = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("main canvas")]
        .map((canvas) => canvas.toDataURL())
        .join("|")
    );
  await expect
    .poll(
      async () => {
        const before = await snapshot();
        await page.waitForTimeout(250);
        return before === (await snapshot());
      },
      { timeout: 10_000 }
    )
    .toBe(true);
}

async function layout(page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("main")).toHaveCount(1);
  const failures = await page.evaluate(() => {
    const failures = [];
    const content = document.querySelector("main");
    const root = document.documentElement;
    if (root.scrollWidth > innerWidth + 1) failures.push("document overflow");
    const controls = [
      ...content.querySelectorAll("input,select,button,a"),
    ].filter(
      (el) => el.checkVisibility() && el.getBoundingClientRect().width > 0
    );
    for (const el of controls) {
      const box = el.getBoundingClientRect();
      if (box.left < -1 || box.right > innerWidth + 1)
        failures.push(
          `outside viewport: ${
            el.getAttribute("aria-label") || el.textContent || el.tagName
          }`
        );
    }
    // Inline icons inside buttons and links are intentionally not separate boxes.
    for (let i = 0; i < controls.length; i += 1)
      for (let j = i + 1; j < controls.length; j += 1) {
        const a = controls[i],
          b = controls[j];
        if (a.contains(b) || b.contains(a)) continue;
        const x = a.getBoundingClientRect(),
          y = b.getBoundingClientRect();
        if (
          Math.min(x.right, y.right) - Math.max(x.left, y.left) > 1 &&
          Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1
        )
          failures.push(
            `overlap: ${a.textContent.trim()} / ${b.textContent.trim()}`
          );
      }
    return failures;
  });
  expect(failures).toEqual([]);
}

for (const theme of ["light", "dark"]) {
  for (const definition of definitions) {
    test(`${definition.name} (${theme})`, async ({ page }) => {
      await ready(
        page,
        theme,
        !["/login", "/register"].includes(definition.path),
        definition.simulation
      );
      await page.goto(definition.path);
      await expect(page.locator(definition.ready).first()).toBeVisible();
      if (definition.simulation) {
        await page
          .getByRole("switch", { name: "Simulation", exact: true })
          .check();
        await expect(
          page.getByRole("region", { name: "Comparaison de la Simulation" })
        ).toContainText("467,50");
        await expect(
          page
            .getByRole("article", { name: "Reste prévisionnel", exact: true })
            .locator(".budget-card__value")
        ).toContainText("467,50");
        await expect(
          page.getByRole("button", { name: "Confirmer Voyage", exact: true })
        ).toBeVisible();
        // Interacting below the fold scrolls the page. Keep fixed navigation
        // at the top of the full-page reference, as on the other screens.
        await page.evaluate(() => window.scrollTo(0, 0));
      } else if (definition.name === "calendar") {
        await expect(
          page.getByText("Votre simulation est vide.", { exact: true })
        ).toBeVisible();
      }
      if (["home", "events-goals"].includes(definition.name)) {
        await expect(
          page
            .getByRole("region", { name: "Capacité d’épargne" })
            .getByText("Indéterminé", { exact: true })
        ).toBeVisible();
      }
      // Chart imports are asynchronous; a visible empty wrapper is not ready.
      if (definition.chart) {
        await expect(page.locator("main canvas").first()).toBeVisible();
        await stableCharts(page);
      }
      if (definition.name === "events-goals") {
        await expect(
          page.getByRole("article", { name: "Vélo", exact: true })
        ).toBeVisible();
        // The taller trajectory can scroll the capacity readiness assertion.
        // Full-page references must keep the fixed navigation at the page top.
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      if (definition.name === "operations") {
        const ratio = await page
          .locator(".compact-money-table tbody th")
          .first()
          .evaluate((cell) => {
            const rgb = (value) =>
              value
                .match(/[\d.]+/g)
                .slice(0, 3)
                .map(Number);
            const light = (color) =>
              rgb(color)
                .map((n) => n / 255)
                .map((n) =>
                  n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
                )
                .reduce(
                  (sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i],
                  0
                );
            const [high, low] = [
              light(getComputedStyle(cell).color),
              light(getComputedStyle(cell.closest("table")).backgroundColor),
            ].sort((a, b) => b - a);
            return (high + 0.05) / (low + 0.05);
          });
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        if (page.viewportSize().width >= 1024) {
          const alignment = await page
            .locator(".compact-money-table")
            .evaluate((table) => {
              const headers = [...table.querySelectorAll("thead th")];
              const cells = [...table.querySelector("tbody tr").children];
              return headers.map((header, i) =>
                Math.abs(
                  header.getBoundingClientRect().left -
                    cells[i].getBoundingClientRect().left
                )
              );
            });
          for (const offset of alignment) expect(offset).toBeLessThan(2);
        }
      }
      await layout(page);
      await prepareFullContentCapture(page);
      await expect(page).toHaveScreenshot(`${definition.name}-${theme}.png`, {
        fullPage: true,
      });
    });
  }
  for (const state of ["loading", "empty", "error"]) {
    test(`operations ${state} (${theme})`, async ({ page }) => {
      await ready(page, theme);
      let release;
      const held = new Promise((resolve) => {
        release = resolve;
      });
      await page.route(/\/v1\/operations(?:\?.*)?$/, async (route) => {
        if (state === "loading") {
          await held;
          return route.abort();
        }
        return route.fulfill({
          status: state === "error" ? 503 : 200,
          contentType: "application/json",
          json:
            state === "error"
              ? { message: "Synthetic unavailable service" }
              : {
                  data: [],
                  meta: { limit: 20, hasNext: false, nextCursor: null },
                },
        });
      });
      try {
        await page.goto("/operations");
        const heading = {
          loading: "Chargement des opérations…",
          empty: "Pas encore d’opération",
          error: "La liste est momentanément indisponible",
        }[state];
        const stateHeading =
          state === "loading"
            ? page
                .locator('h2[aria-hidden="true"]')
                .filter({ hasText: heading })
            : page.getByRole("heading", { name: heading });
        await expect(stateHeading).toBeVisible();
        // Chargement annoncé par une région live toujours montée (#164).
        if (state === "loading")
          await expect(
            page.getByRole("status").filter({ hasText: heading })
          ).toHaveCount(1);
        if (state === "error")
          await expect(
            page.getByRole("button", { name: "Réessayer" })
          ).toBeVisible();
        await layout(page);
        await prepareFullContentCapture(page);
        await expect(page).toHaveScreenshot(
          `operations-${state}-${theme}.png`,
          { fullPage: true }
        );
      } finally {
        release();
        await page.unrouteAll({ behavior: "wait" });
      }
    });
  }
}
