import { expect, Page, Route, test } from "@playwright/test";

// Décision de fin de mois mobile (#420) : contrat `month-end-decisions.md`
// du backend #184, simulé avec un état par test. Le serveur applique la
// formule, les révisions et l'idempotence ; l'écran relit ses montants.
interface Allocation {
  accountId: number;
  amountMinorUnits: number;
}
interface Options {
  /** Solde d'octobre avant décision (report de septembre inclus). */
  result?: number;
  decided?: {
    savings?: Allocation[];
    coverage?: Allocation[];
    exceptional?: number;
    /** Solde au moment de la décision, s'il a changé depuis. */
    reference?: number;
  };
}

const sum = (rows: Allocation[]) =>
  rows.reduce((total, row) => total + row.amountMinorUnits, 0);
const refusal = (route: Route, status: number, code: string) =>
  route.fulfill({ status, json: { error: { details: { code } } } });
const amount = (cents: number) => (cents / 100).toFixed(2);

const mockMonthEnd = async (page: Page, options: Options = {}) => {
  const result = options.result ?? 15000;
  const decided = options.decided;
  const state = {
    result,
    reference: decided?.reference ?? result,
    status: decided ? "DECIDED" : "PENDING",
    revision: decided ? 1 : 0,
    savings: decided?.savings ?? ([] as Allocation[]),
    coverage: decided?.coverage ?? ([] as Allocation[]),
    exceptional: decided?.exceptional ?? 0,
    writes: [] as Record<string, unknown>[],
    /** Réponses d'écriture à perdre après avoir enregistré la décision. */
    lostSaves: 0,
    /** Révision faite ailleurs juste avant la prochaine écriture. */
    concurrentRevision: false,
    replies: new Map<string, unknown>(),
  };
  const decision = () => {
    const carry =
      state.result -
      sum(state.savings) +
      sum(state.coverage) +
      state.exceptional;
    return {
      month: "2026-10",
      currency: "EUR",
      status: state.status,
      revision: state.revision,
      savings: state.savings,
      coverage: state.coverage,
      exceptionalIncomeMinorUnits: state.exceptional,
      savingsMinorUnits: sum(state.savings),
      coverageMinorUnits: sum(state.coverage),
      referenceResultMinorUnits: state.reference,
      resultBeforeDecisionMinorUnits: state.result,
      carryMinorUnits: carry,
      requiresReview:
        state.status === "DECIDED" && state.result !== state.reference,
      correctionDeltaMinorUnits:
        state.status === "DECIDED" ? state.result - state.reference : 0,
    };
  };

  await page.route(
    /\/v1\/budget-periods\/(\d{4}-\d{2})\/decision/,
    async (route) => {
      const request = route.request();
      const month = /budget-periods\/(\d{4}-\d{2})/.exec(request.url())?.[1];
      if (month !== "2026-10") return refusal(route, 409, "PERIOD_NOT_CLOSED");
      if (request.method() === "GET") {
        return route.fulfill({ json: { data: decision() } });
      }
      const body = request.postDataJSON() as {
        expectedRevision: number;
        idempotencyKey: string;
        savings: Allocation[];
        coverage: Allocation[];
        exceptionalIncomeMinorUnits: number;
      };
      state.writes.push(body);
      const replay = state.replies.get(body.idempotencyKey);
      if (replay) return route.fulfill({ json: { data: replay } });
      if (state.concurrentRevision) {
        state.concurrentRevision = false;
        state.status = "DECIDED";
        state.revision += 1;
        state.savings = [{ accountId: 2, amountMinorUnits: 3000 }];
        state.reference = state.result;
      }
      if (body.expectedRevision !== state.revision) {
        return refusal(route, 409, "REVISION_CONFLICT");
      }
      state.status = "DECIDED";
      state.revision += 1;
      state.savings = body.savings;
      state.coverage = body.coverage;
      state.exceptional = body.exceptionalIncomeMinorUnits;
      state.reference = state.result;
      state.replies.set(body.idempotencyKey, decision());
      if (state.lostSaves > 0) {
        state.lostSaves -= 1;
        return route.abort("connectionfailed");
      }
      return route.fulfill({ json: { data: decision() } });
    },
  );

  await page.route(/\/v1\/savings-accounts\?/, (route) =>
    route.fulfill({
      json: {
        data: [
          [1, "Voyage au Japon", 243000],
          [2, "Épargne de sécurité", 4000],
        ].map(([id, name, balance]) => ({
          id,
          name,
          currency: "EUR",
          initialBalanceMinorUnits: 0,
          balanceMinorUnits: balance,
          archived: false,
          goalId: null,
        })),
        meta: { limit: 20, hasNext: false, nextCursor: null },
      },
    }),
  );

  // Résumé de novembre : son report est celui de la décision d'octobre.
  await page.route(/\/v1\/budget-periods\/2026-11\/summary/, (route) => {
    const carry = decision().carryMinorUnits;
    return route.fulfill({
      json: {
        data: {
          month: "2026-11",
          currency: "EUR",
          status: "OPEN",
          carryIn: amount(carry),
          carryFromMonth: "2026-10",
          monthResult: "1180.00",
          realRemaining: amount(carry + 118000),
          remainingDays: 20,
          realDailyAllowance: null,
          forecast: null,
          days: [],
        },
      },
    });
  });
  return state;
};

