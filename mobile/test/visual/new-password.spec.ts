import { expect, test } from "@playwright/test";

const TOKEN = "0123456789abcdef".repeat(8);

test("captures the new password form opened from the email link", async ({
  page,
}) => {
  await page.route("**/v1/users/reset-password/*", (route) =>
    route.fulfill({ status: 201, json: { succes: true } }),
  );
  await page.route("**/v1/users/new-password", (route) =>
    route.fulfill({ status: 201, json: { succes: true } }),
  );

  await page.goto(`/new-password?resetToken=${TOKEN}`);
  await expect(
    page.getByLabel("Nouveau mot de passe", { exact: true }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(new RegExp(TOKEN));
  await expect(page).toHaveScreenshot("new-password.png", { fullPage: true });

  await page.getByLabel("Nouveau mot de passe", { exact: true }).fill("weak");
  await page.getByLabel("Confirmer le nouveau mot de passe").fill("weak");
  await page
    .getByRole("button", { name: "Enregistrer le mot de passe" })
    .click();
  await expect(
    page.getByText(/au moins 8 caractères, avec une minuscule/),
  ).toBeVisible();

  await page
    .getByLabel("Nouveau mot de passe", { exact: true })
    .fill("StrongPass.1");
  await page
    .getByLabel("Confirmer le nouveau mot de passe")
    .fill("StrongPass.1");
  await page
    .getByRole("button", { name: "Enregistrer le mot de passe" })
    .click();
  await expect(
    page.getByText("Votre mot de passe a été modifié avec succès."),
  ).toBeVisible();
});

test("explains an expired or used reset link", async ({ page }) => {
  await page.route("**/v1/users/reset-password/*", (route) =>
    route.fulfill({ status: 401, json: { message: "expired" } }),
  );

  await page.goto(`/new-password?resetToken=${TOKEN}`);
  await expect(page.getByText(/a déjà été utilisé/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Demander un nouveau lien" }),
  ).toBeVisible();
});

test("shows the confirmation outcome once and clears it from the URL", async ({
  page,
}) => {
  await page.goto("/sign-in?confirmation=already-used");
  await expect(
    page.getByText(
      "Ce lien de confirmation a déjà été utilisé. Vous pouvez vous connecter.",
    ),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});
