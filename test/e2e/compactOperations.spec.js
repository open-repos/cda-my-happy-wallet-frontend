import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";
import { prepareSimulationPage } from "./simulationFixture.mjs";

const fits = async (page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  for (const field of await page
    .locator("input:visible,select:visible")
    .all()) {
    const box = await field.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(
      await page.evaluate(() => innerWidth)
    );
  }
};
for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"]) {
    test(`compact operations, explicit inline editing and creation fit ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await prepareProtectedPage(page);
      await page.addInitScript(
        (theme) => localStorage.setItem("mhw-theme", theme),
        theme
      );
      let writes = 0;
      await page.route(/\/v1\/operations\/1$/, (route) => {
        writes++;
        return route.fulfill({
          status: 422,
          json: { message: "Validation refusée" },
        });
      });
      await page.goto("/operations");
      const edit = page.getByRole("button", {
        name: "Modifier Courses",
        exact: true,
      });
      await expect(edit).toBeVisible();
      await fits(page);
      if (width === 1440) {
        await page.mouse.move(0, 0);
        await expect(edit.locator("..")).toHaveCSS("opacity", "0");
        await edit.focus();
        await expect(edit.locator("..")).toHaveCSS("opacity", "1");
      }
      if (width < 768) {
        const box = await edit.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      await edit.click();
      const title = page.getByLabel("Titre", { exact: true });
      await expect(title).toBeFocused();
      await title.fill("Courses du quotidien avec un long libellé");
      await page.getByLabel("Date", { exact: true }).fill("2027-01-01");
      expect(writes).toBe(0);
      await fits(page);
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect(page.locator(".compact-inline-error")).toBeVisible();
      await expect(title).toHaveValue(
        "Courses du quotidien avec un long libellé"
      );
      expect(writes).toBe(1);
      await page.getByRole("button", { name: "Annuler", exact: true }).click();
      await expect(edit).toBeFocused();
      expect(writes).toBe(1);
      await page
        .getByRole("button", { name: "Ajouter une opération", exact: true })
        .click();
      await page
        .getByRole("button", { name: /^Dépense Opération réelle/ })
        .click();
      await expect(page.getByLabel("Date", { exact: true })).toBeVisible();
      await fits(page);
      await page.screenshot({
        path: test.info().outputPath("creation.png"),
        fullPage: true,
      });
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "200%")
      );
      await fits(page);
      await page.getByRole("button", { name: "Annuler", exact: true }).click();
      expect(writes).toBe(1);
    });
  }
test("calendar quick add keeps selected date and potential never writes an operation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
  await prepareSimulationPage(page);
  let operations = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && /\/operations(?:\?|$)/.test(r.url()))
      operations++;
  });
  await page.goto("/calendrier");
  await page.getByRole("button", { name: /^24 octobre 2026/ }).click();
  await page.getByRole("button", { name: /^Ajouter le 24 octobre/ }).click();
  await page
    .getByRole("button", { name: /^Événement à confirmer Simulation/ })
    .click();
  await expect(page.getByLabel("Date de début", { exact: true })).toHaveValue(
    "2026-10-24"
  );
  await page.getByLabel("Titre", { exact: true }).fill("Projet fictif");
  await page.getByLabel(/^Montant/).fill("120");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Ajouter le 24 octobre/ })
  ).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "octobre 2026", exact: true })
  ).toBeVisible();
  expect(operations).toBe(0);
});
test("a saved write followed by failed reads retries only GET", async ({
  page,
}) => {
  await prepareProtectedPage(page);
  let writes = 0,
    failed = false;
  await page.route(/\/v1\/operations(?:\?.*)?$/, (route) =>
    failed
      ? route.fulfill({ status: 503, json: { message: "Unavailable" } })
      : route.fulfill({
          json: {
            data: [
              {
                id: 1,
                title: "Courses",
                amount: "42.50",
                currency: "EUR",
                type: "DEPENSE",
                operationDate: "2026-08-18",
                categoryId: 4,
              },
            ],
            meta: { limit: 20, hasNext: false, nextCursor: null },
          },
        })
  );
  await page.route(/\/v1\/operations\/1$/, (route) => {
    writes++;
    failed = true;
    return route.fulfill({
      json: {
        data: {
          id: 1,
          title: "Courses",
          amount: "43.00",
          currency: "EUR",
          type: "DEPENSE",
          operationDate: "2026-08-18",
          categoryId: 4,
        },
      },
    });
  });
  await page.goto("/operations");
  await page
    .getByRole("button", { name: "Modifier Courses", exact: true })
    .click();
  await page.getByLabel("Montant (EUR)").fill("43");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const retry = page.getByRole("button", { name: "Réessayer l’actualisation" });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(retry).toBeVisible();
  expect(writes).toBe(1);
});
