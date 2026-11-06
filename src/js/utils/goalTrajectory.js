import { shiftForecastMonth } from "./budgetForecast";

const cents = (amount) => {
  const [whole, fraction] = amount.split(".");
  return Number(whole) * 100 + Number(fraction);
};
const amountOf = (value) =>
  `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;

/**
 * Visual samples of the existing goal forecast, not a budget allocation.
 * Dates/statuses/counts remain server-owned. The current reservation is never
 * added to declared savings; the first sample payment is the following month.
 */
export const goalTrajectoryPoints = (goal, horizon = 12) => {
  const saved = cents(goal.savedAmount);
  const target = cents(goal.targetAmount);
  const payment = cents(goal.monthlyContribution);
  const points = [
    { month: goal.forecast.referenceMonth, amount: goal.savedAmount },
  ];
  if (goal.forecast.status === "REACHED" || payment === 0) return points;
  const count = Math.min(horizon, goal.forecast.contributionsNeeded ?? horizon);
  for (let offset = 1; offset <= count; offset += 1) {
    points.push({
      month: shiftForecastMonth(goal.forecast.referenceMonth, offset),
      amount: amountOf(Math.min(target, saved + payment * offset)),
    });
  }
  return points;
};
