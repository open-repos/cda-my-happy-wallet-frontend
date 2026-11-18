import { describe, expect, it } from "vitest";
import {
  buildDecisionPlan,
  canKeepDecision,
  carryDecisionDetails,
  carryBeforeCorrection,
  decisionMode,
  draftFromDecision,
  needsDecision,
  newDecisionKey,
  previewCarry,
  previousParisMonth,
} from "../../src/js/utils/monthEnd";
import {
  decidedDecision,
  deficitDecision,
  pendingDecision,
  reviewDecision,
} from "../fixtures/monthEnd.mjs";

const accounts = [
  { id: 1, name: "Voyage au Japon", balanceMinorUnits: 243000 },
  { id: 2, name: "Épargne de sécurité", balanceMinorUnits: 390000 },
];

describe("previousParisMonth", () => {
  it("uses the Paris civil date, including the first hours of a month", () => {
    expect(previousParisMonth(new Date("2026-11-01T00:30:00+01:00"))).toBe(
      "2026-10"
    );
    expect(previousParisMonth(new Date("2026-10-31T23:30:00Z"))).toBe(
      "2026-10"
    );
    expect(previousParisMonth(new Date("2027-01-15T12:00:00Z"))).toBe(
      "2026-12"
    );
  });
});

describe("needsDecision", () => {
  it("asks only for a pending, non-zero closed month", () => {
    expect(needsDecision(pendingDecision())).toBe(true);
    expect(needsDecision(decidedDecision())).toBe(false);
    expect(
      needsDecision(pendingDecision({ resultBeforeDecisionMinorUnits: 0 }))
    ).toBe(false);
  });
});

describe("previewCarry", () => {
  it("applies the validated formula on integer cents", () => {
    const plan = (savings, coverage, exceptional) => ({
      savings: savings.map((amountMinorUnits, i) => ({
        accountId: i + 1,
        amountMinorUnits,
      })),
      coverage: coverage.map((amountMinorUnits, i) => ({
        accountId: i + 1,
        amountMinorUnits,
      })),
      exceptionalIncomeMinorUnits: exceptional,
    });
    expect(previewCarry(15000, plan([], [], 0))).toBe(15000);
    expect(previewCarry(15000, plan([10000], [], 0))).toBe(5000);
    expect(previewCarry(12000, plan([10000], [], 0))).toBe(2000);
    expect(previewCarry(-15000, plan([], [5000], 7000))).toBe(-3000);
  });
});

describe("carryBeforeCorrection", () => {
  it("restores the carry known when the decision was taken", () => {
    expect(carryBeforeCorrection(reviewDecision())).toBe(5000);
    expect(carryBeforeCorrection(decidedDecision())).toBe(5000);
  });
});

describe("decisionMode and draftFromDecision", () => {
  it("derives the initial choice from the current allocations", () => {
    expect(decisionMode(pendingDecision())).toBe("carry");
    expect(decisionMode(decidedDecision())).toBe("split");
    expect(
      decisionMode(
        decidedDecision({
          savings: [{ accountId: 1, amountMinorUnits: 15000 }],
          savingsMinorUnits: 15000,
          carryMinorUnits: 0,
        })
      )
    ).toBe("all");
    expect(decisionMode(deficitDecision())).toBe("cover");
  });
  it("prefills French decimal inputs", () => {
    expect(draftFromDecision(decidedDecision())).toEqual({
      mode: "split",
      amounts: { 1: "100,00" },
      exceptional: "",
    });
    expect(draftFromDecision(deficitDecision()).exceptional).toBe("70,00");
  });
});

