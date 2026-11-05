import { expect, test } from "@playwright/test";

// #360: shared filter field on its test bench (simulated paginated source).
const bench = (query = "") => `/test/e2e/harness/filter-combobox.html${query}`;
const widths = [320, 390, 768, 1440];

const noHorizontalScroll = (page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  );

for (const theme of ["light", "dark"]) {
  for (const width of widths) {
    test(`fits and stays readable at ${width}px (${theme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 760 });
      await page.goto(bench(`?theme=${theme}`));
      const input = page.getByRole("combobox", { name: "Filtrer par titre" });
      await input.focus();
      await page.keyboard.press("ArrowDown");
      const listbox = page.getByRole("listbox", { name: "Filtrer par titre" });
      await expect(listbox.getByRole("option")).toHaveCount(10);
      const popup = page.locator(".filter-combobox__popup").first();
      const box = await popup.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(760);
      expect(await noHorizontalScroll(page)).toBe(true);
      const outline = await input.evaluate(
        (node) => getComputedStyle(node).outlineStyle
      );
      expect(outline).toBe("solid");
      const option = listbox.getByRole("option").first();
      const sizes = await option.evaluate((node) => ({
        height: node.getBoundingClientRect().height,
        color: getComputedStyle(node).color,
        background: getComputedStyle(node.closest(".filter-combobox__popup"))
          .backgroundColor,
      }));
      expect(sizes.height).toBeGreaterThanOrEqual(44);
      expect(sizes.color).not.toBe(sizes.background);
    });
  }
}

test("loads the next pages on scroll without duplicates until the end", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto(bench());
  const input = page.getByRole("combobox", { name: "Filtrer par titre" });
  await input.click();
  const options = page
    .getByRole("listbox", { name: "Filtrer par titre" })
    .getByRole("option");
  await expect(options).toHaveCount(10);
  const popup = page.locator(".filter-combobox__popup").first();
  for (const expected of [20, 30, 40, 47]) {
    await popup.evaluate((node) => (node.scrollTop = node.scrollHeight));
    await expect(options).toHaveCount(expected);
  }
  const labels = await options.allTextContents();
  expect(new Set(labels).size).toBe(47);
  await popup.evaluate((node) => (node.scrollTop = node.scrollHeight));
  await expect(popup).toContainText("Fin de liste · 47 valeurs");
  await expect(page.getByRole("status").first()).toContainText("fin de liste");
});

test("keyboard: arrows, loading the next page, Enter and Escape", async ({
  page,
}) => {
  await page.goto(bench());
  const input = page.getByRole("combobox", { name: "Filtrer par titre" });
  await input.focus();
  await page.keyboard.press("ArrowDown");
  const options = page
    .getByRole("listbox", { name: "Filtrer par titre" })
    .getByRole("option");
  await expect(options).toHaveCount(10);
  for (let i = 0; i < 10; i += 1) await page.keyboard.press("ArrowDown");
  await expect(options).toHaveCount(20);
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    (await options.nth(10).getAttribute("id")) ?? ""
  );
  await expect(options.nth(10)).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("single-value")).toHaveText("Opération 11");
  await expect(input).toHaveValue("Opération 11");
  await expect(input).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("single-value")).toHaveText("aucune");
});

test("debounces typing and never shows an older result", async ({ page }) => {
  await page.goto(bench("?delay=400"));
  const input = page.getByRole("combobox", { name: "Filtrer par titre" });
  await input.click();
  await input.pressSequentially("élec", { delay: 30 });
  const options = page
    .getByRole("listbox", { name: "Filtrer par titre" })
    .getByRole("option");
  await expect(options).toHaveCount(1);
  await expect(options.first().locator("mark")).toHaveText("Élec");
  const requests = await page.evaluate(() => window.__filterRequests);
  expect(requests.map((r) => r.query)).toEqual(["", "élec"]);
});

test("shows the error state and retries the failed page", async ({ page }) => {
  await page.goto(bench("?failCursor=10"));
  const input = page.getByRole("combobox", { name: "Filtrer par titre" });
  await input.click();
  const popup = page.locator(".filter-combobox__popup").first();
  const options = popup.getByRole("option");
  await expect(options).toHaveCount(10);
  await popup.evaluate((node) => (node.scrollTop = node.scrollHeight));
  await expect(popup).toContainText("Chargement impossible");
  await popup.getByRole("button", { name: "Réessayer" }).click();
  await expect(options).toHaveCount(20);
  await expect(input).toBeFocused();
});

test("multiple choice keeps the list open and lists removable values", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto(bench());
  const input = page.getByRole("combobox", { name: "Filtrer par catégorie" });
  await input.click();
  const listbox = page.getByRole("listbox", { name: "Filtrer par catégorie" });
  await expect(listbox).toHaveAttribute("aria-multiselectable", "true");
  await listbox.getByRole("option").nth(0).click();
  await listbox.getByRole("option").nth(2).click();
  await expect(listbox).toBeVisible();
  await expect(page.getByTestId("multiple-value")).toHaveText(
    "Opération 01 | Électricité et gaz de la résidence principale"
  );
  const chips = page.getByRole("list", {
    name: "Filtrer par catégorie : valeurs choisies",
  });
  await page.keyboard.press("Escape");
  await chips.getByRole("button", { name: "Retirer Opération 01" }).click();
  await expect(page.getByTestId("multiple-value")).toHaveText(
    "Électricité et gaz de la résidence principale"
  );
  expect(await noHorizontalScroll(page)).toBe(true);
});

test("fits in a narrow table header", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto(bench());
  const input = page.getByRole("combobox", {
    name: "Filtrer la colonne Titre",
  });
  await input.click();
  const popup = page.locator("th .filter-combobox__popup");
  await expect(popup.getByRole("option")).toHaveCount(10);
  const box = await popup.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(288 - 1);
  expect(box.x + box.width).toBeLessThanOrEqual(390 - 7);
  expect(await noHorizontalScroll(page)).toBe(true);
});
