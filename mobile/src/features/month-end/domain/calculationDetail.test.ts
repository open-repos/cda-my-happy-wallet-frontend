import { describe, expect, it } from "vitest";

import { BudgetSummary } from "@/src/features/budget/domain/budgetSummary";
import { calculationDetail } from "@/src/features/month-end/domain/calculationDetail";
import { parseMonthEndDecision } from "@/src/features/month-end/domain/monthEnd";
import {
  decidedDecision,
  pendingDecision,
} from "@/src/features/month-end/testing/monthEndFixtures";

const summary = (carryIn: string): BudgetSummary => ({
  month: "2026-11",
  currency: "EUR",
  status: "OPEN",
  carryIn,
  carryFromMonth: "2026-10",
  monthResult: "1180.00",
  realRemaining: (Number(carryIn) + 1180).toFixed(2),
  remainingDays: 20,
  realDailyAllowance: null,
  forecast: null,
  days: [],
});

describe("calculation detail of the Home (#420)", () => {
  it("adds « dont » lines when they explain the carry shown", () => {
    const detail = calculationDetail(
      summary("50.00"),
      parseMonthEndDecision(decidedDecision()),
    );
    expect(
      detail.rows.map((row) => [row.label, row.amountMinorUnits, row.kind]),
    ).toEqual([
      ["Report d’octobre", 5000, "line"],
      ["dont disponible avant décision", 15000, "detail"],
      ["dont épargné en fin de mois", -10000, "detail"],
      ["Résultat de novembre", 118000, "line"],
      ["Reste réel", 123000, "total"],
    ]);
    expect(detail.decided).toBe(true);
  });

  it("says the balance is carried while the decision is pending", () => {
    const detail = calculationDetail(
      summary("150.00"),
      parseMonthEndDecision(pendingDecision()),
    );
    expect(detail.rows.map((row) => row.label)).toEqual([
      "Report d’octobre",
      "Résultat de novembre",
      "Reste réel",
    ]);
    expect(detail.decided).toBe(false);
    expect(detail.pending).toBe(true);
  });

  it("ignores a decision that does not match the carry shown", () => {
    // Deux lectures distinctes : pas de « dont » s'ils ne retombent pas juste.
    const stale = calculationDetail(
      summary("150.00"),
      parseMonthEndDecision(decidedDecision()),
    );
    expect(stale.rows).toHaveLength(3);
    const other = calculationDetail(
      { ...summary("50.00"), carryFromMonth: "2026-09" },
      parseMonthEndDecision(decidedDecision()),
    );
    expect(other.rows[0].label).toBe("Report de septembre");
    expect(other.rows).toHaveLength(3);
    expect(calculationDetail(summary("50.00"), null).rows).toHaveLength(3);
  });
});
