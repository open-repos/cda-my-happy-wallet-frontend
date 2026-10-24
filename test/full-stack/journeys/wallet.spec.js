import {
  fixedOperationItem,
  openFixedActions,
} from "../../e2e/fixedOperationsActions.mjs";
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
    .fill(`${project}-${journey}@example.com`);
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
  await expect(
    page.getByRole("button", { name: "Ouvrir le menu", exact: true })
  ).toBeVisible();
}

async function navigate(page, name) {
  const link = page.getByRole("link", { name, exact: true });
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
  // Région live toujours montée (#151) : le message y est annoncé, la copie
  // visible est masquée aux lecteurs d'écran.
  await expect(
    page.getByRole("status").filter({ hasText: "Événement ajouté." })
  ).toHaveCount(1);
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

test("keeps potential events out of real balances, confirms them and clears only the simulation", async ({
  page,
}, testInfo) => {
  await login(page, testInfo.project.name, "simulation");
  await navigate(page, "Calendrier");
  await expect(realBalance(page)).toHaveText(/1\s*200,00\s*€/);
  await expect(forecastBalance(page)).toHaveText(/1\s*200,00\s*€/);
  await page
    .getByRole("button", { name: "Ajouter un élément potentiel", exact: true })
    .click();
  await expect(page.getByLabel("Date de début", { exact: true })).toHaveValue(
    today()
  );
  await page.getByLabel("Titre", { exact: true }).fill("Voyage potentiel E2E");
  await page.getByLabel(/^Montant/).fill("300.00");
  const created = apiResponse(page, "/v1/events", "POST");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const event = (await response.json()).data;
  expect(event.status).toBe("POTENTIEL");
  await expect(
    page.getByRole("button", {
      name: "Confirmer Voyage potentiel E2E",
      exact: true,
    })
  ).toBeVisible();
  await expect(forecastBalance(page)).toHaveText(/1\s*200,00\s*€/);
  await page.getByRole("switch", { name: "Simulation", exact: true }).check();
  await expect(forecastBalance(page)).toHaveText(/900,00\s*€/);
  await expect(realBalance(page)).toHaveText(/1\s*200,00\s*€/);
  await navigate(page, "Accueil");
  const capacity = page.getByRole("region", {
    name: "Capacité d’épargne",
    exact: true,
  });
  const allowance = capacity
    .getByText("Disponible par mois après objectifs", { exact: true })
    .locator("..");
  await expect(allowance).toContainText(/900,00\s*€/);
  await page.getByRole("switch", { name: "Simulation", exact: true }).uncheck();
  await expect(allowance).toContainText(/1\s*200,00\s*€/);
  await page
    .getByRole("link", { name: "Voir les prochains mois", exact: true })
    .click();
  await page.getByRole("switch", { name: "Simulation", exact: true }).check();
  await page
    .getByRole("button", {
      name: "Confirmer Voyage potentiel E2E",
      exact: true,
    })
    .click();
  const confirmed = apiResponse(page, `/v1/events/${event.id}/confirm`, "POST");
  await page
    .getByRole("button", { name: "Oui, confirmer", exact: true })
    .click();
  const confirmation = await confirmed;
  expect(confirmation.status()).toBe(200);
  expect((await confirmation.json()).data.status).toBe("CONFIRME");
  await expect(
    page.getByText("Votre simulation est vide.", { exact: true })
  ).toBeVisible();
  await page.getByRole("switch", { name: "Simulation", exact: true }).uncheck();
  const firstRow = page
    .getByRole("table", { name: "Prévisions mensuelles" })
    .getByRole("row")
    .nth(1);
  await expect(firstRow).toContainText(/900,00\s*€/);
  await page
    .getByRole("button", { name: "Ajouter un élément potentiel", exact: true })
    .click();
  await page
    .getByLabel("Titre", { exact: true })
    .fill("Matériel potentiel E2E");
  await page.getByLabel(/^Montant/).fill("50.00");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page
    .getByRole("button", { name: "Vider la simulation", exact: true })
    .click();
  const cleared = apiResponse(page, "/v1/simulation/events", "DELETE");
  await page
    .getByRole("button", { name: "Oui, vider la simulation", exact: true })
    .click();
  expect((await cleared).status()).toBe(204);
  await expect(
    page.getByText("Votre simulation est vide.", { exact: true })
  ).toBeVisible();
  await expect(firstRow).toContainText(/900,00\s*€/);
  await page
    .getByRole("main")
    .getByRole("link", { name: "Calendrier", exact: true })
    .click();
  await expect(realBalance(page)).toHaveText(/1\s*200,00\s*€/);
  await expect(forecastBalance(page)).toHaveText(/900,00\s*€/);
  await expect(
    page.getByRole("button", { name: /^Convertir Voyage potentiel E2E/ })
  ).toBeVisible();
});

test("shows invalid credentials and recovers from a failed API read", async ({
  page,
}, testInfo) => {
  await page.goto("/login");
  await page
    .getByPlaceholder("Entrez votre email")
    .fill(`${testInfo.project.name}-recovery@example.com`);
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

// These checks inspect computed browser styles, rather than token values alone.
async function contrast(locator, kind = "text") {
  return locator.evaluate((element, kind) => {
    const parse = (value) => value.match(/[\d.]+/g).map(Number);
    const blend = (front, back) =>
      front
        .slice(0, 3)
        .map(
          (value, i) =>
            value * (front[3] ?? 1) + back[i] * (1 - (front[3] ?? 1))
        );
    const background = (node) => {
      if (!node) return [255, 255, 255];
      return blend(
        parse(getComputedStyle(node).backgroundColor),
        background(node.parentElement)
      );
    };
    const luminance = (rgb) =>
      rgb
        .slice(0, 3)
        .map((value) => value / 255)
        .map((value) =>
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        )
        .reduce(
          (sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i],
          0
        );
    const style = getComputedStyle(
      element,
      kind === "placeholder" ? "::placeholder" : null
    );
    const back = background(kind === "focus" ? element.parentElement : element);
    const front = blend(
      parse(kind === "focus" ? style.outlineColor : style.color),
      back
    );
    const [high, low] = [luminance(front), luminance(back)].sort(
      (a, b) => b - a
    );
    if (
      kind === "focus" &&
      (style.outlineStyle === "none" || parseFloat(style.outlineWidth) === 0)
    )
      return 0;
    return (high + 0.05) / (low + 0.05);
  }, kind);
}

for (const theme of ["light", "dark"]) {
  test(`public forms support keyboard, contrast and text zoom (${theme})`, async ({
    page,
  }) => {
    await page.addInitScript(
      (theme) => localStorage.setItem("mhw-theme", theme),
      theme
    );
    const viewport = page.viewportSize();
    for (const path of [
      "/login",
      "/register",
      "/forgot-password",
      "/new-password",
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(path);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", {
        name: "Aller au contenu principal",
      });
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport();
      expect(await contrast(skip)).toBeGreaterThanOrEqual(4.5);
      await page.keyboard.press("Enter");
      await expect(page.locator("#main-content")).toBeFocused();
      const fields = page.locator("main input");
      for (const field of await fields.all()) {
        const id = await field.getAttribute("id");
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
        expect(await field.getAttribute("autocomplete")).toBeTruthy();
        expect(await contrast(label)).toBeGreaterThanOrEqual(4.5);
        expect(await contrast(field)).toBeGreaterThanOrEqual(4.5);
        expect(await contrast(field, "placeholder")).toBeGreaterThanOrEqual(
          4.5
        );
      }
      // Reach each control by Tab, including inputs, links and submit.
      const controls = page.locator("main input, main a, main button");
      const count = await controls.count();
      for (let i = 0; i < count; i += 1) {
        await page.keyboard.press("Tab");
        const control = controls.nth(i);
        await expect(control).toBeFocused();
        expect(await contrast(control, "focus")).toBeGreaterThanOrEqual(3);
      }
      const button = page.locator("main button[type='submit']");
      expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);
      await button.hover();
      expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);
      for (const link of await page.locator("main a").all()) {
        await link.hover();
        expect(await contrast(link)).toBeGreaterThanOrEqual(4.5);
      }
      await page.setViewportSize({ width: 320, height: 800 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
      for (const control of await controls.all()) {
        await control.scrollIntoViewIfNeeded();
        const box = await control.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width).toBeLessThanOrEqual(321);
      }
      await button.focus();
      await expect(button).toBeInViewport();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1
        )
      ).toBe(true);
    }
  });

  test(`protected routes expose landmarks and restore form focus (${theme})`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(
      (theme) => localStorage.setItem("mhw-theme", theme),
      theme
    );
    await login(page, testInfo.project.name, "recovery");
    for (const [name, title] of [
      ["Calendrier", "Calendrier"],
      ["Accueil", "Tableau de bord"],
      ["Objectifs-Évènements", "Objectifs et événements"],
      ["Liste Opérations", "Opérations"],
      ["Catégories", "Catégories"],
      ["Analyses", "Analyses"],
    ]) {
      await navigate(page, name);
      await expect(page).toHaveTitle(`${title} | My Happy Wallet`);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.locator("#main-content")).toHaveCount(1);
      await expect(page.locator("#main-content")).toBeFocused();
      await expect(page.locator("nav a img:not([alt=''])")).toHaveCount(0);
    }
    await navigate(page, "Liste Opérations");
    const add = page.getByRole("button", {
      name: "Ajouter une opération",
      exact: true,
    });
    await expect(add).toBeEnabled();
    await add.focus();
    await expect(add).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel(/^Titre/)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(add).toBeFocused();
    await page.reload();
    await expect(add).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Aller au contenu principal" })
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });
}

