import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";
for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`fixed charges save, reload and edit at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page);
    let rows = [];
    await page.route(
      /\/v1\/operations-fixes\/charges(?:\/\d+)?(?:\?.*)?$/,
      async (route) => {
        const method = route.request().method();
        if (method === "POST" || method === "PUT") {
          const body = route.request().postDataJSON();
          rows = [
            {
              ...body,
              idOperationFixe: 7,
              montantPersonnel: "60.00",
              montantMensuelPersonnel: "5.00",
            },
          ];
          return route.fulfill({
            status: method === "POST" ? 201 : 200,
            json:
              method === "POST"
                ? { success: true, data: rows[0] }
                : { success: true, message: "ok" },
          });
        }
        if (method === "DELETE") rows = [];
        return route.fulfill({
          json: {
            success: true,
            data: rows,
            meta: { hasNext: false, nextCursor: null, limit: 100 },
          },
        });
      }
    );
    await page.goto("/home/operations-fixes");
    await page.getByRole("button", { name: "Ajouter une charge" }).click();
    await expect(page.getByLabel("Titre de la charge")).toBeFocused();
    await page.getByLabel("Titre de la charge").fill("Abonnement annuel");
    await page.getByLabel("Montant total par échéance").fill("120");
    await page.getByLabel("Périodicité").selectOption("ANNUELLE");
    await page.getByLabel("Ma part de la charge (%)").fill("50");
    await expect(
      page.getByRole("region", { name: "Aperçu de la charge" })
    ).toContainText(/60,00.*5,00/s);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      )
    ).toBe(false);
    await page.getByRole("button", { name: "Enregistrer la charge" }).click();
    await expect(
      page.getByRole("article", { name: "Abonnement annuel" })
    ).toContainText(/5,00/);
    await page.reload();
    await page
      .getByRole("button", { name: "Modifier Abonnement annuel" })
      .click();
    await expect(page.getByLabel("Périodicité")).toHaveValue("ANNUELLE");
    await expect(page.getByLabel("Ma part de la charge (%)")).toHaveValue("50");
    await page.getByLabel("Ma part de la charge (%)").fill("101");
    await page.getByRole("button", { name: "Enregistrer la charge" }).click();
    await expect(page.getByLabel("Ma part de la charge (%)")).toBeFocused();
    await expect(page.getByLabel("Ma part de la charge (%)")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Ajouter une charge" })
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Supprimer Abonnement annuel" })
      .click();
    await page
      .getByRole("button", { name: "Confirmer la suppression" })
      .click();
    await expect(
      page.getByText("Aucune charge fixe enregistrée.")
    ).toBeVisible();
  });
}
