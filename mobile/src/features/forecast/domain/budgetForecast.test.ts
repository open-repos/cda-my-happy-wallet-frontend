import { describe, expect, it } from "vitest";

import {
  isNegativeAmount,
  parseBudgetForecast,
  shiftMonth,
} from "@/src/features/forecast/domain/budgetForecast";

const month = (value: string, overrides: Record<string, unknown> = {}) => ({
  month: value,
  fixedIncome: "2500.00",
  fixedExpense: "1200.00",
  base: "1300.00",
  carryIn: "400.00",
  plannedIncome: "0.00",
  plannedExpense: "120.00",
  goalSavings: "150.00",
  forecastResult: "1030.00",
  forecastRemaining: "1430.00",
  prudentDailyAllowance: "46.12",
  prudentWeeklyAllowance: "322.84",
  prudentMonthlyAllowance: "1430.00",
  remainingDays: 31,
  ...overrides,
});
const forecast = {
  from: "2026-12",
  currency: "EUR",
  referenceDate: "2026-12-01",
  currentRealRemaining: "400.00",
  months: [month("2026-12"), month("2027-01", { forecastRemaining: "-35.50" })],
};

describe("budget forecast domain (#214)", () => {
  it("shifts months across years", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", 23)).toBe("2027-12");
  });

  it("keeps the public forecast fields", () => {
    const parsed = parseBudgetForecast({ ...forecast, ownerId: 1 });
    expect(parsed.months).toHaveLength(2);
    expect(parsed.months[1].forecastRemaining).toBe("-35.50");
    expect(parsed).not.toHaveProperty("ownerId");
  });

  it("rejects months out of order and malformed amounts", () => {
    expect(() =>
      parseBudgetForecast({
        ...forecast,
        months: [month("2026-12"), month("2027-02")],
      }),
    ).toThrow();
    expect(() =>
      parseBudgetForecast({
        ...forecast,
        months: [month("2026-12", { goalSavings: 150 })],
      }),
    ).toThrow();
    expect(() =>
      parseBudgetForecast({
        ...forecast,
        months: [month("2026-12", { remainingDays: 0 })],
      }),
    ).toThrow();
    expect(() =>
      parseBudgetForecast({ ...forecast, referenceDate: "2026-02-30" }),
    ).toThrow();
    expect(() =>
      parseBudgetForecast({ ...forecast, currency: "eur" }),
    ).toThrow();
    expect(() =>
      parseBudgetForecast({
        ...forecast,
        from: "2026-01",
        months: Array.from({ length: 25 }, (_, index) =>
          month(shiftMonth("2026-01", index)),
        ),
      }),
    ).toThrow();
    expect(() => parseBudgetForecast(null)).toThrow();
  });

  it("detects negative amounts without relying on number formatting", () => {
    expect(isNegativeAmount("-0.01")).toBe(true);
    expect(isNegativeAmount("0.00")).toBe(false);
    expect(isNegativeAmount("-0.00")).toBe(false);
    expect(isNegativeAmount("12.00")).toBe(false);
  });
});
