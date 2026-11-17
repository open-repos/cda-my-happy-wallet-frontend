import { describe, expect, it } from "vitest";

import { BudgetSummary } from "@/src/features/budget/domain/budgetSummary";
import { calculationDetail } from "@/src/features/month-end/domain/calculationDetail";
import { parseMonthEndDecision } from "@/src/features/month-end/domain/monthEnd";
import {
  decidedDecision,
  pendingDecision,
} from "@/src/features/month-end/testing/monthEndFixtures";

const spaces = (text: string) => text.replace(/\s/g, " ");

/** Novembre : théorique 1 200 €, 20 € reçus, 40 € dépensés, puis le report. */
const summary = (carryIn: string): BudgetSummary => ({
  month: "2026-11",
  currency: "EUR",
  status: "OPEN",
  base: "1200.00",
  carryIn,
  carryFromMonth: "2026-10",
  actualIncome: "20.00",
  actualExpense: "40.00",
  monthResult: "1180.00",
  realRemaining: (Number(carryIn) + 1180).toFixed(2),
  remainingDays: 20,
  realDailyAllowance: null,
  forecast: null,
  days: [],
});

const withForecast = (base: BudgetSummary): BudgetSummary => ({
  ...base,
  forecast: {
    plannedIncome: "10.00",
    plannedExpense: "300.00",
    goalSavings: "100.00",
    envelopeReserve: "30.00",
    forecastRemaining: (Number(base.realRemaining) - 420).toFixed(2),
    prudentDailyAllowance: "40.50",
    unresolvedCount: 0,
    overdueCount: 0,
  },
});

const rowsOf = (detail: ReturnType<typeof calculationDetail>) =>
  detail.rows.map((row) => [row.label, row.amountMinorUnits, row.kind]);

/** Somme des lignes hors « dont » : elle doit retomber sur le total. */
const cascadeTotal = (detail: ReturnType<typeof calculationDetail>) =>
  detail.rows
    .filter((row) => row.kind === "start" || row.kind === "line")
    .reduce((sum, row) => sum + row.amountMinorUnits, 0);

describe("calculation detail of the Home (#393, from #420)", () => {
  it("goes from the theoretical to the actualized with server amounts", () => {
    const detail = calculationDetail(withForecast(summary("50.00")), null);
    expect(rowsOf(detail)).toEqual([
      ["Reste à vivre théorique", 120000, "start"],
      ["Entrées déjà reçues", 2000, "line"],
      ["Dépenses déjà faites", -4000, "line"],
      ["Report d’octobre", 5000, "line"],
      ["Entrées prévues", 1000, "line"],
      ["Dépenses prévues", -30000, "line"],
      ["Épargne des objectifs", -10000, "line"],
      ["Réserve des enveloppes", -3000, "line"],
      ["Reste à vivre actualisé", 81000, "total"],
    ]);
    expect(cascadeTotal(detail)).toBe(81000);
  });

  it("adds the envelope reconciliation only when the server sends it", () => {
    const detail = calculationDetail(
      { ...summary("50.00"), reconciliationAdjustment: "-12.00" },
      null,
    );
    expect(detail.rows[3]).toMatchObject({
      label: "Rapprochement des enveloppes",
      amountMinorUnits: -1200,
    });
    expect(calculationDetail(summary("50.00"), null).rows).toHaveLength(5);
  });

  it("ends on the real remaining without forecast", () => {
    const detail = calculationDetail(summary("50.00"), null);
    expect(detail.rows.at(-1)).toEqual({
      key: "actualized",
      label: "Reste à vivre actualisé",
      amountMinorUnits: 123000,
      kind: "total",
    });
    expect(cascadeTotal(detail)).toBe(123000);
  });

  it("names a carry without previous month", () => {
    const detail = calculationDetail(
      { ...summary("0.00"), carryFromMonth: null },
      null,
    );
    expect(detail.rows[3].label).toBe("Report du mois précédent");
  });

  it("keeps the « dont » lines of the carry decision (#420)", () => {
    const detail = calculationDetail(
      summary("50.00"),
      parseMonthEndDecision(decidedDecision()),
    );
    expect(rowsOf(detail).slice(3, 6)).toEqual([
      ["Report d’octobre", 5000, "line"],
      ["dont disponible avant décision", 15000, "detail"],
      ["dont épargné en fin de mois", -10000, "detail"],
    ]);
    expect(detail.decided).toBe(true);
    // Les lignes « dont » ne s'ajoutent pas une seconde fois.
    expect(cascadeTotal(detail)).toBe(123000);
  });

  it("says the balance is carried while the decision is pending", () => {
    const detail = calculationDetail(
      summary("150.00"),
      parseMonthEndDecision(pendingDecision()),
    );
    expect(detail.rows.some((row) => row.kind === "detail")).toBe(false);
    expect(detail.decided).toBe(false);
    expect(detail.pending).toBe(true);
  });

  it("ignores a decision that does not match the carry shown", () => {
    // Deux lectures distinctes : pas de « dont » s'ils ne retombent pas juste.
    const stale = calculationDetail(
      summary("150.00"),
      parseMonthEndDecision(decidedDecision()),
    );
    expect(stale.decided).toBe(false);
    const other = calculationDetail(
      { ...summary("50.00"), carryFromMonth: "2026-09" },
      parseMonthEndDecision(decidedDecision()),
    );
    expect(other.rows[3].label).toBe("Report de septembre");
    expect(other.decided).toBe(false);
  });

  it("compares the actualized and the theoretical share per day", () => {
    const perDay = calculationDetail(
      withForecast(summary("50.00")),
      null,
    ).perDay;
    expect(spaces(perDay.actual?.amount ?? "")).toBe("40,50 €");
    expect(spaces(perDay.actual?.help ?? "")).toBe(
      "810,00 € ÷ 20 jours restants",
    );
    expect(spaces(perDay.theoretical.amount)).toBe("40,00 €");
    expect(spaces(perDay.theoretical.help)).toBe("1 200,00 € ÷ 30 jours");
    expect(
      calculationDetail({ ...summary("50.00"), remainingDays: 0 }, null).perDay
        .actual,
    ).toBeNull();
  });
});
