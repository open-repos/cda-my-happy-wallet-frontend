import { expect, Page, Route, test } from "@playwright/test";

// Coffre mobile (#419) : contrat `savings-accounts.md` du backend #183,
// simulé avec un état par test (les écritures modifient ce que relit l'écran).
interface Account {
  id: number;
  name: string;
  currency: string;
  initialBalanceMinorUnits: number;
  balanceMinorUnits: number;
  archived: boolean;
  goalId: number | null;
}
interface Movement {
  id: number;
  accountId: number;
  currency: string;
  type: "VIREMENT";
  direction: string;
  amountMinorUnits: number;
  operationDate: string;
  reason: string;
  idempotencyKey: string;
}
interface Options {
  empty?: boolean;
  /** Nombre de comptes par page (20 par défaut). */
  pageSize?: number;
}

const forecast = {
  referenceMonth: "2026-11",
  status: "NO_DEADLINE",
  remainingAmount: "1570.00",
  contributionsNeeded: 14,
  estimatedReachMonth: "2028-01",
  requiredMonthlyContribution: null,
};
const page1 = (data: unknown[], nextCursor: string | null = null) => ({
  data,
  meta: { limit: 20, hasNext: nextCursor !== null, nextCursor },
});
const refusal = (route: Route, status: number, code: string) =>
  route.fulfill({ status, json: { error: { details: { code } } } });