describe("buildDecisionPlan", () => {
  const surplus = (mode, amounts) =>
    buildDecisionPlan({
      result: 15000,
      draft: { mode, amounts, exceptional: "" },
      accounts,
    });
  const deficit = (mode, amounts, exceptional = "", decision = null) =>
    buildDecisionPlan({
      result: -15000,
      draft: { mode, amounts, exceptional },
      accounts,
      decision,
    });

  it("keeps everything carried with an empty plan", () => {
    expect(surplus("carry", { 1: "100" })).toEqual({
      plan: { savings: [], coverage: [], exceptionalIncomeMinorUnits: 0 },
      errors: [],
      fieldErrors: {},
    });
  });
  it("splits 150 € into 100 € saved and 50 € carried", () => {
    const result = surplus("split", { 1: "100", 2: "" });
    expect(result.errors).toEqual([]);
    expect(result.plan.savings).toEqual([
      { accountId: 1, amountMinorUnits: 10000 },
    ]);
    expect(previewCarry(15000, result.plan)).toBe(5000);
  });
  it("requires the whole balance to save everything", () => {
    expect(surplus("all", { 1: "100" }).errors[0]).toMatch(/50,00/);
    expect(surplus("all", { 1: "100", 2: "50" }).errors).toEqual([]);
  });
  it("refuses savings above the available balance or invalid input", () => {
    expect(surplus("split", { 1: "200" }).errors[0]).toMatch(/dépasse/);
    const invalid = surplus("split", { 1: "1e3" });
    expect(invalid.fieldErrors[1]).toMatch(/montant/);
    expect(surplus("split", {}).errors[0]).toMatch(/Indiquez/);
  });
  it("covers 150 € with 50 € of savings and 70 € of exceptional income", () => {
    const result = deficit("cover", { 2: "50" }, "70");
    expect(result.errors).toEqual([]);
    expect(result.plan).toEqual({
      savings: [],
      coverage: [{ accountId: 2, amountMinorUnits: 5000 }],
      exceptionalIncomeMinorUnits: 7000,
    });
    expect(previewCarry(-15000, result.plan)).toBe(-3000);
  });
  it("refuses a coverage above the deficit or the account balance", () => {
    expect(deficit("cover", { 2: "50" }, "200").errors[0]).toMatch(/dépasse/);
    expect(deficit("cover", { 2: "3900,01" }).fieldErrors[2]).toMatch(
      /Fonds insuffisants/
    );
    // A revision may keep the amount already withdrawn from this account.
    expect(
      deficit("cover", { 2: "3950" }, "", deficitDecision()).fieldErrors[2]
    ).toBeUndefined();
  });
  it("asks for at least one source when covering", () => {
    expect(deficit("cover", {}).errors[0]).toMatch(/Indiquez/);
  });
});

describe("newDecisionKey", () => {
  it("matches the backend key format and changes on every attempt", () => {
    const first = newDecisionKey("2026-10");
    expect(first).toMatch(/^[A-Za-z0-9:_-]{8,100}$/);
    expect(first.startsWith("month-end:")).toBe(false);
    expect(newDecisionKey("2026-10")).not.toBe(first);
  });
});

describe("carryDecisionDetails", () => {
  it("explains a decided carry with signed decimal amounts", () => {
    expect(carryDecisionDetails(reviewDecision())).toEqual([
      {
        key: "available",
        label: "dont disponible avant décision",
        amount: "120.00",
      },
      {
        key: "savings",
        label: "dont épargné en fin de mois",
        amount: "-100.00",
      },
    ]);
    expect(
      carryDecisionDetails(deficitDecision()).map((row) => row.amount)
    ).toEqual(["-150.00", "50.00", "70.00"]);
    expect(carryDecisionDetails(pendingDecision())).toEqual([]);
  });
});

describe("canKeepDecision", () => {
  it("allows keeping only a plan still valid for the corrected balance", () => {
    expect(canKeepDecision(reviewDecision())).toBe(true);
    expect(canKeepDecision(deficitDecision())).toBe(true);
    // 150 € − 60 € de dépense oubliée : 100 € épargnés dépassent 90 €.
    expect(
      canKeepDecision(decidedDecision({ resultBeforeDecisionMinorUnits: 9000 }))
    ).toBe(false);
    // Le solde devient négatif : l'épargne n'est plus possible.
    expect(
      canKeepDecision(
        decidedDecision({ resultBeforeDecisionMinorUnits: -1000 })
      )
    ).toBe(false);
  });
  it("does not prefill savings as a withdrawal after a sign change", () => {
    expect(
      draftFromDecision(
        decidedDecision({ resultBeforeDecisionMinorUnits: -1000 })
      ).amounts
    ).toEqual({});
  });
});
