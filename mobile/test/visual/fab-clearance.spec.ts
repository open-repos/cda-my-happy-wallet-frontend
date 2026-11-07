import { expect, Locator, Page, test } from "@playwright/test";

// Fin des écrans dégagée du bouton flottant d'ajout (#407), sur téléphone.
test.skip(
  ({ viewport }) => (viewport?.width ?? 0) >= 768,
  "Bouton flottant affiché seulement sur téléphone.",
);

const signIn = async (page: Page) => {
  await page.clock.setFixedTime(new Date("2026-10-11T10:00:00+02:00"));
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("happy@example.test");
  await page
    .getByRole("textbox", { exact: true, name: "Mot de passe" })
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(
    page.getByText("Votre budget en un coup d’œil", { exact: true }),
  ).toBeVisible();
};

/** Fait défiler jusqu'en bas puis vérifie que `last` finit au-dessus du bouton. */
const expectAboveFab = async (page: Page, last: Locator) => {
  await last.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 5000);
  await page.waitForTimeout(300);
  const fab = page
    .getByRole("button", { name: "Ajouter une opération ou un événement" })
    .filter({ visible: true });
  const fabBox = await fab.boundingBox();
  const lastBox = await last.boundingBox();
  expect(fabBox).not.toBeNull();
  expect(lastBox).not.toBeNull();
  // Écart d'au moins 16 px (`fabLayout.ts`) entre le contenu et le bouton.
  expect(lastBox!.y + lastBox!.height + 16).toBeLessThanOrEqual(fabBox!.y);
};

test("the last fixed budget card stays usable above the button", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: /Budget fixe/ }).click();
  const edits = page.getByRole("button", { name: /^Modifier / });
  await expect(edits.first()).toBeVisible();
  await expectAboveFab(page, edits.last());
});

test("the end of an envelope detail stays readable above the button", async ({
  page,
}) => {
  await signIn(page);
  await page
    .getByRole("button", { name: "Voir les dépenses de Alimentation (3)" })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Alimentation · / }),
  ).toBeVisible();
  await expectAboveFab(page, page.getByText(/^6 mois analysés/));
});