const mockVault = async (page: Page, options: Options = {}) => {
  const accounts: Account[] = options.empty
    ? []
    : [
        {
          id: 1,
          name: "Voyage au Japon",
          currency: "EUR",
          initialBalanceMinorUnits: 150000,
          balanceMinorUnits: 243000,
          archived: false,
          goalId: 3,
        },
        {
          id: 2,
          name: "Épargne de sécurité",
          currency: "EUR",
          initialBalanceMinorUnits: 0,
          balanceMinorUnits: 80000,
          archived: false,
          goalId: null,
        },
        {
          id: 3,
          name: "Ancien livret",
          currency: "EUR",
          initialBalanceMinorUnits: 12000,
          balanceMinorUnits: 12000,
          archived: true,
          goalId: null,
        },
      ];
  const goals = [
    {
      id: 3,
      title: "Voyage au Japon",
      targetAmount: "4000.00",
      savedAmount: "2430.00",
      monthlyContribution: "120.00",
      currency: "EUR",
      targetDate: null,
      savingsAccountId: 1 as number | undefined,
      forecast,
    },
    {
      id: 5,
      title: "Fonds d’urgence",
      targetAmount: "5000.00",
      savedAmount: "0.00",
      monthlyContribution: "0.00",
      currency: "EUR",
      targetDate: null,
      savingsAccountId: undefined as number | undefined,
      forecast,
    },
  ];
  const movements: Movement[] = [
    {
      id: 11,
      accountId: 1,
      currency: "EUR",
      type: "VIREMENT",
      direction: "TO_SAVINGS",
      amountMinorUnits: 25000,
      operationDate: "2026-11-07",
      reason: "MANUAL",
      idempotencyKey: "fixture-transfer-11",
    },
    {
      id: 10,
      accountId: 1,
      currency: "EUR",
      type: "VIREMENT",
      direction: "FROM_SAVINGS",
      amountMinorUnits: 8000,
      operationDate: "2026-09-18",
      reason: "MANUAL",
      idempotencyKey: "fixture-transfer-10",
    },
  ];
  const writes: {
    method: string;
    path: string;
    body: Record<string, unknown>;
  }[] = [];
  const currentMonths: string[] = [];
  const state = {
    accounts,
    movements,
    writes,
    currentMonths,
    /** Réponses à perdre avant de laisser passer les virements. */
    lostTransfers: 0,
    /** Retient la réponse des virements jusqu'à sa résolution. */
    holdTransfer: null as Promise<void> | null,
    transferRefusal: null as string | null,
    failAccounts: 0,
    failNextPage: 0,
    /** Retient la lecture d'un compte jusqu'à l'appel de la fonction. */
    holdAccount: null as { id: number; release: Promise<void> } | null,
  };

  await page.route(/\/v1\/goals(\?.*)?$/, (route) =>
    route.request().method() === "GET"
      ? route.fulfill({
          json: {
            data: goals,
            meta: { limit: 100, hasNext: false, nextCursor: null },
          },
        })
      : route.fallback(),
  );

  await page.route(/\/v1\/accounts\/current(\/movements)?\?/, (route) => {
    const url = new URL(route.request().url());
    const month = url.searchParams.get("month") ?? "";
    if (url.pathname.endsWith("/movements")) {
      // Une opération et un virement partagent l'identifiant 7.
      const rows = [
        ["OPERATION", "DEPENSE", "Courses", -6240, "09", null],
        ["VIREMENT", "VIREMENT", "Voyage au Japon", -25000, "07", 1],
        ["OPERATION", "ENTREE", "Salaire", 210000, "02", null],
      ].map(([source, kind, title, amount, day, accountId], index) => ({
        id: index === 2 ? 8 : 7,
        source,
        kind,
        title,
        signedAmountMinorUnits: amount,
        operationDate: `${month}-${day}`,
        currency: "EUR",
        accountId,
      }));
      return route.fulfill({ json: page1(rows) });
    }
    currentMonths.push(month);
    return route.fulfill({
      json: {
        data: {
          type: "CURRENT",
          month,
          currency: "EUR",
          balanceMinorUnits: month === "2026-11" ? 124760 : 4321,
          balanceBasis: "AVAILABLE_BUDGET",
          budget: {
            baseMinorUnits: 200000,
            carryInMinorUnits: 5000,
            actualIncomeMinorUnits: 0,
            actualExpenseMinorUnits: 80240,
          },
        },
      },
    });
  });

  await page.route(/\/v1\/savings-accounts(\/|\?|$)/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const match =
      /\/savings-accounts(?:\/(\d+))?(?:\/(movements|transfers|goal))?$/.exec(
        url.pathname,
      );
    const id = match?.[1] ? Number(match[1]) : null;
    const account = accounts.find((item) => item.id === id);
    if (method === "GET" && id === null) {
      const cursor = url.searchParams.get("cursor");
      if (cursor === null && state.failAccounts > 0) {
        state.failAccounts -= 1;
        return route.fulfill({ status: 503, json: {} });
      }
      if (cursor !== null && state.failNextPage > 0) {
        state.failNextPage -= 1;
        return route.fulfill({ status: 503, json: {} });
      }
      const size = options.pageSize ?? 20;
      const start = cursor === null ? 0 : Number(cursor);
      // La page suivante recouvre la précédente : le doublon doit être écarté.
      const from = Math.max(0, start - (cursor === null ? 0 : 1));
      const end = start + size;
      return route.fulfill({
        json: page1(
          accounts.slice(from, end),
          end < accounts.length ? `${end}` : null,
        ),
      });
    }
    if (method === "GET" && match?.[2] === "movements") {
      return route.fulfill({
        json: page1(movements.filter((row) => row.accountId === id)),
      });
    }
    if (method === "GET") {
      if (state.holdAccount?.id === id) await state.holdAccount.release;
      return account
        ? route.fulfill({ json: { data: account } })
        : refusal(route, 404, "NOT_FOUND");
    }

    const body = request.postDataJSON() as Record<string, unknown>;
    writes.push({ method, path: url.pathname.replace("/v1", ""), body });
    if (method === "POST" && id === null) {
      const created: Account = {
        id: 40,
        name: String(body.name),
        currency: String(body.currency),
        initialBalanceMinorUnits: Number(body.initialBalanceMinorUnits),
        balanceMinorUnits: Number(body.initialBalanceMinorUnits),
        archived: false,
        goalId: null,
      };
      accounts.push(created);
      return route.fulfill({ status: 201, json: { data: created } });
    }
    if (!account) return refusal(route, 404, "NOT_FOUND");
    if (match?.[2] === "transfers") {
      if (state.transferRefusal) {
        return refusal(route, 409, state.transferRefusal);
      }
      // Répétition identique : le mouvement initial, sans nouveau virement.
      let movement = movements.find(
        (row) => row.idempotencyKey === body.idempotencyKey,
      );
      if (!movement) {
        const amount = Number(body.amountMinorUnits);
        account.balanceMinorUnits +=
          body.direction === "TO_SAVINGS" ? amount : -amount;
        movement = {
          id: 20 + movements.length,
          accountId: account.id,
          currency: account.currency,
          type: "VIREMENT",
          direction: String(body.direction),
          amountMinorUnits: amount,
          operationDate: String(body.operationDate),
          reason: String(body.reason),
          idempotencyKey: String(body.idempotencyKey),
        };
        movements.unshift(movement);
      }
      if (state.holdTransfer) await state.holdTransfer;
      if (state.lostTransfers > 0) {
        // Le virement est enregistré, mais sa réponse n'arrive jamais.
        state.lostTransfers -= 1;
        return route.abort("connectionfailed");
      }
      return route.fulfill({ status: 201, json: { data: movement } });
    }
    if (match?.[2] === "goal") {
      account.goalId = Number(body.goalId);
      const goal = goals.find((item) => item.id === account.goalId);
      if (goal) {
        goal.savingsAccountId = account.id;
        goal.savedAmount = (account.balanceMinorUnits / 100).toFixed(2);
      }
    }
    if (typeof body.name === "string") account.name = body.name;
    if (body.archived === true) account.archived = true;
    return route.fulfill({ json: { data: account } });
  });
  return state;
};

