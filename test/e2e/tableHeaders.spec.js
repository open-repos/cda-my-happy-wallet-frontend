import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";

// #361 : tri et filtres depuis les en-têtes (≥ 64rem) ou depuis le panneau
// « Trier et filtrer » (en dessous, où le tableau devient une liste).

const operations = [
  ["Courses", "42.50", "DEPENSE", "2026-08-18"],
  ["Prime", "125.00", "ENTREE", "2026-08-17"],
  ["Loyer", "650.00", "DEPENSE", "2026-08-01"],
].map(([title, amount, type, operationDate], index) => ({
  id: index + 1,
  title,
  amount,
  currency: "EUR",
  type,
  operationDate,
  categoryId: 4,
}));

/** Simule l'API de #165 : tri par montant et filtres type/libellé. */
const answer = (params) => {
  let rows = operations.filter(
    (row) =>
      (!params.get("type") || row.type === params.get("type")) &&
      (!params.get("title") ||
        row.title.toLowerCase().includes(params.get("title").toLowerCase()))
  );
  if (params.get("sort") === "amount")
    rows = [...rows].sort(
      (a, b) =>
        (Number(a.amount) - Number(b.amount)) *
        (params.get("order") === "desc" ? -1 : 1)
    );
  return {
    data: rows,
    meta: { limit: 20, hasNext: false, nextCursor: null },
  };
};

const fits = async (page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
};

const prepare = async (page, { width, theme }) => {
  await page.setViewportSize({ width, height: 1000 });
  await prepareProtectedPage(page);
  await page.addInitScript(
    (theme) => localStorage.setItem("mhw-theme", theme),
    theme
  );
  const requests = [];
  await page.route(/\/v1\/operations(?:\?.*)?$/, (route) => {
    const params = new URL(route.request().url()).searchParams;
    requests.push(params);
    return route.fulfill({ json: answer(params) });
  });
  await page.route(/\/v1\/operations\/suggestions\/titles(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        data: [{ title: "Courses" }, { title: "Loyer" }, { title: "Prime" }],
        meta: { limit: 10, hasNext: false, nextCursor: null },
      },
    })
  );
  return requests;
};

const titles = (page) =>
  page
    .locator(".compact-money-table__title > button")
    .evaluateAll((buttons) => buttons.map((button) => button.textContent));

