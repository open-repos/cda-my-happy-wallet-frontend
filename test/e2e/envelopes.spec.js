import { expect, test } from "@playwright/test";
import { prepareEnvelopePage } from "./envelopesFixture.mjs";
import { openFixedActions } from "./fixedOperationsActions.mjs";

const fits = async (page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  for (const el of await page
    .locator(
      ".envelope-section input:visible,.envelope-section select:visible,.envelope-section button:visible"
    )
    .all()) {
    const box = await el.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(
      (await page.evaluate(() => innerWidth)) + 1
    );
  }
};
for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"]) {
    test(`integrated cards, detail and annual analysis at ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const state = await prepareEnvelopePage(page);
      await page.addInitScript(
        (theme) => localStorage.setItem("mhw-theme", theme),
        theme
      );
      await page.goto("/home");
      const card = page.getByRole("article", {
        name: "Alimentation",
        exact: true,
      });
      await expect(card).toContainText("74,33 %");
      await expect(card).toContainText(/77,00/);
      await fits(page);
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/314-home-${width}-${theme}.png` });
      await page.getByRole("button", { name: "Voir les dépenses (3)" }).click();
      const detail = page.getByRole("region", {
        name: "Détail de l’enveloppe",
      });
      await expect(
        detail.getByText("Carrefour", { exact: false })
      ).toBeVisible();
      await fits(page);
      await detail
        .getByRole("button", { name: "Associer une opération existante" })
        .click();
      await detail
        .getByRole("button", { name: "Associer", exact: true })
        .click();
      await expect(detail).toContainText("111 %");
      expect(state.writes[0].body).toEqual({
        occurrenceId: 41,
        expectedOccurrenceId: null,
      });
      await detail
        .getByRole("button", { name: "Retour aux enveloppes" })
        .click();
      await expect(card).toContainText(/Dépassement de 33,00/);
      await expect(card).not.toContainText("633");
      await page.getByLabel("Afficher", { exact: true }).selectOption("year");
      await expect(card).toContainText("Somme des dépassements mensuels");
      await fits(page);
      await page.goto("/analyses");
      await expect(
        page.getByRole("heading", { name: "Tendance par catégorie" })
      ).toBeVisible();
      await expect(page.getByText(/Budget dépassé 4 mois sur 6/)).toBeVisible();
      await fits(page);
      await page.getByLabel("Moyennes sur").selectOption("12");
      await expect
        .poll(
          () =>
            state.reads.filter((r) => r.includes("envelope-analytics")).length
        )
        .toBeGreaterThan(1);
      await page
        .getByRole("heading", { name: "Tendance par catégorie" })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `/tmp/314-analysis-${width}-${theme}.png`,
      });
      await page.getByLabel("Devise des enveloppes").selectOption("USD");
      await expect(page.getByText(/Aucune enveloppe suivie/)).toBeVisible();
    });
  }
test("calendar and operations share an explicit atomic assignment, retain date and lock a double submit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  const state = await prepareEnvelopePage(page);
  await page.goto("/calendrier");
  await page
    .getByRole("button", { name: "Ajouter une opération ou un événement" })
    .click();
  await page.getByRole("button", { name: /Dépense Opération réelle/ }).click();
  await page.getByLabel("Titre", { exact: true }).fill("Dernières courses");
  await page.getByRole("textbox", { name: /Montant/ }).fill("110");
  await page.getByRole("combobox", { name: "Catégorie", exact: true }).click();
  await page.getByRole("option", { name: "Alimentation", exact: true }).click();
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue(
    "2026-10-28"
  );
  await expect(page.getByLabel("Rattacher à une enveloppe")).toHaveValue("");
  await page
    .getByRole("button", { name: "Choisir Alimentation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enregistrer", exact: true })
    .dblclick();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].body).toMatchObject({
    operationDate: "2026-10-28",
    reconciliation: { occurrenceId: 41, expectedOccurrenceId: null },
  });
  await page.goto("/operations");
  await page
    .getByRole("button", { name: "Modifier Dernières courses", exact: true })
    .click();
  await expect(page.getByLabel("Rattacher à une enveloppe")).toHaveValue("41");
  await page.getByLabel("Type", { exact: true }).selectOption("ENTREE");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(
    page.getByText(/Le rattachement est incompatible/).first()
  ).toBeVisible();
  await page.getByLabel("Rattacher à une enveloppe").selectOption("");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(2);
  expect(state.writes[1].body.reconciliation).toEqual({
    occurrenceId: null,
    expectedOccurrenceId: 41,
  });
});
test("fixed expense and income schedule next month and expose the future definitions", async ({
  page,
}) => {
  const state = await prepareEnvelopePage(page);
  await page.goto("/home/operations-fixes");
  await openFixedActions(page, "Alimentation");
  await page
    .getByRole("button", { name: "Modifier Alimentation", exact: true })
    .click();
  await expect(
    page.getByLabel("Utiliser comme enveloppe budgétaire mensuelle")
  ).toBeChecked();
  await page.getByLabel("Montant total par échéance").fill("350");
  await page
    .getByLabel("Appliquer la modification à partir de")
    .selectOption("2026-11");
  await page.getByRole("button", { name: "Enregistrer la charge" }).click();
  await expect.poll(() => state.fixedWrites.length).toBe(1);
  expect(state.fixedWrites[0]).toMatchObject({
    isBudgetEnvelope: true,
    montant: 350,
    effectiveMonth: "2026-11",
  });
  await openFixedActions(page, "Salaire");
  await page
    .getByRole("button", { name: "Modifier Salaire", exact: true })
    .click();
  await page
    .getByLabel("Appliquer la modification à partir de")
    .selectOption("2026-11");
  await page.getByRole("button", { name: "Enregistrer l’entrée" }).click();
  await expect.poll(() => state.fixedWrites.length).toBe(2);
  expect(state.fixedWrites[1]).toMatchObject({ effectiveMonth: "2026-11" });
  expect(state.fixedWrites[1]).not.toHaveProperty("isBudgetEnvelope");
  await page
    .getByText("Vérifier les charges et entrées du prochain mois", {
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Définitions applicables pour")).toHaveValue(
    "2026-11"
  );
  await expect(page.locator(".fixed-month-preview")).toContainText(/350,00/);
});
test("closed month and stale association protect data with a visible explanation", async ({
  page,
}) => {
  const state = await prepareEnvelopePage(page);
  state.setClosed(true);
  await page.goto("/home");
  await page.getByRole("button", { name: "Voir les dépenses (3)" }).click();
  await expect(
    page.getByText(/Mois clôturé : consultation seule/)
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dissocier", exact: true })
  ).toHaveCount(0);
  state.setClosed(false);
  state.setConflict(true);
  await page.reload();
  await page.getByRole("button", { name: "Voir les dépenses (3)" }).click();
  await page
    .getByRole("button", { name: "Associer une opération existante" })
    .click();
  await page.getByRole("button", { name: "Associer", exact: true }).click();
  await expect(
    page.getByText(/Le rattachement a changé entre-temps/).first()
  ).toBeVisible();
});
