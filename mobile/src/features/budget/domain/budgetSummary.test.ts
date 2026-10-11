import { describe, expect, it } from "vitest";

import {
  buildSummaryCards,
  currentParisMonth,
  parseBudgetSummary,
} from "@/src/features/budget/domain/budgetSummary";

const raw = (overrides: Record<string, unknown> = {}) => ({
  month: "2026-10",
  currency: "EUR",
  status: "OPEN",
  revision: 1,
  correctedAt: null,
  balanceStatus: "POSITIVE",
  fixedIncome: "2400.00",
  fixedExpense: "900.00",
  base: "1500.00",
  carryIn: "-120.00",
  carryFromMonth: "2026-09",
  actualIncome: "0.00",
  actualExpense: "42.50",
  monthResult: "1457.50",
  realRemaining: "1337.50",
  remainingDays: 21,
  realDailyAllowance: "63.69",
  unresolvedEvents: 1,
  forecast: {
    plannedIncome: "0.00",
    plannedExpense: "300.00",
    goalSavings: "150.00",
    forecastRemaining: "887.50",
    prudentDailyAllowance: "42.26",
    unresolvedCount: 1,
    overdueCount: 1,
  },
  days: [],
  ...overrides,
});

const normalize = (text: string) => text.replace(/\s/g, " ");

describe("parseBudgetSummary", () => {
  it("keeps the documented fields only", () => {
    const summary = parseBudgetSummary({ ...raw(), ownerId: 9 });
    expect(summary.realRemaining).toBe("1337.50");
    expect(summary.forecast?.prudentDailyAllowance).toBe("42.26");
    expect(summary).not.toHaveProperty("ownerId");
  });

  it.each([
    raw({ month: "2026-13" }),
    raw({ realRemaining: 1337.5 }),
    raw({ remainingDays: -1 }),
    raw({ carryFromMonth: "septembre" }),
    raw({ forecast: { forecastRemaining: "1.00" } }),
    raw({ days: new Array(32).fill(null) }),
  ])("rejects an invalid summary %#", (invalid) => {
    expect(() => parseBudgetSummary(invalid)).toThrow("Invalid budget summary");
  });
});

describe("currentParisMonth", () => {
  it("follows the Europe/Paris civil date", () => {
    expect(currentParisMonth(new Date("2026-10-31T23:30:00.000Z"))).toBe(
      "2026-11",
    );
  });
});

describe("buildSummaryCards", () => {
  it("separates the carry line and explains a deficit", () => {
    const { real } = buildSummaryCards(parseBudgetSummary(raw()));
    expect(normalize(real.amount)).toBe("1 337,50 €");
    expect({ ...real.carry, amount: normalize(real.carry!.amount) }).toEqual({
      label: "Report de septembre",
      amount: "-120,00 €",
      tone: "negative",
    });
    expect(normalize(real.monthResult)).toBe("+1 457,50 €");
    expect(real.help).toBe(
      "Le déficit de septembre est déduit de ce mois. Le résultat du mois correspond à vos revenus et charges fixes, plus vos entrées, moins vos dépenses.",
    );
    expect(normalize(real.accessibilityLabel)).toBe(
      "Reste réel 1 337,50 €. Report de septembre -120,00 €. Résultat du mois +1 457,50 €. Le déficit de septembre est déduit de ce mois. Le résultat du mois correspond à vos revenus et charges fixes, plus vos entrées, moins vos dépenses.",
    );
  });

  it("uses the elided month name and hides the first-month carry", () => {
    expect(
      buildSummaryCards(
        parseBudgetSummary(
          raw({ carryFromMonth: "2026-08", carryIn: "40.00" }),
        ),
      ).real.carry?.label,
    ).toBe("Report d’août");
    const first = buildSummaryCards(
      parseBudgetSummary(raw({ carryFromMonth: null, carryIn: "0.00" })),
    ).real;
    expect(first.carry).toBeNull();
    expect(first.help).toBe(
      "Le résultat du mois correspond à vos revenus et charges fixes, plus vos entrées, moins vos dépenses.",
    );
  });

  it("details the forecast and the prudent daily allowance", () => {
    const { forecast, prudent } = buildSummaryCards(parseBudgetSummary(raw()));
    expect(normalize(forecast!.amount)).toBe("887,50 €");
    expect(
      forecast!.lines.map(([label, value]) => `${label} ${normalize(value)}`),
    ).toEqual([
      "Dépenses prévues -300,00 €",
      "Entrées prévues 0,00 €",
      "Épargne des objectifs -150,00 €",
    ]);
    expect(forecast!.overdue).toBe("1 événement en retard à traiter.");
    expect(normalize(prudent!.amount)).toBe("42,26 €");
    expect(normalize(prudent!.help)).toBe(
      "Votre reste prévisionnel (887,50 €) réparti sur les 21 jours restants du mois, jour courant inclus.",
    );
  });

  it("never shows a signed or negative zero", () => {
    const { forecast } = buildSummaryCards(
      parseBudgetSummary(
        raw({
          forecast: {
            ...raw().forecast,
            plannedExpense: "0.00",
            goalSavings: "0.00",
          },
        }),
      ),
    );
    expect(forecast!.lines.map(([, value]) => normalize(value))).toEqual([
      "0,00 €",
      "0,00 €",
      "0,00 €",
    ]);
  });

  it("explains a negative prudent allowance", () => {
    const { prudent } = buildSummaryCards(
      parseBudgetSummary(
        raw({
          forecast: {
            ...raw().forecast,
            forecastRemaining: "-60.00",
            prudentDailyAllowance: "-20.00",
          },
          remainingDays: 3,
        }),
      ),
    );
    expect(prudent!.tone).toBe("negative");
    expect(prudent!.help).toContain(
      "Un montant négatif indique l’effort quotidien nécessaire pour finir le mois à l’équilibre.",
    );
  });

  it("has no forecast cards for a closed month", () => {
    const cards = buildSummaryCards(
      parseBudgetSummary(raw({ status: "CLOSED", forecast: null })),
    );
    expect(cards.forecast).toBeNull();
    expect(cards.prudent).toBeNull();
  });
});
