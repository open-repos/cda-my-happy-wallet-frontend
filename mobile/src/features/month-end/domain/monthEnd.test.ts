import { describe, expect, it } from "vitest";

import {
  buildDecisionPlan,
  canKeepDecision,
  carryBeforeCorrection,
  carryDecisionDetails,
  decisionAccounts,
  draftFromDecision,
  emptyDraft,
  fillRest,
  homeMonthEnd,
  isDecidableMonth,
  monthEndErrorMessage,
  needsDecision,
  ofMonth,
  parseMonthEndDecision,
  planOf,
  previewCarry,
  previousParisMonth,
} from "@/src/features/month-end/domain/monthEnd";
import {
  correctedDecision,
  coveredDeficit,
  decidedDecision,
  decisionAccount,
  pendingDecision,
} from "@/src/features/month-end/testing/monthEndFixtures";

const spaces = (value: string) => value.replace(/\s/g, " ");
const japan = decisionAccount(12, "Voyage au Japon", 243000);
const safety = decisionAccount(15, "Épargne de sécurité", 390000);
const accounts = [japan, safety];

describe("month-end contract (#420, backend #184)", () => {
  it("keeps the server fields of a decision", () => {
    expect(
      parseMonthEndDecision({ ...decidedDecision(), owner: 9, receipt: "x" }),
    ).toEqual(decidedDecision());
  });

  it.each([
    { month: "2026-13" },
    { status: "DONE" },
    { revision: -1 },
    { savingsMinorUnits: 1.5 },
    { carryMinorUnits: "50" },
    { requiresReview: "no" },
    { savings: [{ accountId: 12, amountMinorUnits: 0 }] },
    { coverage: [{ accountId: 0, amountMinorUnits: 10 }] },
  ])("refuses an invalid decision %j", (change) => {
    expect(() =>
      parseMonthEndDecision({ ...decidedDecision(), ...change }),
    ).toThrow();
  });
});

describe("decidable months (Europe/Paris)", () => {
  it("proposes the previous month from the first day of the next one", () => {
    // 31 octobre 23 h 30 à Paris : octobre n'est pas encore clos.
    expect(previousParisMonth(new Date("2026-10-31T22:30:00Z"))).toBe(
      "2026-09",
    );
    // 1er novembre 0 h 30 à Paris (23 h 30 UTC la veille).
    expect(previousParisMonth(new Date("2026-10-31T23:30:00Z"))).toBe(
      "2026-10",
    );
    expect(previousParisMonth(new Date("2027-01-01T00:00:00Z"))).toBe(
      "2026-12",
    );
  });

  it("never decides the current, a future or an invalid month", () => {
    const now = new Date("2026-11-11T10:00:00Z");
    expect(isDecidableMonth("2026-10", now)).toBe(true);
    expect(isDecidableMonth("2026-09", now)).toBe(true);
    expect(isDecidableMonth("2026-11", now)).toBe(false);
    expect(isDecidableMonth("2027-01", now)).toBe(false);
    expect(isDecidableMonth("2026-1", now)).toBe(false);
    expect(isDecidableMonth(undefined, now)).toBe(false);
  });

  it("writes French month names with elision", () => {
    expect(ofMonth("2026-10")).toBe("d’octobre");
    expect(ofMonth("2026-09")).toBe("de septembre");
  });
});

describe("the three examples of #396", () => {
  it("150 € with 100 € saved carries 50 €", () => {
    const decision = parseMonthEndDecision(pendingDecision());
    const built = buildDecisionPlan({
      decision,
      editing: false,
      draft: { mode: "split", amounts: { 12: "100" }, exceptional: "" },
      accounts,
    });
    expect(built.errors).toEqual([]);
    expect(built.plan).toEqual({
      savings: [{ accountId: 12, amountMinorUnits: 10000 }],
      coverage: [],
      exceptionalIncomeMinorUnits: 0,
    });
    expect(previewCarry(15000, built.plan)).toBe(5000);
  });

  it("a forgotten 30 € expense keeps 100 € saved and carries 20 €", () => {
    const decision = parseMonthEndDecision(correctedDecision());
    expect(previewCarry(12000, planOf(decision))).toBe(2000);
    expect(carryBeforeCorrection(decision)).toBe(5000);
    // « Garder ma décision » renvoie la même répartition.
    expect(canKeepDecision(decision)).toBe(true);
    expect(planOf(decision).savings).toEqual([
      { accountId: 12, amountMinorUnits: 10000 },
    ]);
  });

  it("a 150 € deficit covered by 50 € and 70 € carries −30 €", () => {
    const decision = parseMonthEndDecision({
      ...coveredDeficit(),
      status: "PENDING",
      revision: 0,
      coverage: [],
      coverageMinorUnits: 0,
      exceptionalIncomeMinorUnits: 0,
      carryMinorUnits: -15000,
    });
    const built = buildDecisionPlan({
      decision,
      editing: false,
      draft: { mode: "cover", amounts: { 15: "50,00" }, exceptional: "70" },
      accounts,
    });
    expect(built.errors).toEqual([]);
    expect(built.plan).toEqual({
      savings: [],
      coverage: [{ accountId: 15, amountMinorUnits: 5000 }],
      exceptionalIncomeMinorUnits: 7000,
    });
    expect(previewCarry(-15000, built.plan)).toBe(-3000);
  });

  it("carries the whole balance without an answer", () => {
    const decision = parseMonthEndDecision(pendingDecision());
    const built = buildDecisionPlan({
      decision,
      editing: false,
      draft: emptyDraft(),
      accounts,
    });
    expect(built.plan).toEqual({
      savings: [],
      coverage: [],
      exceptionalIncomeMinorUnits: 0,
    });
    expect(previewCarry(15000, built.plan)).toBe(15000);
  });
});

