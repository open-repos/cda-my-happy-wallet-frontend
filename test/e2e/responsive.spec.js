import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const pages = [
  {
    path: "/login",
    heading: /Bienvenue sur MyHappyWallet/i,
    action: "Connexion",
  },
  {
    path: "/register",
    heading: /Créer un compte pour utiliser MyHappyWallet/i,
    action: "S'enregistrer",
  },
];

for (const viewport of viewports) {
  for (const pageDefinition of pages) {
    test(`${pageDefinition.path} fits the ${viewport.name} viewport`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(pageDefinition.path);

      await expect(
        page.getByRole("heading", { name: pageDefinition.heading })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: pageDefinition.action })
      ).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(hasHorizontalOverflow).toBe(false);
    });
  }
}
