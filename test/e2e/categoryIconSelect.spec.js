import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";
for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"])
    test(`icon selector in quick addition at ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await prepareProtectedPage(page);
      await page.addInitScript(
        (value) => localStorage.setItem("mhw-theme", value),
        theme
      );
      const categories = Array.from({ length: 45 }, (_, i) => ({
        id: i + 1,
        name: `Catégorie personnelle ${String(i + 1).padStart(2, "0")}`,
        color: null,
        icon: "solid:heart",
      }));
      categories[42].name = "Famille et projets personnels au nom très long";
      categories[44].icon = "solid:retired-icon";
      await page.route(/\/v1\/operation-categories(?:\?.*)?$/, (route) =>
        route.fulfill({
          json: {
            data: categories,
            meta: { limit: 100, hasNext: false, nextCursor: null },
          },
        })
      );
      let writes = 0;
      await page.route(/\/v1\/operations$/, (route) => {
        if (route.request().method() === "POST") writes++;
        return route.fulfill({
          status: 422,
          json: { message: "Refus synthétique" },
        });
      });
      await page.goto("/operations");
      const opener = page.getByRole("button", {
        name: "Ajouter une opération",
        exact: true,
      });
      await opener.click();
      await page
        .getByRole("button", { name: /^Dépense Opération réelle/ })
        .click();
      const dialog = page.getByRole("dialog");
      const field = page.getByRole("combobox", {
        name: "Catégorie",
        exact: true,
      });
      await field.click();
      const list = page.getByRole("listbox", {
        name: "Catégorie",
        exact: true,
      });
      await expect(
        list
          .getByRole("option", { name: categories[0].name, exact: true })
          .locator("svg")
      ).toBeVisible();
      await expect(
        list
          .getByRole("option", { name: categories[44].name, exact: true })
          .locator(".category-swatch")
      ).toBeVisible();
      await list
        .getByRole("option", { name: categories[42].name, exact: true })
        .click();
      await expect(field).toContainText(categories[42].name);
      await expect(field.locator("svg")).toBeVisible();
      expect(writes).toBe(0);
      await expect(field).toBeFocused();
      await page.locator("html").evaluate((el) => (el.style.fontSize = "200%"));
      await page.setViewportSize({ width, height: 580 });
      await field.click();
      const selected = list.getByRole("option", { selected: true });
      await expect(selected).toContainText(categories[42].name);
      const outer = await list.boundingBox(),
        inner = await selected.boundingBox();
      expect(outer.y).toBeGreaterThanOrEqual(-1);
      expect(outer.y + outer.height).toBeLessThanOrEqual(581);
      expect(inner.y).toBeGreaterThanOrEqual(outer.y - 1);
      expect(inner.y + inner.height).toBeLessThanOrEqual(
        outer.y + outer.height + 1
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
      ).toBeLessThanOrEqual(width + 1);
      expect((await field.boundingBox()).height).toBeGreaterThanOrEqual(44);
      await page.screenshot({
        path: test.info().outputPath(`selector-${width}-${theme}.png`),
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      await expect(list).toHaveCount(0);
      await expect(dialog).toBeVisible();
      await expect(field).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(opener).toBeFocused();
      expect(writes).toBe(0);
    });
