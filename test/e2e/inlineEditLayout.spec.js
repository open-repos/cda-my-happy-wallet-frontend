import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";

// #358: entering and leaving inline edit keeps the table geometry.
const operations = [
  {
    id: 1,
    title: "Courses",
    amount: "42.50",
    currency: "EUR",
    type: "DEPENSE",
    operationDate: "2026-08-18",
    categoryId: 4,
  },
  {
    id: 2,
    title: "Prime",
    amount: "125.00",
    currency: "EUR",
    type: "ENTREE",
    operationDate: "2026-08-17",
    categoryId: 4,
  },
];
const charge = {
  idOperationFixe: 7,
  titre: "Assurance habitation",
  montant: "120",
  devise: "EUR",
  periodicite: "ANNUELLE",
  pourcentagePersonnel: 50,
  montantPersonnel: "60.00",
  montantMensuelPersonnel: "5.00",
};
const income = {
  idOperationFixe: 8,
  titre: "Salaire",
  montant: "2400",
  devise: "EUR",
};

const geometry = (page, title) =>
  page.evaluate((name) => {
    const table = document.querySelector(".compact-money-table");
    const rows = [...table.querySelectorAll("tbody > tr")];
    const index = rows.findIndex(
      (row) =>
        row.classList.contains("compact-money-table__editor") ||
        row.querySelector("th")?.textContent.includes(name)
    );
    const row = rows[index].getBoundingClientRect();
    const next = rows[index + 1]?.getBoundingClientRect();
    return {
      height: Math.round(row.height),
      top: Math.round(row.top + scrollY),
      nextTop: next ? Math.round(next.top + scrollY) : null,
      columns: [...table.querySelectorAll("thead th")].map((th) =>
        Math.round(th.getBoundingClientRect().width)
      ),
      scrollWidth: document.documentElement.scrollWidth <= innerWidth,
    };
  }, title);
const sameGeometry = (after, before) => {
  // 4.5rem: one control line plus one reserved message line.
  expect(before.height).toBeLessThanOrEqual(73);
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.nextTop - before.nextTop)).toBeLessThanOrEqual(1);
  after.columns.forEach((width, i) =>
    expect(Math.abs(width - before.columns[i])).toBeLessThanOrEqual(1)
  );
  expect(after.scrollWidth).toBe(true);
};

// The visible cell message is complete, not cut by an ellipsis.
const expectReadableMessage = async (page, control, text) => {
  const message = page.locator(
    `#${await control.getAttribute("id")}-message .inline-cell__short`
  );
  await expect(message).toHaveText(text);
  await expect(message).toBeVisible();
  expect(
    await message.evaluate(
      (element) =>
        element.parentElement.scrollWidth <= element.parentElement.clientWidth
    )
  ).toBe(true);
};

const oneOffPage = async (page, bodies) => {
  await prepareProtectedPage(page);
  await page.route(/\/v1\/operations(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        data: operations,
        meta: { limit: 20, hasNext: false, nextCursor: null },
      },
    })
  );
  await page.route(/\/v1\/operations\/1$/, (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({
      json: { data: { ...operations[0], ...route.request().postDataJSON() } },
    });
  });
  await page.goto("/operations");
};
const fixedPage = async (page, writes) => {
  await prepareProtectedPage(page);
  await page.route(
    /\/v1\/operations-fixes\/(charges|revenus)(?:\/\d+)?(?:\?.*)?$/,
    (route) => {
      const request = route.request();
      if (request.method() === "PUT") {
        writes.push(request.postDataJSON());
        return route.fulfill({ json: { success: true, message: "Updated" } });
      }
      return route.fulfill({
        json: {
          data: request.url().includes("revenus") ? [income] : [charge],
          meta: { limit: 100, hasNext: false, nextCursor: null },
        },
      });
    }
  );
  await page.goto("/home/operations-fixes");
};

