import { test, expect } from "@playwright/test";
for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"] as const)
    test(`actions and floating button at ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/sign-in");
      await page.getByLabel("Email").fill("happy@example.test");
      await page
        .getByRole("textbox", { name: "Mot de passe", exact: true })
        .fill("correct-horse-battery-staple");
      await page.getByRole("button", { name: "Se connecter" }).click();
      await expect(
        page.getByText("Votre budget en un coup d’œil", { exact: true }),
      ).toBeVisible();
      if (width < 768) {
        const fab = page.getByRole("button", {
          name: "Ajouter une opération ou un événement",
        });
        await expect(fab).toBeVisible();
        const style = await fab.evaluate((el) => ({
          shadow: getComputedStyle(el).boxShadow,
          border: parseFloat(getComputedStyle(el).borderTopWidth),
        }));
        expect(style.shadow).not.toBe("none");
        expect(style.border).toBeGreaterThanOrEqual(2);
      }
      await page.getByRole("tab", { name: "Opérations ponctuelles" }).click();
      const add = page.getByRole("button", {
        name: "Ajouter une opération",
        exact: true,
      });
      await expect(add.getByTestId("action-button-icon")).toBeVisible();
      expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(48);
      await page
        .getByRole("button", { name: /^Modifier / })
        .first()
        .click();
      const remove = page.getByRole("button", {
        name: "Supprimer",
        exact: true,
      });
      await expect(remove.getByTestId("action-button-icon")).toBeVisible();
      const appearance = await remove.evaluate((el) => ({
        border: getComputedStyle(el).borderTopColor,
        background: getComputedStyle(el).backgroundColor,
      }));
      expect(appearance.border).not.toBe(appearance.background);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
      await page.screenshot({
        path: test.info().outputPath(`actions-${width}-${theme}.png`),
        fullPage: true,
      });
    });
