import { expect, Page, test } from "@playwright/test";

// Invitation à vérifier les spams après un envoi d'email (#388, Web #362).
const HINT =
  "L’email n’arrive pas ? Attendez quelques minutes, puis vérifiez votre dossier spam ou courrier indésirable.";

const success = (page: Page, path: string) =>
  page.route(`**/v1/users/${path}`, (route) =>
    route.fulfill({ status: 201, json: { succes: true } }),
  );

/** Le message de succès est annoncé d'un bloc : titre, confirmation, conseil. */
const expectAnnouncedHint = async (page: Page, title: string) => {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const announcement = page.getByLabel(new RegExp(`^${escaped}\\.`));
  await expect(announcement).toBeVisible();
  const label = (await announcement.getAttribute("aria-label")) ?? "";
  expect(label.endsWith(`\n\n${HINT}`)).toBe(true);
  await expect(page.getByText(HINT)).toBeVisible();
};

test("reminds to check spam after registering", async ({ page }) => {
  await success(page, "register");
  await page.goto("/register");
  await page.getByLabel("Prénom").fill("Ada");
  await page.getByLabel("Nom", { exact: true }).fill("Lovelace");
  await page.getByLabel("Email").fill("ada@example.test");
  await page.getByLabel("Mot de passe", { exact: true }).fill("StrongPass.1");
  await page.getByLabel("Confirmer le mot de passe").fill("StrongPass.1");
  await page.getByRole("button", { name: "S’enregistrer" }).click();

  await expectAnnouncedHint(page, "Merci pour votre inscription !");
  await expect(page).toHaveScreenshot("register-email-hint.png", {
    fullPage: true,
  });
});

test("reminds to check spam after a reset request", async ({ page }) => {
  await success(page, "reset-password");
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill("ada@example.test");
  await page.getByRole("button", { name: "Envoyer le lien" }).click();

  // Même réponse que le compte existe ou non : rien de plus n'est révélé.
  await expect(
    page.getByText(/^Si un compte correspond à cette adresse/),
  ).toBeVisible();
  await expectAnnouncedHint(page, "Votre demande a été prise en compte");
  await expect(page).toHaveScreenshot("forgot-password-email-hint.png", {
    fullPage: true,
  });
});