for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"]) {
    test(`one-off operations sort and filter from headers or panel at ${width}px ${theme}`, async ({
      page,
    }) => {
      const requests = await prepare(page, { width, theme });
      await page.goto("/operations");
      await expect(
        page.getByRole("button", { name: "Courses", exact: true })
      ).toBeVisible();
      const wide = width >= 1024;
      const amountHeader = page.getByRole("columnheader", { name: /Montant/ });
      if (wide) {
        await expect(
          page.getByRole("columnheader", { name: /Trier : Date/ })
        ).toHaveAttribute("aria-sort", "descending");
        const sortAmount = amountHeader.getByRole("button", {
          name: /^Trier :/,
        });
        await sortAmount.click();
        await expect(amountHeader).toHaveAttribute("aria-sort", "ascending");
        await expect(sortAmount).toHaveAccessibleName(
          "Trier : Montant, trié par ordre croissant. Activer pour trier par ordre décroissant."
        );
        await expect
          .poll(() => titles(page))
          .toEqual(["Courses", "Prime", "Loyer"]);
        await sortAmount.click();
        await expect(amountHeader).toHaveAttribute("aria-sort", "descending");
        await expect
          .poll(() => titles(page))
          .toEqual(["Loyer", "Prime", "Courses"]);
        expect(page.url()).toContain("sort=amount&order=desc");
        await sortAmount.click();
        await expect(amountHeader).not.toHaveAttribute("aria-sort");
        expect(new URL(page.url()).searchParams.has("sort")).toBe(false);
        // Filtres sous les noms de colonnes, combinés en ET.
        await page
          .getByRole("columnheader", { name: /Type/ })
          .getByLabel("Filtrer par type")
          .selectOption("DEPENSE");
        const title = page.getByRole("combobox", {
          name: "Filtrer par libellé",
        });
        await title.click();
        await page.getByRole("option", { name: "Loyer" }).click();
        await expect.poll(() => titles(page)).toEqual(["Loyer"]);
        // Plages compactes : un bouton aligné sur les autres filtres.
        const amountRange = page.getByRole("button", {
          name: "Filtrer par montant : Tous",
        });
        const typeBox = await page.getByLabel("Filtrer par type").boundingBox();
        const rangeBox = await amountRange.boundingBox();
        expect(Math.abs(rangeBox.y - typeBox.y)).toBeLessThanOrEqual(1);
        expect(rangeBox.height).toBeLessThanOrEqual(typeBox.height + 1);
        const titleBox = await title.boundingBox();
        expect(Math.abs(titleBox.y - typeBox.y)).toBeLessThanOrEqual(1);
        await amountRange.click();
        const min = page.getByLabel("Filtrer par montant min");
        await expect(min).toBeFocused();
        await min.fill("600");
        await page.keyboard.press("Enter");
        await expect(
          page.getByRole("button", { name: "Filtrer par montant : ≥ 600,00" })
        ).toBeVisible();
        expect(requests.at(-1).get("minAmount")).toBe("600.00");
        await page.keyboard.press("Escape");
        await expect(min).toBeHidden();
        await expect(
          page.getByRole("button", { name: "Filtrer par montant : ≥ 600,00" })
        ).toBeFocused();
        await page
          .getByRole("button", { name: "Filtrer par montant : ≥ 600,00" })
          .click();
        await min.fill("");
        await page.keyboard.press("Enter");
        await page.keyboard.press("Escape");
      } else {
        // Liste en cartes : les en-têtes sont masqués, le panneau les remplace.
        await expect(amountHeader).toBeHidden();
        const toggle = page.getByRole("button", { name: /^Trier et filtrer/ });
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await page
          .getByLabel("Trier par", { exact: true })
          .selectOption("amount");
        await page.getByLabel("Ordre du tri").selectOption("desc");
        await expect
          .poll(() => titles(page))
          .toEqual(["Loyer", "Prime", "Courses"]);
        await page.getByLabel("Filtrer par type").selectOption("DEPENSE");
        const title = page.getByRole("combobox", {
          name: "Filtrer par libellé",
        });
        // Saisie libre (#377) : le texte tapé s’applique avec Entrée.
        await title.fill("loy");
        await title.press("Enter");
        await expect.poll(() => titles(page)).toEqual(["Loyer"]);
        await fits(page);
      }
      const last = requests.at(-1);
      expect(last.get("type")).toBe("DEPENSE");
      expect(last.get("title")).toBe(wide ? "Loyer" : "loy");
      expect(last.has("cursor")).toBe(false);
      await fits(page);
      if (theme === "light" && [390, 1440].includes(width))
        await page.screenshot({
          path: test.info().outputPath("operation-table-query.png"),
          fullPage: true,
        });

      // L'URL conserve l'état : un rechargement le retrouve.
      await page.reload();
      await expect.poll(() => titles(page)).toEqual(["Loyer"]);
      const clear = page.getByRole("button", { name: "Effacer les filtres" });
      await expect(
        page.getByRole("button", { name: "Trier et filtrer (2 filtres)" })
      ).toBeVisible();
      await clear.click();
      await expect.poll(() => titles(page)).toHaveLength(3);
      await expect(clear).toBeHidden();
      expect(requests.at(-1).has("type")).toBe(false);
    });

    test(`fixed operations sort and filter in the browser at ${width}px ${theme}`, async ({
      page,
    }) => {
      await prepare(page, { width, theme });
      await page.goto("/home/operations-fixes");
      const table = page.getByRole("table", {
        name: "Charges et entrées fixes",
      });
      await expect(table).toBeVisible();
      const rows = page.locator(".compact-money-table__row");
      await expect(rows).toHaveCount(2);
      if (width >= 1024) {
        const header = page.getByRole("columnheader", {
          name: /Personnel \/ mois/,
        });
        await expect(header).toHaveAttribute("aria-sort", "descending");
        await page
          .getByRole("columnheader", { name: /Type/ })
          .getByLabel("Filtrer par type")
          .selectOption("income");
      } else {
        await page.getByRole("button", { name: /^Trier et filtrer/ }).click();
        await page.getByLabel("Filtrer par type").selectOption("income");
        // Les critères sans colonne restent accessibles.
        await expect(
          page.getByLabel("Trier par", { exact: true }).locator("option")
        ).toHaveCount(10);
      }
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText("Entrée");
      expect(page.url()).toContain("type=income");
      await fits(page);
      await page.getByRole("button", { name: "Effacer les filtres" }).click();
      await expect(rows).toHaveCount(2);
      // Saisie libre (#377) : un texte sans suggestion filtre aussi.
      const title = page.getByRole("combobox", { name: "Filtrer par libellé" });
      await title.fill("introuvable");
      await title.press("Enter");
      await expect(rows).toHaveCount(0);
      await expect(
        page.getByText("Aucun élément ne correspond à ces filtres.")
      ).toBeVisible();
      expect(page.url()).toContain("title=introuvable");
      await page.getByRole("button", { name: "Effacer les filtres" }).click();
      await expect(rows).toHaveCount(2);
    });
  }

test("free text title filter applies once on outside click and with Tab (#377)", async ({
  page,
}) => {
  const requests = await prepare(page, { width: 1440, theme: "light" });
  await page.goto("/operations");
  await expect(
    page.getByRole("button", { name: "Courses", exact: true })
  ).toBeVisible();
  const title = page.getByRole("combobox", { name: "Filtrer par libellé" });
  const historyBefore = await page.evaluate(() => history.length);
  await title.fill("loy");
  await expect(title).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("heading", { level: 1 }).click();
  await expect.poll(() => titles(page)).toEqual(["Loyer"]);
  expect(await page.evaluate(() => history.length)).toBe(historyBefore + 1);
  expect(requests.filter((p) => p.get("title") === "loy")).toHaveLength(1);
  // Retour revient à la liste sans filtre, en une seule étape.
  await page.goBack();
  await expect.poll(() => titles(page)).toHaveLength(3);
  await expect(title).toHaveValue("");
  // Tab applique le texte et ferme la liste.
  await title.fill("prime");
  await title.press("Tab");
  await expect(title).toHaveAttribute("aria-expanded", "false");
  await expect.poll(() => titles(page)).toEqual(["Prime"]);
  expect(page.url()).toContain("title=prime");
  // Le texte est restauré dans le champ au rechargement.
  await page.reload();
  await expect(title).toHaveValue("prime");
});
