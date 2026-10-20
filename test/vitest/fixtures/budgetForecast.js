export const forecastMonth = (overrides = {}) => ({
  month: "2026-10",
  fixedIncome: "2000.00",
  fixedExpense: "800.00",
  base: "1200.00",
  carryIn: "1000.00",
  plannedIncome: "50.00",
  plannedExpense: "200.00",
  goalSavings: "150.00",
  forecastResult: "-300.00",
  forecastRemaining: "700.00",
  remainingDays: 13,
  prudentDailyAllowance: "53.85",
  prudentWeeklyAllowance: "376.92",
  prudentMonthlyAllowance: "700.00",
  ...overrides,
});

export const budgetForecast = (overrides = {}) => ({
  from: "2026-10",
  currency: "EUR",
  referenceDate: "2026-10-19",
  currentRealRemaining: "1000.00",
  months: [
    forecastMonth(),
    forecastMonth({
      month: "2026-11",
      carryIn: "700.00",
      plannedExpense: "3000.00",
      forecastResult: "-1900.00",
      forecastRemaining: "-1200.00",
      remainingDays: 30,
      prudentDailyAllowance: "-40.00",
      prudentWeeklyAllowance: "-280.00",
      prudentMonthlyAllowance: "-1200.00",
    }),
  ],
  ...overrides,
});
