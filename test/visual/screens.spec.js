import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "./fixtures.mjs";

const definitions = [
  { name: "login", path: "/login", ready: ".login_form" },
  { name: "register", path: "/register", ready: ".register_form" },
  { name: "home", path: "/home", ready: ".home-budget__amount", chart: true },
  { name: "calendar", path: "/calendrier", ready: ".budget-day" },
  {
    name: "events-goals",
    path: "/objectifs-evenements",
    ready: "text=Assurance",
  },
  { name: "operations", path: "/operations", ready: "text=Courses" },
  { name: "categories", path: "/categories", ready: ".categories-list__item" },
  {
    name: "analytics",
    path: "/analyses",
    ready: ".analytics-chart",
    chart: true,
  },
  { name: "profile", path: "/profil", ready: ".theme-selector" },
];

async function ready(page, theme, authenticated = true) {
  await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
  await page.addInitScript(
    (theme) => localStorage.setItem("mhw-theme", theme),
    theme
  );
  await prepareProtectedPage(page, { authenticated });
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
        !["/login", "/register"].includes(definition.path)
      );
      await page.goto(definition.path);
      await expect(page.locator(definition.ready).first()).toBeVisible();
      // Chart imports are asynchronous; a visible empty wrapper is not ready.
      if (definition.chart)
        await expect(page.locator("main canvas").first()).toBeVisible();
      if (definition.name === "events-goals")
        await expect(page.getByText("Vélo", { exact: true })).toBeVisible();
      await layout(page);
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
        await expect(
          page.getByRole("heading", { name: heading })
        ).toBeVisible();
        if (state === "loading")
          await expect(page.locator(".one-off-state")).toHaveAttribute(
            "aria-live",
            "polite"
          );
        if (state === "error")
          await expect(
            page.getByRole("button", { name: "Réessayer" })
          ).toBeVisible();
        await layout(page);
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