describe("decision input", () => {
  const pending = () => parseMonthEndDecision(pendingDecision());

  it("reports invalid amounts under the field and in the summary", () => {
    const built = buildDecisionPlan({
      decision: pending(),
      editing: false,
      draft: {
        mode: "split",
        amounts: { 12: "12,345", 15: "-4" },
        exceptional: "",
      },
      accounts,
    });
    expect(built.fieldErrors).toEqual({
      12: "Saisissez un montant positif, par exemple 50,00.",
      15: "Saisissez un montant positif, par exemple 50,00.",
    });
    expect(built.errors).toEqual([
      "Voyage au Japon : Saisissez un montant positif, par exemple 50,00.",
      "Épargne de sécurité : Saisissez un montant positif, par exemple 50,00.",
    ]);
  });

  it("refuses more savings than the balance and an incomplete « tout épargner »", () => {
    const over = buildDecisionPlan({
      decision: pending(),
      editing: false,
      draft: {
        mode: "split",
        amounts: { 12: "100", 15: "60" },
        exceptional: "",
      },
      accounts,
    });
    expect(over.errors.map(spaces)).toEqual([
      "L’épargne (160,00 €) dépasse le disponible (150,00 €). Réduisez un montant.",
    ]);
    const all = buildDecisionPlan({
      decision: pending(),
      editing: false,
      draft: { mode: "all", amounts: { 12: "100" }, exceptional: "" },
      accounts,
    });
    expect(all.errors.map(spaces)).toEqual([
      "Pour tout épargner, répartissez encore 50,00 €, ou choisissez « Répartir ».",
    ]);
    const none = buildDecisionPlan({
      decision: pending(),
      editing: false,
      draft: { mode: "split", amounts: {}, exceptional: "" },
      accounts,
    });
    expect(none.errors).toEqual([
      "Indiquez un montant à épargner, ou choisissez « Tout reporter ».",
    ]);
  });

  it("checks the savings funds and the deficit for a coverage", () => {
    const deficit = parseMonthEndDecision({
      ...pendingDecision(),
      resultBeforeDecisionMinorUnits: -15000,
      referenceResultMinorUnits: -15000,
      carryMinorUnits: -15000,
    });
    const poor = decisionAccount(15, "Épargne de sécurité", 4000);
    const funds = buildDecisionPlan({
      decision: deficit,
      editing: false,
      draft: { mode: "cover", amounts: { 15: "50" }, exceptional: "" },
      accounts: [poor],
    });
    expect(spaces(funds.fieldErrors[15] ?? "")).toBe(
      "Fonds insuffisants : Épargne de sécurité contient 40,00 €.",
    );
    const over = buildDecisionPlan({
      decision: deficit,
      editing: false,
      draft: { mode: "cover", amounts: { 15: "100" }, exceptional: "60" },
      accounts,
    });
    expect(over.errors.map(spaces)).toEqual([
      "La couverture (160,00 €) dépasse le déficit (150,00 €). Réduisez un montant.",
    ]);
    const empty = buildDecisionPlan({
      decision: deficit,
      editing: false,
      draft: { mode: "cover", amounts: {}, exceptional: "" },
      accounts,
    });
    expect(empty.errors).toEqual([
      "Indiquez au moins un prélèvement ou une entrée exceptionnelle, ou choisissez « Tout reporter ».",
    ]);
  });

  it("lets a revision keep a withdrawal already made", () => {
    const decided = parseMonthEndDecision(coveredDeficit());
    const empty = decisionAccount(15, "Épargne de sécurité", 0);
    const built = buildDecisionPlan({
      decision: decided,
      editing: true,
      draft: draftFromDecision(decided),
      accounts: [empty],
    });
    expect(built.errors).toEqual([]);
    expect(built.plan.coverage).toEqual([
      { accountId: 15, amountMinorUnits: 5000 },
    ]);
  });

  it("prefills a revision and puts the rest on one account", () => {
    const decided = parseMonthEndDecision(decidedDecision());
    expect(draftFromDecision(decided)).toEqual({
      mode: "split",
      amounts: { 12: "100,00" },
      exceptional: "",
    });
    expect(draftFromDecision(parseMonthEndDecision(coveredDeficit()))).toEqual({
      mode: "cover",
      amounts: { 15: "50,00" },
      exceptional: "70,00",
    });
    expect(
      fillRest(15000, [{ accountId: 12, amountMinorUnits: 10000 }], 15),
    ).toBe("50,00");
    expect(
      fillRest(15000, [{ accountId: 12, amountMinorUnits: 10000 }], 12),
    ).toBe("150,00");
  });

  it("offers active accounts in the currency and archived ones already used", () => {
    const decided = parseMonthEndDecision(decidedDecision());
    const archivedUsed = { ...japan, archived: true };
    const archivedFree = decisionAccount(20, "Travaux", 100, true);
    const dollars = { ...safety, id: 30, currency: "USD" };
    expect(
      decisionAccounts([archivedUsed, archivedFree, dollars, safety], decided),
    ).toEqual([archivedUsed, safety]);
  });
});

