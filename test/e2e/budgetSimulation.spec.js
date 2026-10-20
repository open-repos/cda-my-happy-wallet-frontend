import { expect, test } from "@playwright/test";
import { prepareSimulationPage } from "./simulationFixture.mjs";

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`potentials stay separate and can be managed across planning views on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
    await prepareSimulationPage(page);
    await page.goto("/calendrier");
    const real = page
      .getByRole("article", { name: "Reste réel", exact: true })
      .locator(".budget-card__value");
    const projected = page
      .getByRole("article", { name: "Reste prévisionnel", exact: true })
      .locator(".budget-card__value");
    await expect(projected).toHaveText(/767,50\s*€/);
    await page.getByRole("button", { name: /^24 octobre 2026/ }).click();
    await page
      .getByRole("button", {
        name: "Ajouter un élément potentiel",
        exact: true,
      })
      .click();
    await expect(page.getByLabel("Date de début", { exact: true })).toHaveValue(
      "2026-10-24"
    );
    await page.getByLabel("Titre", { exact: true }).fill("Voyage");
    await page.getByLabel(/^Montant/).fill("300.00");
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    const panel = page.getByRole("region", { name: "Simulation", exact: true });
    await expect(panel.getByText("Potentiel", { exact: true })).toBeVisible();
    await expect(panel.getByText(/1 novembre 2026/)).toBeVisible();
    await expect(projected).toHaveText(/767,50\s*€/);
    await expect(real).toHaveText(/1\s*037,50\s*€/);
    await panel.getByRole("switch", { name: "Simulation" }).check();
    await expect(projected).toHaveText(/467,50\s*€/);
    await expect(
      page.getByRole("button", {
        name: /^24 octobre 2026.*1 élément potentiel/,
      })
    ).toBeVisible();
    await expect(
      panel.getByRole("region", { name: "Comparaison de la Simulation" })
    ).toContainText(/467,50/);
    await panel
      .getByRole("button", { name: "Modifier Voyage", exact: true })
      .click();
    await page.getByLabel(/^Montant/).fill("2000.00");
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(projected).toHaveText(/-1\s*232,50\s*€/);
    await page
      .getByRole("main")
      .getByRole("link", { name: "Prochains mois", exact: true })
      .click();
    await expect(
      page.getByRole("switch", { name: "Simulation" })
    ).toBeChecked();
    await expect(
      page
        .getByRole("table", { name: "Prévisions mensuelles" })
        .getByRole("row", { name: /octobre 2026.*Solde négatif/ })
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Confirmer Voyage", exact: true })
      .click();
    await expect(
      page.getByRole("group", {
        name: "Confirmer Voyage comme événement prévu ?",
      })
    ).toBeVisible();
    await page.getByRole("button", { name: "Annuler la confirmation" }).click();
    await expect(
      page.getByRole("button", { name: "Confirmer Voyage", exact: true })
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Confirmer Voyage", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Oui, confirmer", exact: true })
      .click();
    await expect(
      page.getByText("Votre simulation est vide.", { exact: true })
    ).toBeVisible();
    await page.getByRole("switch", { name: "Simulation" }).uncheck();
    await expect(
      page
        .getByRole("table", { name: "Prévisions mensuelles" })
        .getByRole("row", { name: /octobre 2026.*Solde négatif/ })
    ).toBeVisible();
    for (const title of ["Matériel", "Anniversaire"]) {
      await page
        .getByLabel("Date pour les ajouts", { exact: true })
        .fill("2026-10-26");
      await page
        .getByRole("button", {
          name: "Ajouter un élément potentiel",
          exact: true,
        })
        .click();
      await expect(
        page.getByLabel("Date de début", { exact: true })
      ).toHaveValue("2026-10-26");
      await page.getByLabel("Titre", { exact: true }).fill(title);
      await page.getByLabel(/^Montant/).fill("50.00");
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: `Supprimer ${title}`, exact: true })
      ).toBeVisible();
    }
    await page
      .getByRole("button", { name: "Supprimer Matériel", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Oui, supprimer", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Supprimer Matériel", exact: true })
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Vider la simulation", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Oui, vider la simulation", exact: true })
      .click();
    await expect(
      page.getByText("Votre simulation est vide.", { exact: true })
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      )
    ).toBe(false);
  });
}

test("simulation affects savings capacity while the real monthly balance stays unchanged", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
  await prepareSimulationPage(page, { seedPotential: true });
  await page.goto("/home");
  const capacity = page.getByRole("region", {
    name: "Capacité d’épargne",
    exact: true,
  });
  const money = (label) =>
    capacity.getByText(label, { exact: true }).locator("..");
  await expect(money("Disponible par mois après objectifs")).toContainText(
    "767,50"
  );
  await page.getByRole("switch", { name: "Simulation" }).check();
  await expect(money("Disponible par mois après objectifs")).toContainText(
    "467,50"
  );
  await expect(page.locator(".home-budget__amount")).toHaveText(
    /1\s*037,50\s*€/
  );
  await page.getByRole("switch", { name: "Simulation" }).uncheck();
  await expect(money("Disponible par mois après objectifs")).toContainText(
    "767,50"
  );
});