for (const width of [1024, 1440])
  for (const theme of ["light", "dark"]) {
    test(`one-off inline edit keeps the row geometry at ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("mhw-theme", value),
        theme
      );
      const bodies = [];
      await oneOffPage(page, bodies);
      const edit = page.getByRole("button", {
        name: "Modifier Courses",
        exact: true,
      });
      await expect(edit).toBeVisible();
      const before = await geometry(page, "Courses");
      await edit.click();
      const title = page.getByLabel("Titre", { exact: true });
      await expect(title).toBeFocused();
      sameGeometry(await geometry(page, "Courses"), before);

      // Secondary fields live behind « Plus d'options » in the table.
      await expect(page.getByLabel("Devise", { exact: true })).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Plus d’options" })
      ).toBeVisible();

      // Tab follows the columns, then the row actions. (The date input is
      // skipped: Chromium tabs through its day, month and year segments.)
      for (const name of ["Catégorie", "Type"]) {
        await page.keyboard.press("Tab");
        await expect(page.getByLabel(name, { exact: true })).toBeFocused();
      }
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Montant (EUR)")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("button", { name: "Enregistrer", exact: true })
      ).toBeFocused();

      // A validation error stays inside its cell.
      const amount = page.getByLabel("Montant (EUR)");
      await amount.fill("4,2,5");
      await amount.press("Enter");
      await expect(amount).toHaveAttribute("aria-invalid", "true");
      await expect(amount).toHaveAccessibleDescription(/par exemple 12,50/);
      await expectReadableMessage(page, amount, "Invalide, ex. 12,50");
      sameGeometry(await geometry(page, "Courses"), before);
      expect(bodies).toHaveLength(0);

      // Escape cancels without a write and returns focus to the row.
      await page.keyboard.press("Escape");
      await expect(edit).toBeFocused();
      expect(bodies).toHaveLength(0);
      sameGeometry(await geometry(page, "Courses"), before);

      // Enter from a select saves the row.
      await edit.click();
      await page.getByLabel("Montant (EUR)").fill("43,5");
      await page.getByLabel("Type", { exact: true }).press("Enter");
      await expect.poll(() => bodies.length).toBe(1);
      expect(bodies[0]).toMatchObject({ title: "Courses", amount: "43.50" });
    });

    test(`fixed inline edit keeps the row geometry at ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("mhw-theme", value),
        theme
      );
      const writes = [];
      await fixedPage(page, writes);
      const edit = page.getByRole("button", {
        name: "Modifier Assurance habitation",
      });
      await expect(edit).toBeVisible();
      const before = await geometry(page, "Assurance habitation");
      await edit.click();
      await expect(page.getByLabel("Titre de la charge")).toBeFocused();
      sameGeometry(await geometry(page, "Assurance habitation"), before);

      // The amount column edits the amount per instalment, with the
      // recomputed personal monthly amount in the reserved line.
      const amount = page.getByLabel("Montant total par échéance");
      await expect(amount).toHaveAttribute("inputmode", "decimal");
      await amount.fill("240");
      await expect(page.getByLabel("Aperçu mensuel personnel")).toHaveText(
        /10,00/
      );
      await expect(page.getByLabel("Ma part de la charge (%)")).toBeHidden();
      await expect(page.getByLabel("Devise de la charge")).toBeHidden();
      sameGeometry(await geometry(page, "Assurance habitation"), before);

      // Shared keyboard and error behaviour, on the fixed page too.
      const title = page.getByLabel("Titre de la charge");
      await title.fill("A");
      await title.press("Enter");
      await expect(title).toHaveAttribute("aria-invalid", "true");
      await expectReadableMessage(page, title, "2 à 50 caractères");
      sameGeometry(await geometry(page, "Assurance habitation"), before);
      await page.keyboard.press("Escape");
      await expect(edit).toBeFocused();
      expect(writes).toHaveLength(0);
      await edit.click();
      await page.getByLabel("Montant total par échéance").fill("240");

      // « Plus d'options » opens the full form with the row draft.
      await page.getByLabel("Titre de la charge").fill("Assurance maison");
      await page.getByRole("button", { name: "Plus d’options" }).click();
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", { name: "Modifier un élément fixe" })
      ).toBeVisible();
      await expect(dialog.getByLabel(/^Titre/)).toHaveValue("Assurance maison");
      await expect(dialog.getByLabel(/Montant total/)).toHaveValue("240");
      await expect(dialog.getByLabel(/Ma part/)).toBeVisible();
      expect(writes).toHaveLength(0);
    });
  }

test("mobile keeps editing in the card with visible labels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await oneOffPage(page, []);
  await page
    .getByRole("button", { name: "Modifier Courses", exact: true })
    .click();
  const editor = page.locator(".compact-money-table__editor");
  for (const name of ["Date", "Titre", "Devise"])
    await expect(
      editor.locator("label").filter({ hasText: new RegExp(`^${name}`) })
    ).toBeVisible();
  await expect(page.getByLabel("Devise", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Plus d’options" })
  ).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
});

test("one-off « Plus d’options » opens the full form with the row draft", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const bodies = [];
  await oneOffPage(page, bodies);
  await page
    .getByRole("button", { name: "Modifier Courses", exact: true })
    .click();
  await page.getByLabel("Titre", { exact: true }).fill("Courses bio");
  await page.getByLabel("Montant (EUR)").fill("44,10");
  await page.getByRole("button", { name: "Plus d’options" }).click();
  await expect(
    page.getByRole("heading", { name: "Modifier l’opération" })
  ).toBeVisible();
  await expect(page.locator(".compact-money-table__editor")).toHaveCount(0);
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue(
    "Courses bio"
  );
  await expect(page.getByLabel(/^Montant/)).toHaveValue("44,10");
  await expect(page.getByRole("combobox", { name: /^Devise/ })).toBeVisible();
  expect(bodies).toHaveLength(0);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toMatchObject({ title: "Courses bio", amount: "44.10" });
});
