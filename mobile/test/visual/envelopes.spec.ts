import { expect, Page, test } from "@playwright/test";

// Enveloppes budgétaires en lecture (#384), données de `serve-export.mjs`.
const signIn = async (page: Page) => {
  // Mois fixe : captures stables, comme les autres écrans datés.
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

const expectNoHorizontalOverflow = async (page: Page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
};

test("shows the month envelopes on the dashboard", async ({ page }) => {
  await signIn(page);
  const section = page.getByText("Mes enveloppes", { exact: true });
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();

  // Valeurs serveur, état écrit et pas seulement coloré.
  await expect(page.getByText(/^✓ 77,00\s€ disponibles$/)).toBeVisible();
  await expect(page.getByText(/^⚠ Dépassement de 33,00\s€$/)).toBeVisible();
  await expect(page.getByText(/^133\s%$/)).toBeVisible();
  const meters = page.getByRole("progressbar", { name: "Budget consommé" });
  await expect(meters).toHaveCount(2);
  // Jauge plafonnée à 100 %, valeur réelle écrite (133 %).
  await expect(meters.last()).toHaveAttribute("aria-valuenow", "100");
  await expect(meters.last()).toHaveAttribute("aria-valuetext", /^133\s%$/);

  const open = page.getByRole("button", {
    name: "Voir les dépenses de Alimentation (3)",
  });
  const box = await open.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);
  await expectNoHorizontalOverflow(page);
});

test("opens an envelope with its expenses and statistics", async ({ page }) => {
  await signIn(page);
  await page
    .getByRole("button", { name: "Voir les dépenses de Alimentation (3)" })
    .click();

  await expect(
    page.getByRole("heading", { name: /^Alimentation · / }),
  ).toBeVisible();
  // L'accueil reste monté sous le détail : aperçu de la carte et liste
  // complète du détail.
  await expect(
    page.getByRole("heading", { name: "Dépenses rattachées" }),
  ).toBeVisible();
  await expect(page.getByText("Intermarché", { exact: true })).toHaveCount(2);
  await expect(page.getByText("3 opérations rattachées.")).toBeVisible();
  await expect(
    page.getByText("Dépense réelle moyenne / mois", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/^Budget dépassé 4 mois sur 6/)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot("envelope-detail.png", {
    fullPage: true,
  });

  await page.getByRole("link", { name: "Retour aux enveloppes" }).click();
  await expect(
    page.getByText("Votre budget en un coup d’œil", { exact: true }),
  ).toBeVisible();
});

test("offers a retry when envelopes cannot be loaded", async ({ page }) => {
  let failing = true;
  await page.route(/\/v1\/envelope-overview\?/, (route) =>
    failing ? route.fulfill({ status: 503, json: {} }) : route.fallback(),
  );
  await signIn(page);
  const retry = page.getByRole("button", {
    name: "Réessayer les enveloppes",
  });
  await expect(retry).toBeVisible();
  failing = false;
  await retry.click();
  await expect(page.getByText(/^✓ 77,00\s€ disponibles$/)).toBeVisible();
});

test("explains an empty month", async ({ page }) => {
  await page.route(/\/v1\/envelope-overview\?/, (route) =>
    route.fulfill({
      json: { data: [], meta: { hasNext: false, limit: 20, nextCursor: null } },
    }),
  );
  await signIn(page);
  await expect(
    page.getByText("Pas encore d’enveloppe", { exact: true }),
  ).toBeVisible();
});

test("retries the next envelope page after a failure", async ({ page }) => {
  let nextAttempts = 0;
  await page.route(/\/v1\/envelope-overview\?/, async (route) => {
    const url = new URL(route.request().url());
    const all = (await (await route.fetch()).json()) as {
      data: { title: string }[];
    };
    if (url.searchParams.get("cursor") !== "p2") {
      return route.fulfill({
        json: {
          data: all.data.slice(0, 1),
          meta: { hasNext: true, limit: 20, nextCursor: "p2" },
        },
      });
    }
    nextAttempts += 1;
    if (nextAttempts === 1) return route.fulfill({ status: 503, json: {} });
    return route.fulfill({
      json: {
        data: all.data.slice(1),
        meta: { hasNext: false, limit: 20, nextCursor: null },
      },
    });
  });
  await signIn(page);

  const more = page.getByRole("button", {
    name: "Afficher la suite des enveloppes",
  });
  await more.click();
  await expect(
    page.getByText("La suite des enveloppes n’a pas pu être chargée."),
  ).toBeVisible();
  // Le même curseur reste relançable après l'échec.
  await more.click();
  await expect(page.getByText(/^⚠ Dépassement de 33,00\s€$/)).toBeVisible();
  await expect(more).toHaveCount(0);
  expect(nextAttempts).toBe(2);
});
