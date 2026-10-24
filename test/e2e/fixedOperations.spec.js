import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";
import {
  fixedOperationItem,
  openFixedActions,
} from "./fixedOperationsActions.mjs";

const assertFits = async (page) => {
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    wide: [...document.querySelectorAll("body *")]
      .filter(
        (node) =>
          node.checkVisibility() &&
          node.getBoundingClientRect().right > innerWidth + 1
      )
      .map((node) => ({
        tag: node.tagName,
        class: node.className,
        text: node.textContent.slice(0, 35),
        width: node.getBoundingClientRect().width,
      }))
      .slice(0, 10),
    internal: [...document.querySelectorAll("body *")]
      .filter(
        (node) =>
          node.checkVisibility() && node.scrollWidth > node.clientWidth + 1
      )
      .map((node) => ({
        tag: node.tagName,
        class: node.className,
        text: node.textContent.slice(0, 25),
        width: node.clientWidth,
        scroll: node.scrollWidth,
      }))
      .slice(0, 20),
  }));
  expect(overflow.documentWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(
    overflow.width
  );
  const failures = await page.locator(".fixed-operations").evaluate((root) => {
    const bounds = root.getBoundingClientRect();
    return [...root.querySelectorAll("input, select, button, h2, h3, dd, dt")]
      .filter((node) => node.checkVisibility())
      .filter((node) => {
        const box = node.getBoundingClientRect();
        return box.left < bounds.left - 1 || box.right > bounds.right + 1;
      })
      .map((node) => node.textContent.slice(0, 50));
  });
  expect(failures).toEqual([]);
};
for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"]) {
    test(`fixed overview and income flow at ${width}px in ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await prepareProtectedPage(page);
      await page.addInitScript(
        (value) => localStorage.setItem("mhw-theme", value),
        theme
      );
      const charges = [
        {
          idOperationFixe: 7,
          titre: "Assurance annuelle partagée avec un nom long",
          montant: "120",
          devise: "EUR",
          periodicite: "ANNUELLE",
          pourcentagePersonnel: 50,
          montantPersonnel: "60.00",
          montantMensuelPersonnel: "5.01",
        },
      ];
      let incomes = [
        {
          idOperationFixe: 7,
          titre: "Salaire",
          montant: "2000",
          devise: "EUR",
        },
      ];
      const writes = [];
      await page.route(
        /\/v1\/operations-fixes\/(charges|revenus)(?:\/\d+)?(?:\?.*)?$/,
        async (route) => {
          const request = route.request();
          const income = request.url().includes("/revenus");
          const method = request.method();
          if (method !== "GET") {
            const body = method === "DELETE" ? null : request.postDataJSON();
            writes.push({ method, income, body });
            if (!income)
              return route.fulfill({ status: 500, json: { success: false } });
            if (method === "POST")
              incomes.push({ ...body, idOperationFixe: 8 });
            if (method === "PUT")
              incomes = incomes.map((row) =>
                row.idOperationFixe === 8
                  ? { ...body, idOperationFixe: 8 }
                  : row
              );
            if (method === "DELETE")
              incomes = incomes.filter((row) => row.idOperationFixe !== 8);
            return route.fulfill({
              status: method === "POST" ? 201 : 200,
              json: {
                success: true,
                data: method === "POST" ? incomes.at(-1) : undefined,
              },
            });
          }
          return route.fulfill({
            json: {
              success: true,
              data: income ? incomes : charges,
              meta: { hasNext: false, nextCursor: null, limit: 100 },
            },
          });
        }
      );
      await page.goto("/home/operations-fixes");
      await expect(fixedOperationItem(page, "Salaire")).toBeVisible();
      await expect(fixedOperationItem(page, charges[0].titre)).toContainText(
        /5,01/
      );
      if (width < 1024) {
        await expect(
          page.getByRole("table", { name: "Charges et entrées fixes" })
        ).toHaveCount(0);
        await expect(page.getByRole("article")).toHaveCount(2);
      } else
        await expect(
          page.getByRole("table", { name: "Charges et entrées fixes" })
        ).toBeVisible();
      await page
        .getByLabel("Trier par", { exact: true })
        .selectOption("pourcentagePersonnel");
      await page.getByLabel("Ordre du tri").selectOption("asc");
      if (width < 1024)
        await expect(page.getByRole("article").first()).toHaveAttribute(
          "aria-label",
          charges[0].titre
        );
      else
        await expect(
          page.getByRole("table").getByRole("row").nth(1)
        ).toContainText(charges[0].titre);
      await assertFits(page);
      if (theme === "light" && [390, 1440].includes(width))
        await page.screenshot({
          path: test.info().outputPath("fixed-overview.png"),
          fullPage: true,
        });
      await page.locator("html").evaluate((node) => {
        node.style.fontSize = "200%";
      });
      await assertFits(page);
      await page.getByRole("button", { name: "Ajouter", exact: true }).click();
      await expect(page.getByLabel("Titre de la charge")).toBeFocused();
      expect(
        await page
          .getByLabel("Titre de la charge")
          .evaluate((node) => parseFloat(getComputedStyle(node).fontSize))
      ).toBeGreaterThanOrEqual(31.9);
      await page.getByLabel("Titre de la charge").fill("Loyer");
      await page.getByLabel("Montant total par échéance").fill("1000");
      await page.getByLabel("Ma part de la charge (%)").fill("50");
      await assertFits(page);
      await page.getByRole("radio", { name: "Entrée", exact: true }).check();
      await page.getByLabel("Titre de l’entrée").fill("Pension exemple");
      await page.getByLabel("Montant reçu par mois").fill("250,50");
      await page.getByRole("radio", { name: "Charge", exact: true }).check();
      await expect(page.getByLabel("Ma part de la charge (%)")).toHaveValue(
        "50"
      );
      await page.getByRole("radio", { name: "Entrée", exact: true }).check();
      await expect(page.getByLabel("Montant reçu par mois")).toHaveValue(
        "250,50"
      );
      await assertFits(page);
      if (theme === "light" && [390, 1440].includes(width))
        await page.screenshot({
          path: test.info().outputPath("fixed-income-form-200.png"),
          fullPage: true,
        });
      await page.getByRole("button", { name: "Enregistrer l’entrée" }).click();
      await expect(fixedOperationItem(page, "Pension exemple")).toBeVisible();
      expect(writes[0]).toEqual({
        method: "POST",
        income: true,
        body: {
          titre: "Pension exemple",
          montant: 250.5,
          devise: "EUR",
          categoryId: null,
        },
      });
      await page.reload();
      await openFixedActions(page, "Pension exemple");
      await page
        .getByRole("button", { name: "Modifier Pension exemple" })
        .click();
      await expect(page.getByRole("radio")).toHaveCount(0);
      await expect(page.getByLabel("Titre de l’entrée")).toBeFocused();
      await assertFits(page);
      await page.getByLabel("Montant reçu par mois").fill("300");
      await page.getByRole("button", { name: "Enregistrer l’entrée" }).click();
      await expect(fixedOperationItem(page, "Pension exemple")).toContainText(
        /300,00/
      );
      await openFixedActions(page, "Pension exemple");
      await page
        .getByRole("button", { name: "Supprimer Pension exemple" })
        .click();
      await page
        .getByRole("button", { name: "Confirmer la suppression" })
        .click();
      await expect(fixedOperationItem(page, "Pension exemple")).toHaveCount(0);
      await expect(fixedOperationItem(page, "Salaire")).toBeVisible();
      expect(writes.map((write) => write.method)).toEqual([
        "POST",
        "PUT",
        "DELETE",
      ]);
      await assertFits(page);
    });
  }