const signIn = async (page: Page, now = "2026-11-11T10:00:00+01:00") => {
  // 11 novembre par défaut : octobre est le dernier mois clos.
  await page.clock.setFixedTime(new Date(now));
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

/** Ouvre « Décider » depuis le bandeau de l'Accueil, comme l'utilisateur. */
const openDecision = async (page: Page) => {
  await page
    .getByTestId("month-end-prompt")
    .getByRole("button", { name: /^(Décider maintenant|Couvrir ou reporter)$/ })
    .click();
  await expect(page.getByTestId("month-end-screen")).toBeVisible();
};

const euros = (text: string) =>
  new RegExp(`^${text.replace(/ /g, "\\s").replace("−", "-")}\\s€$`);

const expectNoHorizontalOverflow = async (page: Page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
};

test("proposes the October balance on the Home and remembers « Plus tard »", async ({
  page,
}) => {
  await mockMonthEnd(page);
  await signIn(page);
  const prompt = page.getByTestId("month-end-prompt");
  await expect(
    prompt.getByRole("heading", {
      name: /^Il vous reste 150,00\s€ d’octobre$/,
    }),
  ).toBeVisible();
  await expect(
    prompt.getByText(/Sans réponse, tout reste reporté/),
  ).toBeVisible();
  for (const name of ["Décider maintenant", "Plus tard"]) {
    const box = await prompt.getByRole("button", { name }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(48);
  }
  await expectNoHorizontalOverflow(page);
  await expect(prompt).toHaveScreenshot("month-end-prompt.png");

  await prompt.getByRole("button", { name: "Plus tard" }).click();
  await expect(prompt).toHaveCount(0);
  const reminder = page.getByTestId("month-end-reminder");
  await expect(
    reminder.getByText(
      /^Décision d’octobre en attente · 150,00\s€ reportés pour l’instant\.$/,
    ),
  ).toBeVisible();

  // Le rappel tient pour la session, même après un passage par le Coffre.
  await page
    .getByRole("button", { name: /Coffre Retrouvez votre épargne/ })
    .click();
  await page.getByRole("link", { name: "Retour à l’accueil" }).click();
  await expect(page.getByTestId("month-end-reminder")).toBeVisible();
  await expect(page.getByTestId("month-end-prompt")).toHaveCount(0);
});

test("saves 100 € of the 150 € and reads the 50 € carry from the server", async ({
  page,
}) => {
  const state = await mockMonthEnd(page);
  await signIn(page);
  await page
    .getByTestId("month-end-prompt")
    .getByRole("button", { name: "Décider maintenant" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Décider du solde d’octobre 2026" }),
  ).toBeVisible();

  await page.getByRole("radio", { name: "Répartir" }).click();
  await page.getByLabel("Épargner sur Voyage au Japon").fill("100");
  const footer = page.getByTestId("month-end-footer");
  await expect(footer.getByText("Aperçu · Report sur novembre")).toBeVisible();
  await expect(footer.getByText(euros("50,00"))).toBeVisible();
  // Le bouton flottant ne recouvre pas la validation collée en bas.
  await expect(
    page.getByRole("button", { name: "Ajouter une opération ou un événement" }),
  ).toHaveCount(0);
  const validate = footer.getByRole("button", { name: "Valider la décision" });
  expect((await validate.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot("month-end-decide.png");

  await validate.click();
  await expect(
    page.getByText("Décision d’octobre 2026 enregistrée."),
  ).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0]).toMatchObject({
    expectedRevision: 0,
    savings: [{ accountId: 1, amountMinorUnits: 10000 }],
    coverage: [],
    exceptionalIncomeMinorUnits: 0,
  });
  expect(String(state.writes[0].idempotencyKey)).toMatch(
    /^decision-2026-10-[a-z0-9]+-[A-Za-z0-9]{20}$/,
  );
  await expect(
    page.getByRole("heading", { name: "Décision d’octobre 2026" }),
  ).toBeVisible();
  await expect(page.getByText("Épargne sur Voyage au Japon")).toBeVisible();
  await expect(
    page.getByLabel(/^Report sur novembre : 50,00\s€$/),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot("month-end-decided.png", {
    fullPage: true,
  });

  // L'Accueil relu : plus de bandeau, le report après décision.
  await page.getByRole("link", { name: "Retour à l’accueil" }).click();
  await expect(page.getByTestId("month-end-prompt")).toHaveCount(0);
  await expect(
    page.getByText(
      /^Décision d’octobre à jour : 100,00\s€ épargnés, 50,00\s€ reportés\.$/,
    ),
  ).toBeVisible();
  await expect(page.getByText("Report d’octobre après décision")).toBeVisible();
  await page.getByRole("button", { name: "Voir le détail du calcul" }).click();
  const detail = page.getByTestId("calculation-detail");
  await expect(
    detail.getByLabel(/^dont épargné en fin de mois : -100,00\s€$/),
  ).toBeVisible();
  await expect(detail.getByLabel(/^Reste réel : 1\s230,00\s€$/)).toBeVisible();
  await detail
    .getByRole("button", { name: "Fermer le détail du calcul" })
    .click();
  await expect(detail).toHaveCount(0);
});

test("keeps the decision after a forgotten 30 € expense: 100 € saved, 20 € carried", async ({
  page,
}) => {
  const state = await mockMonthEnd(page, {
    result: 12000,
    decided: {
      savings: [{ accountId: 1, amountMinorUnits: 10000 }],
      reference: 15000,
    },
  });
  await signIn(page);
  const review = page.getByTestId("month-end-review");
  await expect(
    review.getByRole("heading", {
      name: "À revoir : octobre a changé après votre décision",
    }),
  ).toBeVisible();
  await expect(review.getByText(/50,00\s€ → 20,00\s€/)).toBeVisible();
  await review
    .getByRole("button", { name: "Revoir la décision d’octobre" })
    .click();

  await expect(page.getByText("! À revoir")).toBeVisible();
  await expect(
    page.getByLabel(
      /^Report sur novembre : 50,00\s€ avant correction, désormais 20,00\s€$/,
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Garder ma décision" }).click();
  await expect(
    page.getByText("Décision d’octobre 2026 enregistrée."),
  ).toBeVisible();
  // Même répartition : l'épargne n'est jamais modifiée automatiquement.
  expect(state.writes[0]).toMatchObject({
    expectedRevision: 1,
    savings: [{ accountId: 1, amountMinorUnits: 10000 }],
  });
  // L'Accueil, monté sous l'onglet, n'est relu qu'à son retour au premier plan.
  await expect(
    page.getByTestId("month-end-screen").getByTestId("month-end-review"),
  ).toHaveCount(0);
  await expect(page.getByText("✓ Décidée")).toBeVisible();
  await expect(
    page.getByLabel(/^Report sur novembre : 20,00\s€$/),
  ).toBeVisible();

  await page.getByRole("link", { name: "Retour à l’accueil" }).click();
  await expect(page.getByTestId("month-end-review")).toHaveCount(0);
  await expect(
    page.getByText(
      /^Décision d’octobre à jour : 100,00\s€ épargnés, 20,00\s€ reportés\.$/,
    ),
  ).toBeVisible();
});

test("covers a 150 € deficit with 50 € of savings and 70 € received: −30 €", async ({
  page,
}) => {
  const state = await mockMonthEnd(page, { result: -15000 });
  await page.setViewportSize({
    width: page.viewportSize()?.width ?? 360,
    height: 2000,
  });
  await signIn(page);
  await page
    .getByTestId("month-end-prompt")
    .getByRole("button", { name: "Couvrir ou reporter" })
    .click();
  await page.getByRole("radio", { name: "Couvrir tout ou partie" }).click();
  const footer = page.getByTestId("month-end-footer");

  // Sans montant : résumé d'erreurs, rien n'est envoyé.
  await footer.getByRole("button", { name: "Valider la décision" }).click();
  await expect(
    page.getByText(
      "• Indiquez au moins un prélèvement ou une entrée exceptionnelle, ou choisissez « Tout reporter ».",
    ),
  ).toBeVisible();
  // Fonds insuffisants : message sous le champ, focus sur ce champ.
  const safety = page.getByLabel("Prélever sur Épargne de sécurité");
  await safety.fill("50");
  await footer.getByRole("button", { name: "Valider la décision" }).click();
  await expect(
    page.getByText(
      /^Fonds insuffisants : Épargne de sécurité contient 40,00\s€\.$/,
    ),
  ).toBeVisible();
  await expect(safety).toBeFocused();
  expect(state.writes).toHaveLength(0);

  await safety.fill("");
  await page.getByLabel("Prélever sur Voyage au Japon").fill("50");
  await page.getByLabel("Montant reçu pour couvrir octobre").fill("70");
  await expect(
    footer.getByText("Aperçu · Déficit reporté sur novembre"),
  ).toBeVisible();
  await expect(footer.getByText(euros("−30,00"))).toBeVisible();
  await footer.getByRole("button", { name: "Valider la décision" }).click();

  await expect(page.getByText("Couverture du déficit")).toBeVisible();
  expect(state.writes[0]).toMatchObject({
    savings: [],
    coverage: [{ accountId: 1, amountMinorUnits: 5000 }],
    exceptionalIncomeMinorUnits: 7000,
  });
  await expect(
    page.getByLabel(/^Déficit reporté sur novembre : -30,00\s€$/),
  ).toBeVisible();
  await expect(
    page.getByText(
      /^Le déficit restant \(-30,00\s€\) réduit le reste à vivre de novembre\.$/,
    ),
  ).toBeVisible();
});

test("resends an uncertain decision with the same key while the split is identical", async ({
  page,
}) => {
  const state = await mockMonthEnd(page);
  state.lostSaves = 1;
  await signIn(page);
  await openDecision(page);
  await page.getByRole("radio", { name: "Tout épargner" }).click();
  await page.getByLabel("Épargner sur Voyage au Japon").fill("150");
  const validate = page
    .getByTestId("month-end-footer")
    .getByRole("button", { name: "Valider la décision" });
  await validate.click();
  await expect(
    page.getByText(/^Le résultat de l’enregistrement est incertain\./),
  ).toBeVisible();

  await validate.click();
  await expect(
    page.getByText("Décision d’octobre 2026 enregistrée."),
  ).toBeVisible();
  expect(state.writes).toHaveLength(2);
  expect(state.writes[1]).toEqual(state.writes[0]);
  await expect(
    page.getByLabel(/^Report sur novembre : 0,00\s€$/),
  ).toBeVisible();
});

test("reads the latest decision after a revision on another device", async ({
  page,
}) => {
  const state = await mockMonthEnd(page);
  state.concurrentRevision = true;
  await signIn(page);
  await openDecision(page);
  await page.getByRole("radio", { name: "Répartir" }).click();
  await page.getByLabel("Épargner sur Voyage au Japon").fill("20");
  await page
    .getByTestId("month-end-footer")
    .getByRole("button", { name: "Valider la décision" })
    .click();

  await expect(
    page.getByText(
      "La décision a changé sur un autre appareil. La version la plus récente est affichée : vérifiez-la avant de valider à nouveau.",
    ),
  ).toBeVisible();
  // Version du serveur : 30 € épargnés ailleurs, révision 1.
  await expect(page.getByText("Épargne sur Épargne de sécurité")).toBeVisible();
  await expect(page.getByText(/^Révision 1\./)).toBeVisible();
});

test("never proposes the current month, even on its last evening", async ({
  page,
}) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    const month = /budget-periods\/(\d{4}-\d{2})\/decision/.exec(
      request.url(),
    )?.[1];
    if (month) requested.push(month);
  });
  await mockMonthEnd(page);
  // 31 octobre, 23 h 30 à Paris : octobre n'est pas clos.
  await signIn(page, "2026-10-31T23:30:00+01:00");
  await expect(page.getByText("Reste réel", { exact: true })).toBeVisible();
  await expect(page.getByTestId("month-end-prompt")).toHaveCount(0);
  expect(requested).toContain("2026-09");
  expect(requested).not.toContain("2026-10");
});

test("shows nothing on the Home when the decision cannot be read", async ({
  page,
}) => {
  await page.route(/\/v1\/budget-periods\/2026-10\/decision/, (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await signIn(page);
  await expect(page.getByText("Reste réel", { exact: true })).toBeVisible();
  await expect(page.getByTestId("month-end-prompt")).toHaveCount(0);
  await expect(page.getByTestId("month-end-reminder")).toHaveCount(0);
  await expect(page.getByTestId("month-end-review")).toHaveCount(0);
});

// Expo Web n'a pas d'échelle de police système : chaque texte rendu est
// agrandi ×1,3, comme dans `vault.spec.ts`.
const enlargeText = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((root) => {
    for (const el of root.querySelectorAll<HTMLElement>("*")) {
      if (el.childElementCount === 0 && el.textContent?.trim()) {
        const original =
          el.dataset.monthEndTestFontSize ?? getComputedStyle(el).fontSize;
        el.dataset.monthEndTestFontSize = original;
        el.style.fontSize = `${parseFloat(original) * 1.3}px`;
        el.style.lineHeight = "normal";
      }
    }
  });

/** Textes et boutons visibles qui sortent de l'écran ou sont rognés. */
const overflowing = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((root) => {
    const bad: string[] = [];
    for (const el of root.querySelectorAll<HTMLElement>("*")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || !el.checkVisibility()) {
        continue;
      }
      const label = (el.textContent ?? "").trim().slice(0, 30);
      if (
        el.childElementCount === 0 &&
        label.length > 0 &&
        (rect.right > window.innerWidth + 0.5 ||
          rect.left < -0.5 ||
          el.scrollWidth > el.clientWidth + 1)
      ) {
        bad.push(`débordement: ${label}`);
      }
      if (
        ["button", "radio"].includes(el.getAttribute("role") ?? "") &&
        rect.height < 48
      ) {
        bad.push(`cible ${Math.round(rect.height)} px: ${label}`);
      }
    }
    return bad;
  });

test("keeps the decision readable with text enlarged 1.3 times", async ({
  page,
}) => {
  await mockMonthEnd(page, { result: -15000 });
  await signIn(page);
  await openDecision(page);
  await page.getByRole("radio", { name: "Couvrir tout ou partie" }).click();
  await page.getByLabel("Prélever sur Voyage au Japon").fill("1234,56");
  await enlargeText(page, "month-end-screen");
  expect(await overflowing(page, "month-end-screen")).toEqual([]);
  await expectNoHorizontalOverflow(page);
});

test("keeps the prompt, the decided view and the detail readable at 1.3", async ({
  page,
}) => {
  await mockMonthEnd(page);
  await signIn(page);
  await enlargeText(page, "month-end-prompt");
  expect(await overflowing(page, "month-end-prompt")).toEqual([]);

  await openDecision(page);
  await page.getByRole("radio", { name: "Répartir" }).click();
  await page.getByLabel("Épargner sur Voyage au Japon").fill("100");
  await enlargeText(page, "month-end-screen");
  expect(await overflowing(page, "month-end-screen")).toEqual([]);
  await page
    .getByTestId("month-end-footer")
    .getByRole("button", { name: "Valider la décision" })
    .click();
  await expect(page.getByText("Répartition du solde")).toBeVisible();
  await enlargeText(page, "month-end-screen");
  expect(await overflowing(page, "month-end-screen")).toEqual([]);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "Retour à l’accueil" }).click();
  await page.getByRole("button", { name: "Voir le détail du calcul" }).click();
  await enlargeText(page, "calculation-detail");
  expect(await overflowing(page, "calculation-detail")).toEqual([]);
});
