import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";

for (const theme of ["light", "dark"]) {
  for (const width of [320, 390, 768, 1440]) {
    test(`goal trajectory is readable at ${width}px in ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await prepareProtectedPage(page);
      await page.addInitScript(
        (value) => localStorage.setItem("mhw-theme", value),
        theme
      );
      await page.goto("/objectifs-evenements");
      const card = page.getByRole("article", { name: "Vélo", exact: true });
      await expect(
        card.locator(".goal-card__gauge-chart canvas")
      ).toBeVisible();
      await expect(
        card.locator(".goal-trajectory__chart canvas")
      ).toBeVisible();
      await expect(
        card.getByRole("img", { name: /25 % de l’objectif Vélo atteint/ })
      ).toBeVisible();
      await expect(card.locator("time")).toHaveText("avril 2027");
      for (const fontSize of ["100%", "200%"]) {
        await page.locator("html").evaluate((el, size) => {
          el.style.fontSize = size;
        }, fontSize);
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1
            )
          )
          .toBe(true);
        await card.getByText("Lire les montants projetés").click();
        await expect(card.getByRole("table")).toContainText(
          "novembre 2026 · projeté"
        );
        await expect(card.getByRole("table")).toContainText(/450,00\s*€/);
        const issues = await card.evaluate((root) => {
          const rgb = (text) =>
            text
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number);
          const light = (v) =>
            rgb(v)
              .map((n) => {
                n /= 255;
                return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
              })
              .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
          const background = getComputedStyle(root).backgroundColor;
          return [
            ...root.querySelectorAll(
              "h3,h4,dt,dd,p,time,summary,th,td,label,select"
            ),
          ]
            .filter((el) => el.checkVisibility())
            .flatMap((el) => {
              const style = getComputedStyle(el);
              const values = [light(style.color), light(background)].sort(
                (a, b) => b - a
              );
              const contrast = (values[0] + 0.05) / (values[1] + 0.05);
              const rect = el.getBoundingClientRect();
              const range = document.createRange();
              range.selectNodeContents(el);
              const over = [...range.getClientRects()].some(
                (box) => box.left < -1 || box.right > innerWidth + 1
              );
              return contrast < (parseFloat(style.fontSize) >= 24 ? 3 : 4.5) ||
                rect.right > innerWidth + 1 ||
                over
                ? [el.tagName + "." + el.className]
                : [];
            });
        });
        expect(issues).toEqual([]);
        await card.getByText("Lire les montants projetés").click();
      }
      await card
        .getByRole("button", { name: "Modifier l’objectif Vélo" })
        .click();
      await expect(page.getByLabel("Titre", { exact: true })).toBeFocused();
      await page.getByRole("button", { name: "Annuler", exact: true }).click();
      await expect(
        card.getByRole("button", { name: "Modifier l’objectif Vélo" })
      ).toBeFocused();
    });
  }
}

test("changing the selected goal does not write or combine currencies", async ({
  page,
}) => {
  await prepareProtectedPage(page);
  const goal = {
    id: 1,
    title: "Apport immobilier pour notre résidence principale",
    targetAmount: "6000.00",
    savedAmount: "1800.00",
    monthlyContribution: "350.00",
    currency: "EUR",
    targetDate: "2027-05-31",
    forecast: {
      referenceMonth: "2026-10",
      remainingAmount: "4200.00",
      status: "BEHIND",
      contributionsNeeded: 12,
      estimatedReachMonth: "2027-10",
      requiredMonthlyContribution: "600.00",
    },
  };
  const second = {
    ...goal,
    id: 2,
    title: "Réserve de précaution pour les dépenses imprévues",
    currency: "CHF",
  };
  const writes = [];
  await page.route(/\/v1\/goals(?:\?.*)?$/, (route) => {
    if (route.request().method() !== "GET")
      writes.push(route.request().method());
    return route.fulfill({
      json: {
        data: [goal, second],
        meta: { limit: 100, hasNext: false, nextCursor: null },
      },
    });
  });
  await page.goto("/objectifs-evenements");
  const picker = page.getByLabel("Objectif à explorer");
  await picker.selectOption("2");
  const card = page.getByRole("article", { name: second.title, exact: true });
  await expect(card).toBeVisible();
  await expect(card.getByRole("img").last()).toHaveAttribute(
    "aria-label",
    /en CHF/
  );
  await card.getByLabel("Horizon").selectOption("24");
  expect(writes).toEqual([]);
});
