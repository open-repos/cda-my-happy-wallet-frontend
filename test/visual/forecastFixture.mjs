const amount = (cents) => (cents / 100).toFixed(2);
const monthAt = (offset) => {
  const date = new Date(Date.UTC(2026, 9 + offset, 1));
  return date.toISOString().slice(0, 7);
};

/** Synthetic API output shared by browser journeys and visual references. */
export const forecastFixture = (url) => {
  const params = new URL(url).searchParams;
  const from = params.get("from") || "2026-10";
  const count = Number(params.get("months") || 12);
  const offset =
    (Number(from.slice(0, 4)) - 2026) * 12 + Number(from.slice(5, 7)) - 10;
  let remaining = 103750;
  const months = [];
  for (let index = 0; index < offset + count; index += 1) {
    const month = monthAt(index);
    const carry = remaining;
    const expense = [12000, 24000, 300000][index] ?? 12000;
    const days =
      index === 0
        ? 14
        : new Date(
            Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)
          ).getUTCDate();
    remaining += (index === 0 ? 0 : 120000) - expense - 15000;
    months.push({
      month,
      fixedIncome: "2000.00",
      fixedExpense: "800.00",
      base: "1200.00",
      carryIn: amount(carry),
      plannedIncome: "0.00",
      plannedExpense: amount(expense),
      goalSavings: "150.00",
      forecastResult: amount(remaining - carry),
      forecastRemaining: amount(remaining),
      remainingDays: days,
      prudentDailyAllowance: amount(Math.round(remaining / days)),
      prudentWeeklyAllowance: amount(
        Math.round((remaining * Math.min(7, days)) / days)
      ),
      prudentMonthlyAllowance: amount(remaining),
    });
  }
  return {
    from,
    currency: params.get("currency") || "EUR",
    referenceDate: "2026-10-18",
    currentRealRemaining: "1037.50",
    months: months.slice(offset),
  };
};
