import { expect, test } from "@playwright/test";

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

test.beforeEach(async ({ context }) => {
  // No remote API, analytics, mail, fonts or other third-party requests.
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.origin === "http://127.0.0.1:4175"
      ? route.continue()
      : route.abort("blockedbyclient");
  });
});

async function login(page, project, journey) {
  await page.goto("/login");
  await page
    .getByPlaceholder("Entrez votre email")
    .fill(`${project}-${journey}@example.test`);
  await page
    .getByPlaceholder("Entrez mot de passe")
    .fill(process.env.E2E_PASSWORD);
  const authenticated = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/v1/users/authenticate/" &&
      response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Connexion", exact: true }).click();
  expect((await authenticated).status()).toBe(200);
  await expect(page).toHaveURL(/\/(?:home|operations)$/);
  await expect(page.locator("main")).toBeVisible();
}

async function navigate(page, name) {
  const link = page.getByRole("link", { name });
  if (!(await link.isVisible()))
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await link.click();
}

const realBalance = (page) =>
  page
    .getByRole("article", { name: "Reste réel", exact: true })
    .locator(".budget-card__value");
const forecastBalance = (page) =>
  page
    .getByRole("article", { name: "Reste prévisionnel", exact: true })
    .locator(".budget-card__value");
const apiResponse = (page, path, method) =>
  page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === path &&
      response.request().method() === method
  );

test("persists operation CRUD and recalculates the calendar budget", async ({
  page,
}, testInfo) => {
  await page.goto("/operations");
  await expect(page).toHaveURL(/\/login$/);
  await login(page, testInfo.project.name, "operations");
  await navigate(page, "Liste Opérations");
  await expect(
    page.getByRole("heading", { name: "Pas encore d’opération" })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ajouter une opération", exact: true })
    .click();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(
    page.getByText("Le titre doit contenir entre 2 et 50 caractères.")
  ).toBeVisible();
  await page.getByLabel(/^Titre/).fill("Courses E2E");
  await page.getByLabel(/^Montant/).fill("42.50");
  await page.getByLabel(/^Date/).fill(today());
  await page.getByLabel(/^Catégorie/).selectOption({ label: "Courant" });
  const created = apiResponse(page, "/v1/operations", "POST");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const creation = await created;
  expect(creation.status()).toBe(201);
  const operationId = (await creation.json()).data.id;
  await expect(page.getByRole("row", { name: /Courses E2E/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("row", { name: /Courses E2E/ })).toBeVisible();
  await navigate(page, "Calendrier");
  await expect(realBalance(page)).toHaveText(/1\s*157,50\s*€/);
  await expect(page.getByText("Courses E2E", { exact: true })).toBeVisible();
  await navigate(page, "Liste Opérations");
  await page
    .getByRole("button", { name: "Modifier Courses E2E", exact: true })
    .click();
  await page.getByLabel(/^Montant/).fill("50.00");
  const updated = apiResponse(page, `/v1/operations/${operationId}`, "PUT");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  expect((await updated).ok()).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Modifier l’opération" })
  ).toHaveCount(0);
  await navigate(page, "Calendrier");
  await expect(realBalance(page)).toHaveText(/1\s*150,00\s*€/);
  await navigate(page, "Liste Opérations");
  await page
    .getByRole("button", { name: "Modifier Courses E2E", exact: true })
    .click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  const deleted = apiResponse(page, `/v1/operations/${operationId}`, "DELETE");
  await page
    .getByRole("button", { name: "Oui, supprimer", exact: true })
    .click();
  expect((await deleted).ok()).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Pas encore d’opération" })
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("row", { name: /Courses E2E/ })).toHaveCount(0);
  await navigate(page, "Calendrier");
  await expect(realBalance(page)).toHaveText(/1\s*200,00\s*€/);
});

test("converts a planned event into a persisted operation without counting it twice", async ({
  page,
}, testInfo) => {
  await login(page, testInfo.project.name, "events");
  await navigate(page, "Objectifs-Évènements");
  await expect(
    page.getByRole("heading", { name: "Aucun événement prévu" })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ajouter un événement", exact: true })
    .click();
  await page.getByLabel(/^Titre/).fill("Assurance E2E");
  await page.getByLabel(/^Montant/).fill("120.00");
  await page.getByLabel("Date de début", { exact: true }).fill(today());
  const created = apiResponse(page, "/v1/events", "POST");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  expect((await created).status()).toBe(201);
  await expect(page.getByText("Événement ajouté.")).toBeVisible();
  await navigate(page, "Calendrier");
  await expect(realBalance(page)).toHaveText(/1\s*200,00\s*€/);
  await expect(forecastBalance(page)).toHaveText(/1\s*080,00\s*€/);
  await page.getByRole("button", { name: /^Convertir Assurance E2E/ }).click();
  await page.getByLabel(/^Catégorie/).selectOption({ label: "Courant" });
  const realized = page.waitForResponse((response) =>
    /\/event-occurrences\/\d+\/\d{4}-\d{2}-\d{2}\/realize$/.test(
      new URL(response.url()).pathname
    )
  );
  await page
    .getByRole("button", { name: "Enregistrer l’opération", exact: true })
    .click();
  expect((await realized).status()).toBe(201);
  await expect(realBalance(page)).toHaveText(/1\s*080,00\s*€/);
  await expect(forecastBalance(page)).toHaveText(/1\s*080,00\s*€/);
  await expect(
    page.getByRole("button", { name: /^Convertir Assurance E2E/ })
  ).toHaveCount(0);
  await page.reload();
  await expect(realBalance(page)).toHaveText(/1\s*080,00\s*€/);
  await expect(
    page.getByRole("button", { name: /^Convertir Assurance E2E/ })
  ).toHaveCount(0);
  await navigate(page, "Liste Opérations");
  await expect(page.getByRole("row", { name: /Assurance E2E/ })).toHaveCount(1);
});

test("shows invalid credentials and recovers from a failed API read", async ({
  page,
}, testInfo) => {
  await page.goto("/login");
  await page
    .getByPlaceholder("Entrez votre email")
    .fill(`${testInfo.project.name}-recovery@example.test`);
  await page
    .getByPlaceholder("Entrez mot de passe")
    .fill("incorrect-e2e-password");
  const refused = apiResponse(page, "/v1/users/authenticate/", "POST");
  await page.getByRole("button", { name: "Connexion", exact: true }).click();
  expect((await refused).status()).toBe(401);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, testInfo.project.name, "recovery");
  // Only this controlled transport failure is injected; successful reads/writes
  // in every journey reach the real API and disposable MySQL database.
  const pattern = /\/v1\/operations(?:\?.*)?$/;
  await page.route(pattern, (route) => route.abort("failed"));
  await navigate(page, "Liste Opérations");
  await expect(
    page.getByRole("heading", {
      name: "La liste est momentanément indisponible",
    })
  ).toBeVisible();
  await page.unroute(pattern);
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pas encore d’opération" })
  ).toBeVisible();
});

