import { describe, expect, it } from "vitest";

import { BudgetForecast } from "@/src/features/forecast/domain/budgetForecast";
import {
  compareScenarios,
  withScenario,
} from "@/src/features/simulation/domain/scenario";

const forecast = (
  remaining: string,
  overrides: Partial<BudgetForecast> = {},
): BudgetForecast => ({
  from: "2026-10",
  currency: "EUR",
  referenceDate: "2026-10-22",
  currentRealRemaining: "1000.00",
  months: [
    {
      month: "2026-10",
      fixedIncome: "0.00",
      fixedExpense: "0.00",
      base: "0.00",
      carryIn: "0.00",
      plannedIncome: "0.00",
      plannedExpense: "0.00",
      goalSavings: "0.00",
      forecastResult: "0.00",
      forecastRemaining: remaining,
      prudentDailyAllowance: "0.00",
      prudentWeeklyAllowance: "0.00",
      prudentMonthlyAllowance: "0.00",
      remainingDays: 10,
    },
  ],
  ...overrides,
});

describe("simulation scenario (#240)", () => {
  it("adds the scenario only for the simulation", () => {
    expect(
      withScenario(new URLSearchParams({ currency: "EUR" })).toString(),
    ).toBe("currency=EUR");
    expect(
      withScenario(
        new URLSearchParams({ currency: "EUR" }),
        "simulation",
      ).toString(),
    ).toBe("currency=EUR&scenario=simulation");
  });

  it("compares the month-end balances of both scenarios", () => {
    expect(compareScenarios(forecast("1430.00"), forecast("1180.00"))).toEqual({
      month: "2026-10",
      currency: "EUR",
      standardRemaining: "1430.00",
      simulationRemaining: "1180.00",
    });
  });

  it("refuses two reads that do not match", () => {
    expect(() =>
      compareScenarios(
        forecast("1430.00"),
        forecast("1180.00", { referenceDate: "2026-10-23" }),
      ),
    ).toThrow("Inconsistent simulation comparison");
    expect(() =>
      compareScenarios(
        forecast("1430.00"),
        forecast("1180.00", { months: [] }),
      ),
    ).toThrow();
    for (const mismatch of [{ from: "2026-11" }, { currency: "USD" }]) {
      expect(() =>
        compareScenarios(forecast("1430.00"), forecast("1180.00", mismatch)),
      ).toThrow("Inconsistent simulation comparison");
    }
  });
});
