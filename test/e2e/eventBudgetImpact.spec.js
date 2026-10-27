import { expect, test } from "@playwright/test";
import { prepareSimulationPage } from "./simulationFixture.mjs";

const toggle = async (form) => {
  for (let i = 0; i < 3; i++) {
    for (const name of ["Entrée", "Dépense"]) {
      // Exercise label activation, not only clicks directly on the native input.
      await form
        .locator("label")
        .filter({ hasText: new RegExp(`^${name}$`) })
        .click();
      await expect(
        form.getByRole("radio", { name, exact: true })
      ).toBeChecked();
    }
  }
};

for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"])
    test(`budget impact creates, edits and preserves drafts ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.setFixedTime(new Date("2026-10-27T10:00:00Z"));
      await prepareSimulationPage(page);
      await page.addInitScript(
        (theme) => localStorage.setItem("mhw-theme", theme),
        theme
      );
      const writes = [];
      page.on("request", (request) => {
        if (
          ["POST", "PUT"].includes(request.method()) &&
          /\/v1\/events(?:\/\d+)?$/.test(request.url())
        )
          writes.push(request.postDataJSON());
      });
      await page.goto("/calendrier");
      for (const [button, title] of [
        ["Ajouter un événement prévu", "Prévu test"],
        ["Ajouter un élément potentiel", "Potentiel test"],
      ]) {
        await page.getByRole("button", { name: button, exact: true }).click();
        const form = page.locator(".monthly-event-form");
        await form.getByLabel("Titre", { exact: true }).fill(title);
        await form.getByLabel(/^Montant/).fill("25.50");
        const date = await form.getByLabel("Date de début").inputValue();
        await toggle(form);
        await expect(form.getByLabel("Titre", { exact: true })).toHaveValue(
          title
        );
        await form
          .getByRole("button", { name: "Enregistrer", exact: true })
          .click();
        await expect(form).toHaveCount(0);
        expect(writes.at(-1)).toMatchObject({
          title,
          amount: "25.50",
          kind: "DEPENSE",
          startDate: date,
        });
      }
      await page.goto("/objectifs-evenements");
      await page
        .getByRole("button", { name: "Modifier Assurance", exact: true })
        .click();
      const form = page.locator(".monthly-event-form");
      await form
        .getByLabel("Titre", { exact: true })
        .fill("Assurance modifiée");
      await toggle(form);
      // Native keyboard radio navigation must agree with the saved value.
      await form.getByRole("radio", { name: "Dépense", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(
        form.getByRole("radio", { name: "Entrée", exact: true })
      ).toBeChecked();
      await form
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect(form).toHaveCount(0);
      expect(writes.at(-1)).toMatchObject({
        title: "Assurance modifiée",
        amount: "120.00",
        recurrence: "MENSUELLE",
        kind: "ENTREE",
      });
    });

test("editing hides the quick-add dock and cancellation restores it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date("2026-10-27T10:00:00Z"));
  await prepareSimulationPage(page);
  await page.goto("/objectifs-evenements");
  const fab = page.getByRole("button", {
    name: "Ajouter une opération ou un événement",
  });
  await expect(fab).toBeVisible();
  await page
    .getByRole("button", { name: "Ajouter un événement", exact: true })
    .click();
  const form = page.locator(".monthly-event-form");
  await form.getByLabel("Titre", { exact: true }).fill("Brouillon conservé");
  await expect(fab).toBeHidden();
  await toggle(form);
  await expect(form.getByLabel("Titre", { exact: true })).toHaveValue(
    "Brouillon conservé"
  );
  await form.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(fab).toBeVisible();
});