test("renews a browser session with a real rotating HttpOnly cookie and logs out locally", async ({
  page,
  context,
}, testInfo) => {
  await login(page, testInfo.project.name, "session");
  const before = (await context.cookies()).find(
    (cookie) => cookie.name === "refresh_token"
  );
  expect(Boolean(before?.value)).toBe(true);
  expect(before.httpOnly).toBe(true);
  const exp = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem(JSON.stringify("user")));
    return JSON.parse(
      atob(
        stored.payload.accessToken
          .split(".")[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/")
      )
    ).exp;
  });
  // Expire the access token on the client clock only. The real API issues the
  // renewed five-minute token and rotates its persisted refresh session.
  await page.clock.setFixedTime(new Date((exp + 1) * 1000));
  const renewed = apiResponse(page, "/v1/token", "POST");
  await navigate(page, "Liste Opérations");
  expect((await renewed).status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Pas encore d’opération" })
  ).toBeVisible();
  const after = (await context.cookies()).find(
    (cookie) => cookie.name === "refresh_token"
  );
  expect(Boolean(after?.value && after.value !== before.value)).toBe(true);
  expect(after.httpOnly).toBe(true);
  await page.clock.setFixedTime(new Date());
  const profile = page.getByRole("button", {
    name: "Afficher le profil",
    exact: true,
  });
  if (!(await profile.isVisible()))
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await profile.click();
  await page
    .getByRole("button", { name: "Se déconnecter", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(
      () => localStorage.getItem(JSON.stringify("user")) === null
    )
  ).toBe(true);
  await page.goto("/operations");
  await expect(page).toHaveURL(/\/login$/);
});
