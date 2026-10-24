import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
const signIn = async (page: Page) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("happy@example.test");
  await page
    .getByRole("textbox", { name: "Mot de passe", exact: true })
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(
    page.getByText("Votre budget en un coup d’œil", { exact: true }),
  ).toBeVisible();
};
test("quick add keeps the selected day, income direction and failed draft without duplicate writes", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-18T10:00:00Z"));
  await signIn(page);
  await page.getByRole("tab", { name: "Calendrier" }).click();
  await page.getByRole("button", { name: /^3 .* Dépenses 42,50/ }).click();
  const trigger = page.getByRole("button", {
    name: /^Ajouter le 3 octobre 2026/,
  });
  await trigger.click();
  await page.getByRole("button", { name: /^Entrée Opération réelle/ }).click();
  await expect(
    page.getByRole("button", { name: /^Date : 3 octobre 2026/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Entrée", exact: true }),
  ).toBeChecked();
  await page.getByLabel("Titre", { exact: true }).fill("Prime");
  await page.getByLabel("Montant en euros", { exact: true }).fill("125");
  await page.getByRole("radio", { name: "Alimentation", exact: true }).click();
  let writes = 0;
  await page.route("**/v1/operations", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    writes++;
    expect(route.request().postDataJSON()).toMatchObject({
      operationDate: "2026-10-03",
      kind: "ENTREE",
      amount: "125.00",
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    return route.fulfill({ status: 422, json: { message: "Invalid" } });
  });
  await page
    .getByRole("button", { name: "Enregistrer", exact: true })
    .evaluate((element) => {
      (element as HTMLElement).click();
      (element as HTMLElement).click();
    });
  await expect(
    page.getByText(/L’ajout n’a pas pu être enregistré/),
  ).toBeVisible();
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue("Prime");
  expect(writes).toBe(1);
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(writes).toBe(1);
  await trigger.click();
  await page
    .getByRole("button", { name: /^Événement à confirmer Simulation/ })
    .click();
  await expect(
    page.getByRole("button", { name: /^Date de début : 3 octobre 2026/ }),
  ).toBeVisible();
  await page.getByLabel("Titre", { exact: true }).fill("Voyage fictif");
  await page.getByLabel("Montant en euros", { exact: true }).fill("100");
  let events = 0;
  await page.route("**/v1/events", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    events++;
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      status: "POTENTIEL",
      startDate: "2026-10-03",
      recurrence: "AUCUNE",
    });
    return route.fulfill({ status: 201, json: { data: { id: 99, ...body } } });
  });
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(
    page.getByText("Opérations du 3 octobre 2026", { exact: true }),
  ).toBeVisible();
  expect(events).toBe(1);
  expect(writes).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("floating creation is limited to phone width and exposes four clear choices", async ({
  page,
}) => {
  await signIn(page);
  const fab = page.getByRole("button", {
    name: "Ajouter une opération ou un événement",
  });
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await expect(fab).toHaveCount(0);
    return;
  }
  await expect(fab).toBeVisible();
  const box = await fab.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await fab.click();
  await expect(
    page.getByRole("button", { name: /^Dépense Opération réelle/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Entrée Opération réelle/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Événement confirmé Prévu/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Événement à confirmer Simulation/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(fab).toBeFocused();
});

test("quick addition refreshes the visible dashboard summary without replaying the write", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) >= 768,
    "Global floating creation is limited to phone width",
  );
  let reads = 0,
    writes = 0;
  await page.route(
    /\/v1\/budget-periods\/[^/]+\/summary(?:\?.*)?$/,
    (route) => {
      reads++;
      return route.fallback();
    },
  );
  await signIn(page);
  await expect.poll(() => reads).toBeGreaterThan(0);
  const before = reads;
  const fab = page.getByRole("button", {
    name: "Ajouter une opération ou un événement",
  });
  await fab.click();
  await page.getByRole("button", { name: /^Dépense Opération réelle/ }).click();
  await page
    .getByLabel("Titre", { exact: true })
    .fill("Courses supplémentaires");
  await page.getByLabel("Montant en euros", { exact: true }).fill("10");
  await page.getByRole("radio", { name: "Alimentation", exact: true }).click();
  await page.route("**/v1/operations", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    writes++;
    const body = route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      json: { data: { id: 99, ...body, type: body.kind } },
    });
  });
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect.poll(() => reads).toBeGreaterThan(before);
  await expect(fab).toBeFocused();
  expect(writes).toBe(1);
});
