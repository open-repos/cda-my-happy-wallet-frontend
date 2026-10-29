import { expect, test } from "@playwright/test";
import { prepareEnvelopePage } from "./envelopesFixture.mjs";

const routes = [
  "/home",
  "/operations",
  "/home/operations-fixes",
  "/calendrier",
  "/prochains-mois",
  "/objectifs-evenements",
  "/analyses",
  "/categories",
  "/profil",
];
const assertControlsFit = async (page) => {
  const outside = await page
    .locator(
      "#main-content input:visible,#main-content select:visible,#main-content button:visible"
    )
    .evaluateAll((elements) =>
      elements
        .filter(
          (element) =>
            !element.closest(
              ".budget-forecast__scroll,.analytics__table,.compact-money-table__scroll"
            )
        )
        .filter((element) => {
          const r = element.getBoundingClientRect();
          return r.left < -1 || r.right > innerWidth + 1;
        })
        .map(
          (element) =>
            element.getAttribute("aria-label") ||
            element.id ||
            element.textContent
        )
    );
  expect(outside).toEqual([]);
};
for (const width of [320, 390, 768, 1024, 1440, 1920])
  for (const theme of ["light", "dark"]) {
    test(`Atelier applies to every page at ${width}px ${theme}`, async ({
      page,
    }) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width, height: 900 });
      await prepareEnvelopePage(page);
      await page.addInitScript(
        (theme) => localStorage.setItem("mhw-theme", theme),
        theme
      );
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator("#main-content h1").first()).toBeVisible();
        await expect(page.locator("#main-content")).toHaveCSS(
          "color",
          theme === "light" ? "rgb(31, 43, 29)" : "rgb(244, 249, 240)"
        );
        const nav = page.getByRole("navigation", {
          name: "Navigation principale",
        });
        if (width >= 1200) {
          await expect(nav).toBeVisible();
          await expect(
            nav.getByRole("link", { name: "Charges et entrées fixes" })
          ).toBeVisible();
          await expect(
            nav.getByRole("link", { name: "Prochains mois" })
          ).toBeVisible();
        } else {
          await page.getByRole("button", { name: "Ouvrir le menu" }).click();
          await expect(
            nav.getByRole("link", { name: "Prochains mois" })
          ).toBeVisible();
          await expect(page.locator("#main-content")).toHaveAttribute(
            "inert",
            ""
          );
          await page.keyboard.press("Escape");
          await expect(
            page.getByRole("button", { name: "Ouvrir le menu" })
          ).toBeFocused();
          await expect(page.locator("#main-content")).not.toHaveAttribute(
            "inert",
            ""
          );
        }
        await assertControlsFit(page);
        // Text-only enlargement: measure controls, not only a document whose overflow could be hidden.
        await page.locator("#main-content").evaluate((root) => {
          const nodes = [root, ...root.querySelectorAll("*")];
          const sizes = nodes.map((node) =>
            parseFloat(getComputedStyle(node).fontSize)
          );
          nodes.forEach(
            (node, index) => (node.style.fontSize = `${sizes[index] * 2}px`)
          );
        });
        await assertControlsFit(page);
      }
    });
  }

test("forecast prioritises real rendered data and uses the shared add popup", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepareEnvelopePage(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/prochains-mois");
  await expect(page.locator(".budget-forecast__chart canvas")).toBeVisible();
  const box = await page.locator("#forecast-chart-title").boundingBox();
  expect(box.y).toBeLessThan(350);
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: /Dépense Opération réelle/ }).click();
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue(
    "2026-10-28"
  );
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("QuickAdd confirms once and read recovery does not repeat a committed write", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await prepareEnvelopePage(page);
  let failReads = false;
  await page.route(/\/v1\/envelope-overview(?:\?.*)?$/, (route) =>
    failReads
      ? route.fulfill({
          status: 503,
          json: { message: "Synthetic read error" },
        })
      : route.fallback()
  );
  await page.goto("/home");
  await expect(
    page.getByRole("article", { name: "Alimentation", exact: true })
  ).toBeVisible();
  await expect(page.locator(".Toastify__toast")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Ajouter une opération ou un événement" })
    .click();
  await page.getByRole("button", { name: /Dépense Opération réelle/ }).click();
  await expect(page.locator(".quick-add-dock")).toBeHidden();
  await page.getByLabel("Titre", { exact: true }).fill("Courses de test");
  await page.getByRole("textbox", { name: /Montant/ }).fill("15");
  await page.getByRole("combobox", { name: "Catégorie", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("option", { name: "Alimentation", exact: true })
    .click();
  failReads = true;
  await page
    .getByRole("button", { name: "Enregistrer", exact: true })
    .dblclick();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /Opération ajoutée.*n’ont pas pu être actualisées/ })
  ).toHaveCount(1);
  await expect(page.locator(".Toastify__toast")).toHaveCount(1);
  expect(state.writes).toHaveLength(1);
  await page.getByRole("button", { name: "Fermer la notification" }).click();
  await expect(
    page.getByRole("button", { name: "Recharger les données" })
  ).toBeVisible();
  failReads = false;
  await page.getByRole("button", { name: "Recharger les données" }).click();
  await expect(
    page.getByRole("button", { name: "Recharger les données" })
  ).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
});

test("landscape reserves a compact add row and defers notifications during keyboard use", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await prepareEnvelopePage(page);
  await page.goto("/home");
  const dock = page.locator(".quick-add-dock");
  await expect(dock).toBeVisible();
  const button = await page
    .getByRole("button", { name: "Ajouter une opération ou un événement" })
    .boundingBox();
  expect(button.height).toBeGreaterThanOrEqual(44);
  const row = await dock.boundingBox();
  expect(row.height).toBeLessThanOrEqual(70);
  await page
    .getByRole("button", { name: "Ajouter une opération ou un événement" })
    .click();
  await expect(dock).toBeHidden();
  await page.getByRole("button", { name: /Dépense Opération réelle/ }).click();
  await assertControlsFit(page);
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(dock).toBeVisible();
});