test("persists periodic shared fixed charges and refreshes server budgets without duplicate events", async ({
  page,
}, testInfo) => {
  await login(page, testInfo.project.name, "fixed-charges");
  const unexpectedWrites = [];
  page.on("request", (request) => {
    if (
      ["POST", "PUT", "DELETE", "PATCH"].includes(request.method()) &&
      /\/v1\/(?:operations(?:\/|$)|events(?:\/|$)|event-occurrences(?:\/|$))/.test(
        new URL(request.url()).pathname
      )
    )
      unexpectedWrites.push(request.method());
  });
  await page.goto("/home/operations-fixes");
  await page
    .getByText("Voir le reste à vivre du mois", { exact: true })
    .click();
  const budget = page.getByRole("region", {
    name: "Reste à vivre du mois en euros",
  });
  await expect(budget.locator(".fixed-budget-amount")).toHaveText(/1\s*200,00/);
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await page.getByRole("radio", { name: "Entrée", exact: true }).check();
  await page.getByLabel("Titre de l’entrée").fill("Entrée mensuelle E2E");
  await page.getByLabel("Montant reçu par mois").fill("200");
  await page
    .getByRole("combobox", { name: "Catégorie", exact: true })
    .selectOption({ label: "Salaires" });
  const incomeCreated = apiResponse(
    page,
    "/v1/operations-fixes/revenus",
    "POST"
  );
  await page.getByRole("button", { name: "Enregistrer l’entrée" }).click();
  const incomeResponse = await incomeCreated;
  expect(incomeResponse.status()).toBe(201);
  const income = (await incomeResponse.json()).data;
  expect(income.category).toMatchObject({
    name: "Salaires",
    icon: "solid:money-bill-wave",
    fixedKind: "REVENU",
  });
  expect(income.categoryId).toBe(income.category.id);
  await expect(budget.locator(".fixed-budget-amount")).toHaveText(/1\s*400,00/);
  await openFixedActions(page, "Entrée mensuelle E2E");
  await page
    .getByRole("button", { name: "Modifier Entrée mensuelle E2E" })
    .click();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.getByLabel("Montant reçu par mois").fill("250");
  const incomeUpdated = apiResponse(
    page,
    `/v1/operations-fixes/revenus/${income.idOperationFixe}`,
    "PUT"
  );
  await page.getByRole("button", { name: "Enregistrer l’entrée" }).click();
  expect((await incomeUpdated).ok()).toBe(true);
  await expect(budget.locator(".fixed-budget-amount")).toHaveText(/1\s*450,00/);
  await openFixedActions(page, "Entrée mensuelle E2E");
  await page
    .getByRole("button", { name: "Supprimer Entrée mensuelle E2E" })
    .click();
  const incomeDeleted = apiResponse(
    page,
    `/v1/operations-fixes/revenus/${income.idOperationFixe}`,
    "DELETE"
  );
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  expect((await incomeDeleted).ok()).toBe(true);
  await expect(budget.locator(".fixed-budget-amount")).toHaveText(/1\s*200,00/);
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await page
    .getByLabel("Titre de la charge")
    .fill("Abonnement annuel partagé E2E");
  await page.getByLabel("Montant total par échéance").fill("120");
  await page
    .getByRole("combobox", { name: "Périodicité", exact: true })
    .selectOption("ANNUELLE");
  await page.getByLabel("Ma part de la charge (%)").fill("50");
  await page
    .getByRole("combobox", { name: "Catégorie", exact: true })
    .selectOption({ label: "Assurances" });
  await expect(
    page.getByRole("region", { name: "Aperçu de la charge" })
  ).toContainText(/5,00/);
  const created = apiResponse(page, "/v1/operations-fixes/charges", "POST");
  await page.getByRole("button", { name: "Enregistrer la charge" }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const charge = (await response.json()).data;
  expect(charge).toMatchObject({
    periodicite: "ANNUELLE",
    pourcentagePersonnel: 50,
    montantMensuelPersonnel: "5.00",
  });
  expect(Number(charge.montant)).toBe(120);
  expect(charge.category).toMatchObject({
    name: "Assurances",
    icon: "solid:shield-halved",
    fixedKind: "CHARGE",
  });
  expect(charge.categoryId).toBe(charge.category.id);
  await expect(budget.locator(".fixed-budget-amount")).toHaveText(/1\s*195,00/);
  await page.reload();
  await page
    .getByText("Voir le reste à vivre du mois", { exact: true })
    .click();
  await openFixedActions(page, "Abonnement annuel partagé E2E");
  await page
    .getByRole("button", { name: "Modifier Abonnement annuel partagé E2E" })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Périodicité", exact: true })
  ).toHaveValue("ANNUELLE");
  await expect(page.getByLabel("Ma part de la charge (%)")).toHaveValue("50");
  await expect(
    page.getByRole("combobox", { name: "Catégorie", exact: true })
  ).toHaveValue(String(charge.categoryId));
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await page.getByRole("link", { name: /Revenir à la page d'accueil/ }).click();
  await expect(page.locator(".home-budget__amount")).toHaveText(/1\s*195,00/);
  await navigate(page, "Calendrier");
  await expect(realBalance(page)).toHaveText(/1\s*195,00/);
  const forecastResponse = apiResponse(page, "/v1/budget-forecast", "GET");
  await navigate(page, "Prochains mois");
  expect(
    (await (await forecastResponse).json()).data.months[0].fixedExpense
  ).toBe("805.00");
  const forecast = page.getByRole("table", { name: "Prévisions mensuelles" });
  await expect(forecast.getByRole("row").nth(1)).toContainText(/1\s*195,00/);
  await page.goto("/home/operations-fixes");
  await page
    .getByText("Voir le reste à vivre du mois", { exact: true })
    .click();
  await openFixedActions(page, "Abonnement annuel partagé E2E");
  await page
    .getByRole("button", { name: "Modifier Abonnement annuel partagé E2E" })
    .click();
  await page.getByLabel("Ma part de la charge (%)").fill("40");
  const updated = apiResponse(
    page,
    `/v1/operations-fixes/charges/${charge.idOperationFixe}`,
    "PUT"
  );
  await page.getByRole("button", { name: "Enregistrer la charge" }).click();
  expect((await updated).ok()).toBe(true);
  await expect(budget.locator(".fixed-budget-amount")).toHaveText(/1\s*196,00/);
  await page.reload();
  await page
    .getByText("Voir le reste à vivre du mois", { exact: true })
    .click();
  await expect(
    fixedOperationItem(page, "Abonnement annuel partagé E2E")
  ).toContainText(/4,00/);
  await openFixedActions(page, "Abonnement annuel partagé E2E");
  await page
    .getByRole("button", { name: "Supprimer Abonnement annuel partagé E2E" })
    .click();
  const deleted = apiResponse(
    page,
    `/v1/operations-fixes/charges/${charge.idOperationFixe}`,
    "DELETE"
  );
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  expect((await deleted).ok()).toBe(true);
  await expect(budget.locator(".fixed-budget-amount")).toHaveText(/1\s*200,00/);
  await page.reload();
  await page
    .getByText("Voir le reste à vivre du mois", { exact: true })
    .click();
  await expect(
    fixedOperationItem(page, "Abonnement annuel partagé E2E")
  ).toHaveCount(0);
  expect(unexpectedWrites).toEqual([]);
});
