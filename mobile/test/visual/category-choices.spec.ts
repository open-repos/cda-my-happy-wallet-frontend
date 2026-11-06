import { test, expect } from "@playwright/test";
for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"] as const) {
    test(`category icons and personal names at ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.route(/\/operation-categories(?:\?.*)?$/, (route) =>
        route.fulfill({
          json: {
            data: [
              {
                id: 4,
                name: "Ma catégorie personnelle avec un nom long",
                color: null,
                icon: "solid:bus",
              },
              {
                id: 5,
                name: "Icône retirée",
                color: "#336699",
                icon: "solid:retired-icon",
              },
            ],
            meta: { limit: 100, hasNext: false, nextCursor: null },
          },
        }),
      );
      await page.goto("/sign-in");
      await page.getByLabel("Email").fill("happy@example.test");
      await page
        .getByRole("textbox", { name: "Mot de passe", exact: true })
        .fill("correct-horse-battery-staple");
      await page.getByRole("button", { name: "Se connecter" }).click();
      await expect(
        page.getByText("Votre budget en un coup d’œil", { exact: true }),
      ).toBeVisible();
      await page.getByRole("tab", { name: "Opérations ponctuelles" }).click();
      await page
        .getByRole("button", { name: "Ajouter une opération", exact: true })
        .click();
      const choice = page.getByRole("radio", {
        name: "Ma catégorie personnelle avec un nom long",
        exact: true,
      });
      await expect(choice.getByTestId("category-mark-icon")).toBeVisible();
      await expect(
        page
          .getByRole("radio", { name: "Icône retirée", exact: true })
          .getByTestId("category-mark-fallback"),
      ).toBeVisible();
      await choice.click();
      await expect(choice).toBeChecked();
      expect((await choice.boundingBox())!.height).toBeGreaterThanOrEqual(48);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
      await page.screenshot({
        path: test.info().outputPath(`category-${width}-${theme}.png`),
        fullPage: true,
      });
      await page.getByRole("button", { name: "Fermer le formulaire" }).click();
    });
  }
