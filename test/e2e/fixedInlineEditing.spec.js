import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";

for (const width of [390, 1440]) {
  test(`inline editing preserves the list and uses explicit saves at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await prepareProtectedPage(page);
    let charge = {
      idOperationFixe: 7,
      titre: "Assurance habitation",
      montant: "120",
      devise: "EUR",
      periodicite: "ANNUELLE",
      pourcentagePersonnel: 50,
      montantPersonnel: "60.00",
      montantMensuelPersonnel: "5.00",
    };
    const writes = [];
    await page.route(
      /\/v1\/operations-fixes\/(charges|revenus)(?:\/\d+)?(?:\?.*)?$/,
      async (route) => {
        const request = route.request();
        if (request.method() === "PUT") {
          writes.push(request.postDataJSON());
          charge = {
            ...charge,
            ...request.postDataJSON(),
            montantPersonnel: "120.00",
            montantMensuelPersonnel: "10.00",
          };
          return route.fulfill({ json: { success: true, message: "Updated" } });
        }
        return route.fulfill({
          json: {
            data: request.url().includes("revenus")
              ? [
                  {
                    idOperationFixe: 7,
                    titre: "Salaire",
                    montant: "2400",
                    devise: "EUR",
                  },
                ]
              : [charge],
            meta: { limit: 100, hasNext: false, nextCursor: null },
          },
        });
      }
    );
    await page.goto("/home/operations-fixes");
    const edit = page.getByRole("button", {
      name: "Modifier Assurance habitation",
    });
    await expect(edit).toBeVisible();
    if (width === 1440) {
      const actions = edit.locator("..");
      await page.mouse.move(0, 0);
      await expect(actions).toHaveCSS("opacity", "0");
      await edit.focus();
      await expect(actions).toHaveCSS("opacity", "1");
    } else {
      const box = await edit.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await edit.click();
    await expect(page.getByLabel("Titre de la charge")).toBeFocused();
    await expect(
      page.getByRole("heading", { name: "Modifier un élément fixe" })
    ).toHaveCount(0);
    if (width === 1440) await expect(page.getByRole("table")).toBeVisible();
    else
      await expect(
        page.getByRole("article", { name: "Salaire" })
      ).toBeVisible();
    await page.getByLabel("Montant total par échéance").fill("240");
    await expect(page.getByLabel("Aperçu mensuel personnel")).toContainText(
      "10,00"
    );
    expect(writes).toHaveLength(0);
    await expect(page.getByLabel("Trier par", { exact: true })).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      )
    ).toBe(false);
    await page.screenshot({
      path: test.info().outputPath("inline-editing.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(edit).toBeFocused();
    expect(writes).toHaveLength(0);
    await edit.click();
    await expect(page.getByLabel("Montant total par échéance")).toHaveValue(
      "120"
    );
    await page.getByLabel("Montant total par échéance").fill("240");
    await page.getByRole("button", { name: "Enregistrer la charge" }).click();
    await expect(edit).toBeFocused();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      montant: 240,
      pourcentagePersonnel: 50,
      periodicite: "ANNUELLE",
    });
  });
}
