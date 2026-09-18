import { expect, test } from "@playwright/test";

test("navigates from login to registration", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: /Bienvenue sur MyHappyWallet/i })
  ).toBeVisible();
  await page.getByRole("link", { name: /Enregistrez vous ici/i }).click();

  await expect(page).toHaveURL(/\/register$/);
  await expect(
    page.getByRole("button", { name: "S'enregistrer" })
  ).toBeVisible();
});

for (const result of [
  {
    code: "already-used",
    message:
      "Ce lien de confirmation a déjà été utilisé. Vous pouvez vous connecter.",
  },
  {
    code: "invalid-or-expired",
    message:
      "Ce lien de confirmation est invalide ou a expiré. Recommencez l’inscription pour recevoir un nouveau lien.",
  },
]) {
  test(`shows a safe ${result.code} confirmation message once`, async ({
    page,
  }) => {
    await page.goto(`/login?confirmation=${result.code}`);

    await expect(page.getByRole("alert")).toHaveText(result.message);
    await expect(page.getByRole("alert")).toHaveCount(1);
    await expect(page).toHaveURL(/\/login$/);
  });
}

test("shows one registration confirmation success toast", async ({ page }) => {
  await page.goto("/login?success=true&message=registrationok");

  const successToast = page.getByRole("alert").filter({
    hasText: "Votre compte a bien été créé !",
  });
  await expect(successToast).toHaveCount(1);
  await expect(successToast).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("keeps accepted registration feedback generic", async ({ page }) => {
  await page.route("**/v1/users/register/", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        succes: true,
        message:
          "If registration is available, a confirmation email will be sent.",
      }),
    });
  });
  await page.goto("/register");

  await page.getByPlaceholder("Entrez prénom").fill("Happy");
  await page.getByPlaceholder("Entrez votre nom").fill("Wallet");
  await page.getByPlaceholder("Entrez votre email").fill("user@example.test");
  await page.getByPlaceholder("Entrez mot de passe").fill("LocalPass!1");
  await page
    .getByPlaceholder("Confirmez votre mot de passe")
    .fill("LocalPass!1");
  await page.getByRole("button", { name: "S'enregistrer" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Demande d’inscription prise en compte",
    })
  ).toBeVisible();
  await expect(page.getByText(/Vous allez recevoir/i)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "connecter" })).toHaveAttribute(
    "href",
    "/login"
  );
  await expect(
    page.getByRole("link", { name: "réinitialiser votre mot de passe" })
  ).toHaveAttribute("href", "/forgot-password");
});
