import { test, expect } from "@playwright/test";
const date = "2026-10-25";
const operation = {
  id: 1,
  title: "Courses réelles",
  amount: "20.00",
  currency: "EUR",
  type: "DEPENSE",
  operationDate: date,
  categoryId: 4,
};
const event = {
  id: 9,
  title: "Facture confirmée",
  amount: "30.00",
  currency: "EUR",
  kind: "DEPENSE",
  startDate: date,
  occurrenceDate: date,
  recurrence: "MENSUELLE",
  endDate: null,
  status: "CONFIRME",
};
const meta = (next: string | null = null) => ({
  limit: 100,
  hasNext: !!next,
  nextCursor: next,
});
for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"] as const)
    test(`native complete day ${width} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme });
      await page.clock.setFixedTime(new Date("2026-10-26T00:30:00-12:00"));
      const operations = Array.from({ length: 122 }, (_, i) => ({
        ...operation,
        id: i + 1,
        title: i === 121 ? "Dernière page entrée" : `Courses ${i + 1}`,
        type: i === 121 ? "ENTREE" : "DEPENSE",
      }));
      await page.route(/\/v1\/operations(?:\?.*)?$/, (route) => {
        const next = new URL(route.request().url()).searchParams.has("cursor");
        return route.fulfill({
          json: {
            data: next ? operations.slice(100) : operations.slice(0, 100),
            meta: meta(next ? null : "next"),
          },
        });
      });
      await page.route(/\/v1\/event-occurrences(?:\?.*)?$/, (route) =>
        route.fulfill({
          json: {
            data: [
              event,
              {
                ...event,
                id: 10,
                title: "Projet potentiel",
                status: "POTENTIEL",
              },
              { ...event, id: 11, title: "Déjà converti" },
            ],
            meta: meta(),
          },
        }),
      );
      await page.route(
        /\/v1\/event-occurrence-resolutions(?:\?.*)?$/,
        (route) =>
          route.fulfill({
            json: {
              data: [
                {
                  eventId: 11,
                  title: "Déjà converti",
                  amount: "30.00",
                  currency: "EUR",
                  kind: "DEPENSE",
                  occurrenceDate: date,
                  status: "REALIZED",
                  resolvedAt: "2026-10-25T10:00:00Z",
                  operation: {
                    id: 1,
                    title: "Courses 1",
                    amount: "20.00",
                    operationDate: date,
                    categoryId: 4,
                  },
                },
              ],
              meta: meta(),
            },
          }),
      );
      await page.goto("/sign-in");
      await page.getByLabel("Email").fill("happy@example.test");
      await page
        .getByRole("textbox", { name: "Mot de passe", exact: true })
        .fill("correct-horse-battery-staple");
      await page.getByRole("button", { name: "Se connecter" }).click();
      await page.getByRole("tab", { name: "Calendrier" }).click();
      for (const label of ["Prochains mois", "Simulation"]) {
        const contrast = await page
          .getByText(label, { exact: true })
          .first()
          .evaluate((el) => {
            const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
            const lum = (c: number[]) =>
              c
                .slice(0, 3)
                .map((v) => v / 255)
                .map((v) =>
                  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
                )
                .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
            let parent: Element | null = el;
            while (parent) {
              const bg = rgb(getComputedStyle(parent).backgroundColor);
              if (bg.length === 3 || bg[3] === 1) {
                const [high, low] = [
                  lum(rgb(getComputedStyle(el).color)),
                  lum(bg),
                ].sort((a, b) => b - a);
                return (high + 0.05) / (low + 0.05);
              }
              parent = parent.parentElement;
            }
            return 0;
          });
        expect(
          contrast,
          `${label} contrast in ${theme}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      if (width < 768) {
        const fab = page.getByRole("button", {
          name: "Ajouter une opération ou un événement",
          exact: true,
        });
        await expect(fab).toBeVisible();
        const scroll = await page
          .getByTestId("calendar-scroll-content")
          .boundingBox();
        const bounds = await fab.boundingBox();
        expect(scroll!.y + scroll!.height).toBeLessThanOrEqual(bounds!.y);
        await expect(
          page.getByTestId("calendar-quick-add-space"),
        ).toBeVisible();
      }
      const day = page.getByRole("button", {
        name: /^25 octobre 2026.*122 opérations réelles.*1 événement prévu.*1 élément potentiel.*1 événement en retard/,
      });
      await expect(day).toBeVisible();
      await day.click();
      await expect(
        page.getByRole("heading", { name: "Éléments du 25 octobre 2026" }),
      ).toBeVisible();
      await expect(
        page.getByText("Dernière page entrée", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Projet potentiel", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Facture confirmée", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Déjà converti", { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText("Élément potentiel · à confirmer · exclu du réel", {
          exact: true,
        }),
      ).toBeVisible();
      for (const name of [
        "Convertir Facture confirmée en opération",
        "Annuler Facture confirmée",
      ]) {
        const action = page.getByRole("button", { name, exact: true });
        await expect(action.getByTestId("action-button-icon")).toHaveCount(1);
        const bounds = await action.boundingBox();
        expect(bounds?.height).toBeGreaterThanOrEqual(48);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page
        .getByRole("heading", { name: "Éléments du 25 octobre 2026" })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: test.info().outputPath(`native-calendar-${width}-${theme}.png`),
      });
    });