const openVault = async (page: Page) => {
  // Jour fixe : mois courant, date par défaut des virements et captures.
  await page.clock.setFixedTime(new Date("2026-11-11T10:00:00+01:00"));
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("happy@example.test");
  await page
    .getByRole("textbox", { exact: true, name: "Mot de passe" })
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page
    .getByRole("button", { name: /Coffre Retrouvez votre épargne/ })
    .click();
  await expect(
    page.getByRole("heading", { exact: true, name: "Coffre" }),
  ).toBeVisible();
};

const expectNoHorizontalOverflow = async (page: Page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
};

test("shows the available budget and the savings accounts", async ({
  page,
}) => {
  await mockVault(page);
  await openVault(page);

  await expect(
    page.getByRole("heading", { name: "Budget disponible · novembre 2026" }),
  ).toBeVisible();
  await expect(page.getByText(/^1\s247,60\s€$/)).toBeVisible();
  await expect(page.getByText(/^2\s430,00\s€$/)).toBeVisible();
  // Progression fournie par le serveur, écrite et pas seulement dessinée.
  const progress = page.getByRole("progressbar", {
    name: "Progression de Voyage au Japon",
  });
  await expect(progress).toHaveAttribute("aria-valuenow", "60");
  await expect(page.getByText(/^2\s430,00\s€ sur 4\s000,00\s€$/)).toBeVisible();
  // Le compte archivé n'est pas dans la vue « Actifs ».
  await expect(
    page.getByRole("heading", { name: "Ancien livret" }),
  ).toHaveCount(0);
  // Les cinq onglets restent : le Coffre est une route secondaire.
  await expect(page.getByRole("tab")).toHaveCount(5);

  const deposit = page.getByRole("button", {
    name: "Déposer sur Voyage au Japon",
  });
  expect((await deposit.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot("vault.png", { fullPage: true });

  await page.getByRole("radio", { name: "Archivés" }).click();
  await expect(
    page.getByRole("heading", { name: "Ancien livret" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Déposer/ })).toHaveCount(0);

  await page.getByRole("link", { name: "Retour à l’accueil" }).click();
  await expect(
    page.getByText("Votre budget en un coup d’œil", { exact: true }),
  ).toBeVisible();
});

test("opens a savings account with its movements and its goal", async ({
  page,
}) => {
  await mockVault(page);
  await openVault(page);
  await page
    .getByRole("link", { name: "Voir le compte Voyage au Japon" })
    .click();

  await expect(
    page.getByRole("heading", { exact: true, name: "Voyage au Japon" }).last(),
  ).toBeVisible();
  await expect(page.getByText("Solde actuel", { exact: true })).toBeVisible();
  await expect(page.getByText("Virement manuel", { exact: true })).toHaveCount(
    2,
  );
  await expect(page.getByText("Dépôt · 7 novembre 2026")).toBeVisible();
  await expect(page.getByText(/^\+250,00\s€$/)).toBeVisible();
  await expect(page.getByText(/^-80,00\s€$/)).toBeVisible();
  await expect(page.getByText(/^1\s500,00\s€$/)).toBeVisible();
  await expect(
    page.getByText("La progression suit le solde réel du compte."),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot("vault-account.png", { fullPage: true });

  await page.getByRole("link", { name: "Retour au Coffre" }).click();
  await expect(
    page.getByRole("heading", { name: "Mes comptes d’épargne" }),
  ).toBeVisible();
});

test("reads the available budget of a past month, never a future one", async ({
  page,
}) => {
  const state = await mockVault(page);
  await openVault(page);
  await page
    .getByRole("button", { name: "Voir les mouvements du compte courant" })
    .click();

  await expect(
    page.getByText(/^novembre 2026 · EUR\. Ce montant vient de votre budget/),
  ).toBeVisible();
  await expect(page.getByText("Base fixe", { exact: true })).toBeVisible();
  // Même identifiant, sources différentes : les deux lignes restent.
  await expect(page.getByText("Dépense · 9 novembre 2026")).toBeVisible();
  await expect(page.getByText("Virement · 7 novembre 2026")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mois suivant" }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "Mois précédent" }).click();
  await expect(page.getByText(/^octobre 2026 · EUR\./)).toBeVisible();
  await expect(page.getByText(/^43,21\s€$/)).toBeVisible();
  await expect(page.getByText("Dépense · 9 octobre 2026")).toBeVisible();
  expect(state.currentMonths).toContain("2026-10");
  await expect(
    page.getByRole("button", { name: "Mois suivant" }),
  ).toBeEnabled();
});

test("records a deposit in whole cents and reloads the server balance", async ({
  page,
}) => {
  const state = await mockVault(page);
  await openVault(page);
  await page
    .getByRole("button", { name: "Déposer sur Épargne de sécurité" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Faire un virement" }),
  ).toBeVisible();
  const amount = dialog.getByLabel("Montant à déposer");
  await expect(amount).toBeFocused();
  await dialog.getByRole("button", { exact: true, name: "Déposer" }).click();
  await expect(
    dialog.getByText(
      "Saisissez un montant strictement positif avec au plus deux décimales.",
    ),
  ).toBeVisible();
  expect(state.writes).toHaveLength(0);

  await amount.fill("150,5");
  // Le formulaire explique le virement et n'annonce aucun nouveau solde.
  await expect(dialog.getByText(/^Impact du dépôt\./)).toBeVisible();
  await expect(dialog.getByText(/950,50/)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot("vault-transfer.png");
  await dialog.getByRole("button", { name: /^Déposer 150,50\s€$/ }).click();

  await expect(page.getByText("Virement enregistré.")).toBeVisible();
  await expect(dialog).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0]).toMatchObject({
    method: "POST",
    path: "/savings-accounts/2/transfers",
    body: {
      direction: "TO_SAVINGS",
      amountMinorUnits: 15050,
      operationDate: "2026-11-11",
      reason: "MANUAL",
    },
  });
  expect(state.writes[0].body.idempotencyKey).toMatch(
    /^manual:[A-Za-z0-9_-]{16,90}$/,
  );
  // Solde relu sur le serveur après l'enregistrement.
  await expect(page.getByText(/^950,50\s€$/)).toBeVisible();
});

test("resumes an uncertain transfer with the same key, without a duplicate", async ({
  page,
}) => {
  const state = await mockVault(page);
  state.lostTransfers = 1;
  await openVault(page);
  await page
    .getByRole("button", { name: "Retirer de Épargne de sécurité" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("radio", { name: "Retirer" })).toBeChecked();
  await dialog.getByLabel("Montant à retirer").fill("100");
  await dialog.getByRole("button", { name: /^Retirer 100,00\s€$/ }).click();

  await expect(
    dialog.getByText(/^Le résultat de l’enregistrement est incertain\./),
  ).toBeVisible();
  // Champs figés : la reprise renverra exactement ce virement.
  await expect(dialog.getByLabel("Montant à retirer")).not.toBeEditable();
  await expect(dialog.getByRole("radio", { name: "Déposer" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Vérifier les mouvements" }).click();
  await expect(dialog.getByText("Retrait · 11 novembre 2026")).toBeVisible();

  await dialog.getByRole("button", { name: "Reprendre ce virement" }).click();
  await expect(page.getByText("Virement enregistré.")).toBeVisible();
  expect(state.writes).toHaveLength(2);
  expect(state.writes[1].body).toEqual(state.writes[0].body);
  expect(state.movements.filter((row) => row.accountId === 2)).toHaveLength(1);
  await expect(page.getByText(/^700,00\s€$/)).toBeVisible();
});

test("explains a refused withdrawal and lets the entry be corrected", async ({
  page,
}) => {
  const state = await mockVault(page);
  state.transferRefusal = "INSUFFICIENT_SAVINGS";
  await openVault(page);
  await page
    .getByRole("button", { name: "Retirer de Épargne de sécurité" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Montant à retirer").fill("9000");
  await dialog.getByRole("button", { name: /^Retirer 9\s000,00\s€$/ }).click();

  await expect(
    dialog.getByText("Le solde de ce compte ne suffit pas pour ce retrait."),
  ).toBeVisible();
  await expect(dialog.getByLabel("Montant à retirer")).toBeEnabled();

  // Nouvelle saisie : nouvelle tentative, donc nouvelle clé.
  state.transferRefusal = null;
  await dialog.getByLabel("Montant à retirer").fill("50");
  await dialog.getByRole("button", { name: /^Retirer 50,00\s€$/ }).click();
  await expect(page.getByText("Virement enregistré.")).toBeVisible();
  expect(state.writes[1].body.idempotencyKey).not.toBe(
    state.writes[0].body.idempotencyKey,
  );
});

test("creates, renames and archives an account", async ({ page }) => {
  const state = await mockVault(page);
  await openVault(page);
  await page.getByRole("button", { name: "Nouveau compte" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Créer le compte" }).click();
  await expect(
    dialog.getByText("Le nom doit contenir entre 2 et 50 caractères."),
  ).toBeVisible();
  await dialog.getByLabel("Nom du compte").fill("Projet maison");
  await dialog.getByLabel("Solde initial").fill("2 000,00");
  await dialog.getByRole("button", { name: "Créer le compte" }).click();

  await expect(page.getByText("Compte créé.")).toBeVisible();
  expect(state.writes[0]).toEqual({
    method: "POST",
    path: "/savings-accounts",
    body: {
      name: "Projet maison",
      currency: "EUR",
      initialBalanceMinorUnits: 200000,
    },
  });
  await page
    .getByRole("link", { name: "Voir le compte Projet maison" })
    .click();
  await expect(page.getByText("Solde actuel", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Renommer" }).click();
  await dialog.getByLabel("Nom du compte").fill("Maison");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Compte renommé.")).toBeVisible();
  await expect(
    page.getByRole("heading", { exact: true, name: "Maison" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Archiver" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Archiver « Maison » ?" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Archiver le compte" }).click();
  await expect(
    page.getByText("Compte archivé.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/^Compte archivé : le solde/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Déposer" })).toHaveCount(0);
  expect(state.writes.slice(1)).toEqual([
    { method: "PATCH", path: "/savings-accounts/40", body: { name: "Maison" } },
    { method: "PATCH", path: "/savings-accounts/40", body: { archived: true } },
  ]);
});

test("links a goal of the same currency that has no account", async ({
  page,
}) => {
  const state = await mockVault(page);
  await openVault(page);
  await page
    .getByRole("button", {
      name: "Rattacher un objectif à Épargne de sécurité",
    })
    .click();
  const dialog = page.getByRole("dialog");
  // L'objectif déjà rattaché n'est pas proposé.
  await expect(dialog.getByRole("radio")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Rattacher" }).click();
  await expect(
    dialog.getByText("Choisissez un objectif disponible dans la même devise."),
  ).toBeVisible();
  await dialog.getByRole("radio", { name: /^Fonds d’urgence/ }).click();
  await dialog.getByRole("button", { name: "Rattacher" }).click();

  await expect(
    page.getByText("Objectif rattaché.", { exact: true }),
  ).toBeVisible();
  expect(state.writes).toEqual([
    { method: "PUT", path: "/savings-accounts/2/goal", body: { goalId: 5 } },
  ]);
  await expect(
    page.getByRole("progressbar", { name: "Progression de Fonds d’urgence" }),
  ).toHaveAttribute("aria-valuenow", "16");
});

test("offers a retry when the vault cannot be loaded", async ({ page }) => {
  const state = await mockVault(page);
  state.failAccounts = 1;
  await openVault(page);
  await expect(
    page.getByText("Impossible de charger le Coffre", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Réessayer les comptes" }).click();
  await expect(
    page.getByRole("heading", { name: "Voyage au Japon" }),
  ).toBeVisible();
});

test("invites to create a first account in an empty vault", async ({
  page,
}) => {
  await mockVault(page, { empty: true });
  await openVault(page);
  await expect(
    page.getByText("Votre Coffre est prêt", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Créer un compte" }).click();
  await expect(
    page.getByRole("heading", { name: "Créer un compte d’épargne" }),
  ).toBeVisible();
});

test("retries the next page of accounts and drops duplicates", async ({
  page,
}) => {
  const state = await mockVault(page, { pageSize: 1 });
  state.failNextPage = 1;
  await openVault(page);
  await expect(
    page.getByRole("heading", { name: "Épargne de sécurité" }),
  ).toHaveCount(0);

  const more = page.getByRole("button", { name: "Afficher plus de comptes" });
  await more.click();
  await expect(
    page.getByText("La suite des comptes n’a pas pu être chargée. Réessayez."),
  ).toBeVisible();
  await more.click();
  await expect(
    page.getByRole("heading", { name: "Épargne de sécurité" }),
  ).toBeVisible();
  // La deuxième page répétait le premier compte : une seule carte.
  await expect(
    page.getByRole("heading", { name: "Voyage au Japon" }),
  ).toHaveCount(1);
});

test("ignores the late answer of a previously opened account", async ({
  page,
}) => {
  const state = await mockVault(page);
  let release = () => {};
  state.holdAccount = {
    id: 1,
    release: new Promise<void>((resolve) => {
      release = resolve;
    }),
  };
  await openVault(page);
  await page
    .getByRole("link", { name: "Voir le compte Voyage au Japon" })
    .click();
  await expect(page.getByText("Chargement du compte…")).toBeVisible();
  await page.getByRole("link", { name: "Retour au Coffre" }).click();
  await page
    .getByRole("link", { name: "Voir le compte Épargne de sécurité" })
    .click();
  await expect(page.getByText("Solde actuel", { exact: true })).toBeVisible();

  const late = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/savings-accounts/1"),
  );
  release();
  await late;
  await expect(
    page
      .getByRole("heading", { exact: true, name: "Épargne de sécurité" })
      .last(),
  ).toBeVisible();
  await expect(page.getByText(/^800,00\s€$/).last()).toBeVisible();
  await expect(page.getByText("Solde initial", { exact: true })).toHaveCount(1);
});

test("keeps the transfer form open while its answer is pending", async ({
  page,
}) => {
  const state = await mockVault(page);
  let release = () => {};
  state.holdTransfer = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.lostTransfers = 1;
  await openVault(page);
  await page
    .getByRole("button", { name: "Déposer sur Épargne de sécurité" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Montant à déposer").fill("150");
  await dialog.getByRole("button", { name: /^Déposer 150,00\s€$/ }).click();
  await expect.poll(() => state.writes.length).toBe(1);

  // Échap sur le Web, bouton Retour sur Android : même fermeture demandée.
  await page.keyboard.press("Escape");
  await expect(
    dialog.getByRole("heading", { name: "Faire un virement" }),
  ).toBeVisible();

  release();
  // La réponse est perdue : les champs et la clé sont encore là.
  await expect(
    dialog.getByText(/^Le résultat de l’enregistrement est incertain\./),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Reprendre ce virement" }).click();
  await expect(page.getByText("Virement enregistré.")).toBeVisible();
  expect(state.writes[1].body).toEqual(state.writes[0].body);
  expect(state.movements.filter((row) => row.accountId === 2)).toHaveLength(1);
});

// Expo Web n'a pas d'échelle de police système : chaque texte rendu est
// agrandi ×1,3, comme dans `daily-remaining.spec.ts`.
const enlargeText = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((root) => {
    for (const el of root.querySelectorAll<HTMLElement>("*")) {
      if (el.childElementCount === 0 && el.textContent?.trim()) {
        const original =
          el.dataset.vaultTestFontSize ?? getComputedStyle(el).fontSize;
        el.dataset.vaultTestFontSize = original;
        el.style.fontSize = `${parseFloat(original) * 1.3}px`;
        el.style.lineHeight = "normal";
      }
    }
  });

/** Textes et boutons visibles qui sortent de l'écran ou sont rognés. */
const overflowing = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((root) => {
    const visible = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && el.checkVisibility();
    };
    const bad: string[] = [];
    for (const el of root.querySelectorAll<HTMLElement>("*")) {
      if (!visible(el)) continue;
      const rect = el.getBoundingClientRect();
      const label = (el.textContent ?? "").trim().slice(0, 30);
      const leaf = el.childElementCount === 0 && label.length > 0;
      if (
        leaf &&
        (rect.right > window.innerWidth + 0.5 ||
          rect.left < -0.5 ||
          el.scrollWidth > el.clientWidth + 1)
      ) {
        bad.push(`débordement: ${label}`);
      }
      if (el.getAttribute("role") === "button" && rect.height < 48) {
        bad.push(`cible ${Math.round(rect.height)} px: ${label}`);
      }
    }
    return bad;
  });

test("keeps the vault readable with text enlarged 1.3 times", async ({
  page,
}) => {
  await mockVault(page);
  await openVault(page);
  await expect(
    page.getByRole("heading", { name: "Voyage au Japon" }),
  ).toBeVisible();
  await enlargeText(page, "vault-screen");
  expect(await overflowing(page, "vault-screen")).toEqual([]);
  await expectNoHorizontalOverflow(page);

  await page
    .getByRole("button", { name: "Retirer de Épargne de sécurité" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Montant à retirer").fill("1234,56");
  await enlargeText(page, "vault-dialog");
  expect(await overflowing(page, "vault-dialog")).toEqual([]);
  await dialog.getByRole("button", { name: "Annuler" }).click();

  await page
    .getByRole("link", { name: "Voir le compte Voyage au Japon" })
    .click();
  await expect(page.getByText("Dépôt · 7 novembre 2026")).toBeVisible();
  await enlargeText(page, "vault-account-screen");
  expect(await overflowing(page, "vault-account-screen")).toEqual([]);
  await expectNoHorizontalOverflow(page);
});
