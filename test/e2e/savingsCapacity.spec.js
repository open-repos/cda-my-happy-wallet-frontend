import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";

for (const theme of ["light", "dark"]) {
  for (const width of [320, 375, 390, 768, 1440]) {
    test(`savings capacity reflows at ${width}px in ${theme} with the menu closed`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
      await prepareProtectedPage(page);
      await page.addInitScript(
        (value) => localStorage.setItem("mhw-theme", value),
        theme
      );
      for (const path of ["/home", "/objectifs-evenements"]) {
        await page.goto(path);
        const capacity = page.getByRole("region", {
          name: "Capacité d’épargne",
          exact: true,
        });
        await expect(
          capacity.getByText("Indéterminé", { exact: true })
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Ouvrir le menu" })
        ).toHaveAttribute("aria-expanded", "false");
        for (const zoom of ["100%", "200%"]) {
          await page.locator("html").evaluate((element, value) => {
            element.style.fontSize = value;
          }, zoom);
          await expect
            .poll(
              () =>
                page.evaluate(() => ({
                  viewport: innerWidth,
                  document: document.documentElement.scrollWidth,
                })),
              { message: `${path}, ${width}px, ${zoom}: document width` }
            )
            .toEqual({ viewport: width, document: width });
          // Text ranges catch clipping as well as overflowing element boxes.
          const issues = await capacity.evaluate((section) => {
            const failures = [];
            for (const element of section.querySelectorAll(
              "dt, dd, h2, h3, p, a, button"
            )) {
              const bounds = element.getBoundingClientRect();
              const range = document.createRange();
              range.selectNodeContents(element);
              const rects = [...range.getClientRects()];
              if (
                bounds.left < 0 ||
                bounds.right > innerWidth + 1 ||
                rects.some(
                  (rect) =>
                    rect.left < bounds.left - 1 ||
                    rect.right > bounds.right + 1 ||
                    rect.top < bounds.top - 1 ||
                    rect.bottom > bounds.bottom + 1
                )
              )
                failures.push(element.tagName + "." + element.className);
            }
            return failures;
          });
          expect(
            issues,
            `${path}, ${width}px, ${zoom}: readable contents`
          ).toEqual([]);
          const action = capacity.getByRole(
            path === "/home" ? "link" : "button",
            { name: "Ajuster le versement pour Vélo" }
          );
          await action.scrollIntoViewIfNeeded();
          await action.focus();
          await expect(action).toBeFocused();
          await expect(action).toBeInViewport();
        }
      }
    });
  }
}

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`savings effort can be adjusted from home on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
    await prepareProtectedPage(page);
    await page.goto("/home");
    const capacity = page.getByRole("region", { name: "Capacité d’épargne" });
    await expect(
      capacity.getByText("Indéterminé", { exact: true })
    ).toBeVisible();
    await expect(
      capacity.getByText("Versements prévus par mois").locator("..")
    ).toHaveText(/150,00\s*€/);
    await expect(
      capacity.getByText("Disponible par jour après objectifs").locator("..")
    ).toHaveText(/54,82\s*€/);
    await capacity
      .getByRole("link", { name: "Ajuster le versement pour Vélo" })
      .click();
    await expect(page.getByLabel("Titre", { exact: true })).toHaveValue("Vélo");
    await expect(page.getByLabel("Titre", { exact: true })).toBeFocused();
    await page.getByLabel(/^Versement mensuel prévu/).fill("180");
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Modifier l’objectif", exact: true })
    ).toHaveCount(0);
    await expect(
      capacity.getByText("Versements prévus par mois").locator("..")
    ).toHaveText(/180,00\s*€/);
    await expect(
      capacity.getByText("Disponible par mois après objectifs").locator("..")
    ).toHaveText(/737,50\s*€/);
    await capacity
      .getByRole("button", { name: "Ajuster le versement pour Vélo" })
      .click();
    await page.keyboard.press("Escape");
    await expect(
      capacity.getByRole("button", { name: "Ajuster le versement pour Vélo" })
    ).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      )
    ).toBe(false);
  });
}

test("capacity refuses unavailable data and recovers without losing the goal list", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
  await prepareProtectedPage(page);
  let unavailable = true;
  await page.route(/\/v1\/savings-capacity(?:\?.*)?$/, (route) =>
    unavailable
      ? route.fulfill({ status: 503, json: { error: "synthetic" } })
      : route.fallback()
  );
  await page.goto("/objectifs-evenements");
  await expect(
    page.getByRole("article", { name: "Vélo", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Réessayer la capacité d’épargne" })
  ).toBeVisible();
  unavailable = false;
  await page
    .getByRole("button", { name: "Réessayer la capacité d’épargne" })
    .click();
  await expect(page.getByText("Indéterminé", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Vélo", exact: true })
  ).toBeVisible();
});
