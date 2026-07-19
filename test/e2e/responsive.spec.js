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
  {
    path: "/forgot-password",
    heading: /Vous avez oublié votre mot de passe/i,
    action: "Changer de mot de passe",
  },
  {
    path: "/new-password",
    heading: /Choisissez votre nouveau mot de passe/i,
    action: "Confirmation du nouveau mot de passe",
  },
];

const storedUser = {
  payload: {
    accessToken: "fake-token",
    user: { firstname: "Happy", lastname: "Wallet" },
  },
};

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

  test(`protected shell fits the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript((user) => {
      window.localStorage.setItem(JSON.stringify("user"), JSON.stringify(user));
    }, storedUser);
    await page.goto("/calendrier");

    await expect(page.locator(".calendrier-container")).toHaveText(
      "Calendrier"
    );

    const contentBounds = await page
      .locator(".protected-layout__content")
      .boundingBox();
    expect(contentBounds.x).toBeGreaterThanOrEqual(0);
    expect(contentBounds.x + contentBounds.width).toBeLessThanOrEqual(
      viewport.width
    );
  });
}

test("allows vertical scrolling on a compact mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/register");

  const scrollMetrics = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(
    scrollMetrics.clientHeight
  );

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
});
