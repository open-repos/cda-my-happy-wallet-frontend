import { describe, expect, it } from "vitest";
import {
  expensesByCategory,
  goalsProgress,
  periodRemaining,
} from "../../src/js/utils/homeBudget";

const summary = (overrides = {}) => ({
  realRemaining: "1037.50",
  remainingDays: 12,
  realDailyAllowance: "86.46",
  forecast: { prudentDailyAllowance: "63.96" },
  ...overrides,
});

describe("periodRemaining", () => {
  it("uses the real remaining for the month", () => {
    expect(periodRemaining(summary(), "mois")).toEqual({
      amount: "1037.50",
      basis: "real",
      days: null,
    });
  });

  it("uses the prudent daily allowance for the day", () => {
    expect(periodRemaining(summary(), "jour")).toEqual({
      amount: "63.96",
      basis: "prudent",
      days: 1,
    });
  });

  it("multiplies the prudent allowance by seven days in cents", () => {
    // 6396 centimes × 7 = 44772 centimes.
    expect(periodRemaining(summary(), "semaine")).toEqual({
      amount: "447.72",
      basis: "prudent",
      days: 7,
    });
  });

  it("caps the week to the days left in the month", () => {
    expect(periodRemaining(summary({ remainingDays: 3 }), "semaine")).toEqual({
      amount: "191.88",
      basis: "prudent",
      days: 3,
    });
  });

  it("keeps a negative allowance signed", () => {
    expect(
      periodRemaining(
        summary({ forecast: { prudentDailyAllowance: "-20.05" } }),
        "semaine"
      ).amount
    ).toBe("-140.35");
  });

  it("falls back to the real daily allowance without forecast", () => {
    expect(periodRemaining(summary({ forecast: null }), "jour")).toEqual({
      amount: "86.46",
      basis: "real",
      days: 1,
    });
  });

  it("returns no amount when no day is left", () => {
    expect(
      periodRemaining(
        summary({
          remainingDays: 0,
          realDailyAllowance: null,
          forecast: { prudentDailyAllowance: null },
        }),
        "semaine"
      )
    ).toEqual({ amount: null, basis: "real", days: 0 });
  });
});

describe("expensesByCategory", () => {
  const categories = [
    { id: 4, name: "Alimentation", color: "#55AA22", icon: "solid:utensils" },
    { id: 5, name: "Loisirs", color: null },
  ];

  it("sums only expenses per category, largest first, in cents", () => {
    const operations = [
      { type: "DEPENSE", amount: "42.50", categoryId: 4, currency: "EUR" },
      { type: "DEPENSE", amount: "0.10", categoryId: 4, currency: "EUR" },
      { type: "DEPENSE", amount: "0.20", categoryId: 4, currency: "EUR" },
      { type: "DEPENSE", amount: "60.00", categoryId: 5, currency: "EUR" },
      { type: "ENTREE", amount: "500.00", categoryId: 4, currency: "EUR" },
      { type: "DEPENSE", amount: "9.00", categoryId: 4, currency: "USD" },
    ];

    expect(expensesByCategory(operations, categories, "EUR")).toEqual([
      {
        id: 5,
        name: "Loisirs",
        color: null,
        icon: null,
        amount: "60.00",
        share: 1,
      },
      {
        id: 4,
        name: "Alimentation",
        color: "#55AA22",
        icon: "solid:utensils",
        amount: "42.80",
        share: 4280 / 6000,
      },
    ]);
  });

  it("names an unknown category explicitly", () => {
    expect(
      expensesByCategory(
        [{ type: "DEPENSE", amount: "5.00", categoryId: 9, currency: "EUR" }],
        categories,
        "EUR"
      )[0].name
    ).toBe("Autre catégorie");
  });

  it("returns an empty list without expenses", () => {
    expect(expensesByCategory([], categories, "EUR")).toEqual([]);
  });
});

describe("goalsProgress", () => {
  const goal = (overrides) => ({
    id: 1,
    title: "Vélo",
    targetAmount: "1200.00",
    savedAmount: "300.00",
    currency: "EUR",
    ...overrides,
  });

  it("aggregates saved and target amounts of the currency", () => {
    expect(
      goalsProgress(
        [
          goal(),
          goal({ id: 2, targetAmount: "800.00", savedAmount: "200.00" }),
          goal({ id: 3, currency: "USD", savedAmount: "1200.00" }),
        ],
        "EUR"
      )
    ).toEqual({
      saved: "500.00",
      target: "2000.00",
      percent: 25,
      goals: [
        {
          id: 1,
          title: "Vélo",
          saved: "300.00",
          target: "1200.00",
          percent: 25,
        },
        {
          id: 2,
          title: "Vélo",
          saved: "200.00",
          target: "800.00",
          percent: 25,
        },
      ],
    });
  });

  it("caps an exceeded goal at 100 percent", () => {
    const progress = goalsProgress([goal({ savedAmount: "1500.00" })], "EUR");
    expect(progress.goals[0].percent).toBe(100);
    expect(progress.percent).toBe(100);
  });

  it("floors the percent so a goal is never shown reached too early", () => {
    expect(
      goalsProgress([goal({ savedAmount: "1199.99" })], "EUR").percent
    ).toBe(99);
  });

  it("returns null without goal in the currency", () => {
    expect(goalsProgress([goal({ currency: "USD" })], "EUR")).toBeNull();
  });
});
