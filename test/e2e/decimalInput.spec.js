import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";

// A French mobile keyboard offers a comma: the browser must send a dot amount.
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`inline amount accepts comma and dot at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page);
    const bodies = [];
    await page.route(/\/v1\/operations\/1$/, (route) => {
      const body = route.request().postDataJSON();
      bodies.push(body);
      return route.fulfill({
        json: {
          data: {
            id: 1,
            title: "Courses",
            amount: body.amount,
            currency: "EUR",
            type: "DEPENSE",
            operationDate: "2026-08-18",
            categoryId: 4,
          },
        },
      });
    });
    await page.goto("/operations");
    const edit = () =>
      page
        .getByRole("button", { name: "Modifier Courses", exact: true })
        .click();

    await edit();
    const amount = page.getByLabel("Montant (EUR)");
    await expect(amount).toHaveAttribute("inputmode", "decimal");
    await amount.fill("43,5,0");
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(amount).toHaveAttribute("aria-invalid", "true");
    await expect(amount).toHaveAccessibleDescription(/par exemple 12,50/);
    expect(bodies).toHaveLength(0);

    for (const [index, [typed, sent]] of [
      ["43,5", "43.50"],
      ["43.5", "43.50"],
    ].entries()) {
      if (index > 0) await edit();
      await amount.fill(typed);
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect.poll(() => bodies.at(-1)?.amount).toBe(sent);
      await expect(amount).toBeHidden();
    }
    expect(bodies).toHaveLength(2);
  });
}
