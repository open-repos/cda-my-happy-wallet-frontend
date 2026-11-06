import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const signIn = async (page: Page) => {
  await page.clock.setFixedTime(new Date("2026-10-11T10:00:00+02:00"));
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("happy@example.test");
  await page
    .getByRole("textbox", { exact: true, name: "Mot de passe" })
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Votre budget en un coup d’œil")).toBeVisible();
};

test("exposes the calendar day filter as a toggle button", async ({ page }) => {
  await signIn(page);
  await page.getByRole("tab", { name: "Calendrier" }).click();
  const third = page.getByRole("button", { name: /^3 / });
  const fourth = page.getByRole("button", { name: /^4 / });
  await expect(third).toHaveAttribute("aria-pressed", "false");
  await expect(third).not.toHaveAttribute("aria-selected");
  await third.click();
  await expect(third).toHaveAttribute("aria-pressed", "true");
  await fourth.click();
  await expect(third).toHaveAttribute("aria-pressed", "false");
  await expect(fourth).toHaveAttribute("aria-pressed", "true");
  await fourth.click();
  await expect(fourth).toHaveAttribute("aria-pressed", "false");
});

test("exposes the selected operation date as a toggle button", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("tab", { name: "Opérations ponctuelles" }).click();
  await page.getByRole("button", { name: "Ajouter une opération" }).click();
  const dateField = page.getByRole("button", { name: /^Date :/ });
  await dateField.click();
  const today = page.getByRole("button", {
    name: "11 octobre 2026",
    exact: true,
  });
  const nextDay = page.getByRole("button", {
    name: "12 octobre 2026",
    exact: true,
  });
  await expect(today).toHaveAttribute("aria-pressed", "true");
  await expect(nextDay).toHaveAttribute("aria-pressed", "false");
  await expect(today).not.toHaveAttribute("aria-selected");
  await nextDay.click();
  await dateField.click();
  await expect(today).toHaveAttribute("aria-pressed", "false");
  await expect(nextDay).toHaveAttribute("aria-pressed", "true");
});

test("exposes calendar loading and completion with aria-busy", async ({
  page,
}) => {
  await signIn(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/budget-periods/*/summary?*", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.getByRole("tab", { name: "Calendrier" }).click();
    const calendar = page.locator("[aria-busy]").filter({
      has: page.getByRole("button", { name: /^3 / }),
    });
    await expect(calendar).toHaveAttribute("aria-busy", "true");
    release();
    await expect(calendar).toHaveAttribute("aria-busy", "false");
  } finally {
    release();
  }
});

test("exposes conversion saving and recovery with aria-busy", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("tab", { name: "Calendrier" }).click();
  await page
    .getByRole("button", { name: /^Convertir Loyer du 5 octobre/ })
    .click();
  await page.getByRole("radio", { name: "Alimentation" }).click();
  const save = page.getByRole("button", { name: "Enregistrer l’opération" });
  await expect(save).toHaveAttribute("aria-busy", "false");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/event-occurrences/*/*/realize", async (route) => {
    await gate;
    await route.fulfill({
      status: 503,
      json: { error: { message: "Unavailable" } },
    });
  });
  try {
    await save.click();
    await expect(save).toHaveAttribute("aria-busy", "true");
    await expect(save).toBeDisabled();
    release();
    await expect(save).toHaveAttribute("aria-busy", "false");
    await expect(save).toBeEnabled();
  } finally {
    release();
  }
});
