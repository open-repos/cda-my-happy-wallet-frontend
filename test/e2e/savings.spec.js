import { expect, test } from "@playwright/test";
import { prepareSavingsPage } from "./savingsFixture.mjs";

const fits = async (page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  for (const control of await page
    .locator(
      ".savings-page button:visible,.savings-dialog input:visible,.savings-dialog button:visible"
    )
    .all()) {
    const box = await control.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(
      (await page.evaluate(() => innerWidth)) + 1
    );
  }
};
for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"]) {
    test(`Coffre parcours ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const state = await prepareSavingsPage(page);
      await page.addInitScript(
        (theme) => localStorage.setItem("mhw-theme", theme),
        theme
      );
      await page.goto("/coffre");
      await expect(
        page.getByRole("heading", { name: "Coffre", exact: true })
      ).toBeVisible();
      const card = page.getByRole("article", {
        name: "Voyage au Japon",
        exact: true,
      });
      await expect(card).toContainText("60 %");
      await fits(page);
      await card.getByRole("button", { name: "↓ Déposer" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Montant à déposer")).toBeFocused();
      await dialog.getByLabel("Montant à déposer").fill("12,34");
      await fits(page);
      await dialog
        .getByRole("button", { name: "Déposer", exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      expect(
        state.writes.filter((w) => w.path.endsWith("transfers"))
      ).toHaveLength(1);
      expect(state.writes[0].body).toEqual({
        direction: "TO_SAVINGS",
        amountMinorUnits: 1234,
        operationDate: "2026-11-08",
        reason: "MANUAL",
        idempotencyKey: expect.any(String),
      });
      await expect(card).toContainText(/2\s?442,34/);
      await expect(
        card.getByRole("button", { name: "↓ Déposer" })
      ).toBeFocused();
      await card.getByRole("button", { name: "Voir le compte →" }).click();
      await expect(
        page.getByRole("heading", { name: "Mouvements", exact: true })
      ).toBeVisible();
      await fits(page);
      await page.getByRole("button", { name: "Renommer", exact: true }).click();
      await dialog.getByLabel("Nom du compte").fill("Japon 2027");
      await dialog
        .getByRole("button", { name: "Renommer", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Japon 2027", exact: true })
      ).toBeVisible();
      await page.getByRole("button", { name: "Archiver", exact: true }).click();
      await page.keyboard.press("Escape");
      expect(state.writes.filter((w) => w.body?.archived)).toHaveLength(0);
      await page.getByRole("button", { name: "Archiver", exact: true }).click();
      await page.getByRole("button", { name: "Confirmer l’archivage" }).click();
      await expect(page.getByText(/Compte archivé :/)).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Japon 2027", exact: true })
      ).toBeFocused();
      await page.getByRole("button", { name: "← Retour au Coffre" }).click();
      await page.getByRole("button", { name: "Archivés", exact: true }).click();
      await expect(
        page.getByRole("article", { name: "Japon 2027" })
      ).toBeVisible();
    });
  }
test("lost transfer response preserves the payload and retries without duplication", async ({
  page,
}) => {
  const state = await prepareSavingsPage(page, { transferError: "lost" });
  await page.goto("/coffre");
  await page
    .getByRole("article", { name: "Voyage au Japon", exact: true })
    .getByRole("button", { name: "↓ Déposer" })
    .click();
  await page.getByLabel("Montant à déposer").fill("20");
  await page.getByRole("button", { name: "Déposer", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reprendre ce virement" })
  ).toBeVisible();
  await expect(page.getByLabel("Montant à déposer")).toBeDisabled();
  await page.getByRole("button", { name: "Vérifier les mouvements" }).click();
  await expect(
    page.getByRole("dialog").getByText("+20,00", { exact: false })
  ).toBeVisible();
  await page.getByRole("button", { name: "Reprendre ce virement" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.writes[0].body).toEqual(state.writes[1].body);
  await expect(
    page.getByRole("article", { name: "Voyage au Japon", exact: true })
  ).toContainText(/2\s?450,00/);
});
test("empty, failed load and recovery; create, link and current-account history", async ({
  page,
}) => {
  const state = await prepareSavingsPage(page, { empty: true, error: true });
  await page.goto("/coffre");
  await expect(
    page.getByRole("button", { name: "Réessayer les comptes" })
  ).toBeVisible();
  state.setError(false);
  await page.getByRole("button", { name: "Réessayer les comptes" }).click();
  await page
    .getByRole("button", { name: "Réessayer le budget et les objectifs" })
    .click();
  await page
    .getByRole("button", { name: "Créer un compte", exact: true })
    .click();
  await page.getByLabel("Nom du compte").fill("Projet maison");
  await page.getByLabel("Solde initial").fill("0");
  await page.getByRole("button", { name: "Créer le compte" }).click();
  const card = page.getByRole("article", {
    name: "Projet maison",
    exact: true,
  });
  await card.getByRole("button", { name: "Rattacher un objectif" }).click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Objectif", exact: true })
    .selectOption("4");
  await page.getByRole("button", { name: "Rattacher", exact: true }).click();
  await expect(card.getByRole("progressbar")).toBeVisible();
  await page
    .getByRole("button", { name: "Voir les mouvements", exact: true })
    .click();
  await expect(page.getByText("Courses", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mouvements", exact: true })
  ).toBeFocused();
  await expect(
    page.getByText("Virement", { exact: false }).last()
  ).toBeVisible();
  expect(state.writes.map((w) => w.method)).toEqual(["POST", "PUT"]);
});
test("server conflicts remain in the form; an acknowledged transfer with failed reads is never replayed", async ({
  page,
}) => {
  const state = await prepareSavingsPage(page, {
    transferError: "INSUFFICIENT_SAVINGS",
  });
  await page.goto("/coffre");
  await page
    .getByRole("article", { name: "Voyage au Japon", exact: true })
    .getByRole("button", { name: "↑ Retirer" })
    .click();
  await page.getByLabel("Montant à retirer").fill("30");
  await page.getByRole("button", { name: "Retirer", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText(/ne suffit pas/)
      .first()
  ).toBeVisible();
  state.setTransferError(null);
  state.setReadError(true);
  await page.getByRole("button", { name: "Retirer", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText(/modification est enregistrée/).first()
  ).toBeVisible();
  const count = state.writes.length;
  state.setReadError(false);
  await page
    .getByRole("button", { name: "Actualiser les données", exact: true })
    .click();
  await expect(
    page.getByRole("article", { name: "Voyage au Japon", exact: true })
  ).toBeVisible();
  expect(state.writes).toHaveLength(count);
});