describe("month-end texts and states", () => {
  it("only proposes a pending, non-zero balance", () => {
    expect(needsDecision(parseMonthEndDecision(pendingDecision()))).toBe(true);
    expect(
      needsDecision(
        parseMonthEndDecision({
          ...pendingDecision(),
          resultBeforeDecisionMinorUnits: 0,
        }),
      ),
    ).toBe(false);
    expect(needsDecision(parseMonthEndDecision(decidedDecision()))).toBe(false);
  });

  it("cannot keep a split that no longer fits the corrected balance", () => {
    expect(
      canKeepDecision(
        parseMonthEndDecision({
          ...correctedDecision(),
          resultBeforeDecisionMinorUnits: -2000,
        }),
      ),
    ).toBe(false);
  });

  it("hides the Home prompt once the decision is handled", () => {
    const pending = parseMonthEndDecision(pendingDecision());
    expect(homeMonthEnd(null, false)).toEqual({ kind: "none" });
    expect(homeMonthEnd(pending, false)).toEqual({
      kind: "prompt",
      decision: pending,
    });
    expect(homeMonthEnd(pending, true).kind).toBe("reminder");
    const corrected = parseMonthEndDecision(correctedDecision());
    expect(homeMonthEnd(corrected, true).kind).toBe("review");
    // Une décision prise ou une révision acquittée retire le bandeau.
    expect(
      homeMonthEnd(parseMonthEndDecision(decidedDecision()), false),
    ).toEqual({
      kind: "decided",
      decision: parseMonthEndDecision(decidedDecision()),
    });
    expect(
      homeMonthEnd(
        parseMonthEndDecision({
          ...pendingDecision(),
          resultBeforeDecisionMinorUnits: 0,
        }),
        false,
      ).kind,
    ).toBe("none");
  });

  it("explains the carry with « dont » lines", () => {
    expect(
      carryDecisionDetails(parseMonthEndDecision(pendingDecision())),
    ).toEqual([]);
    expect(
      carryDecisionDetails(parseMonthEndDecision(decidedDecision())),
    ).toEqual([
      {
        key: "available",
        label: "dont disponible avant décision",
        amountMinorUnits: 15000,
      },
      {
        key: "savings",
        label: "dont épargné en fin de mois",
        amountMinorUnits: -10000,
      },
    ]);
    expect(
      carryDecisionDetails(parseMonthEndDecision(coveredDeficit())).map(
        (row) => [row.label, row.amountMinorUnits],
      ),
    ).toEqual([
      ["dont déficit avant décision", -15000],
      ["dont prélèvements d’épargne", 5000],
      ["dont entrée exceptionnelle", 7000],
    ]);
  });

  it("translates the contract error codes like the Web", () => {
    expect(monthEndErrorMessage("REVISION_CONFLICT")).toBe(
      "La décision a changé sur un autre appareil. La version la plus récente est affichée : vérifiez-la avant de valider à nouveau.",
    );
    expect(monthEndErrorMessage("PERIOD_NOT_CLOSED")).toBe(
      "Ce mois n’est pas encore terminé. La décision sera proposée le premier jour du mois suivant.",
    );
    expect(monthEndErrorMessage("UNKNOWN", "Repli.")).toBe("Repli.");
    expect(monthEndErrorMessage(null)).toBe(
      "La décision de fin de mois n’a pas pu être chargée. Vérifiez votre connexion puis réessayez.",
    );
  });
});
