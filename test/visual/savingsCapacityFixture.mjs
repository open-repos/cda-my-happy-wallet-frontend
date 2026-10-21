import { forecastFixture } from "./forecastFixture.mjs";

/** Synthetic contract, including unknown deadlines and zero-contribution exclusions. */
export const savingsCapacityFixture = (url, goals) => {
  const forecast = forecastFixture(url);
  const planned = goals.reduce(
    (sum, goal) => sum + Math.round(Number(goal.monthlyContribution) * 100),
    0
  );
  const active = goals.filter((goal) => goal.forecast.status !== "REACHED");
  const included = active.filter(
    (goal) => Number(goal.monthlyContribution) > 0
  );
  const unknown = included.filter(
    (goal) => goal.forecast.requiredMonthlyContribution === null
  );
  const required = unknown.length
    ? null
    : included.reduce(
        (sum, goal) =>
          sum +
          Math.round(Number(goal.forecast.requiredMonthlyContribution) * 100),
        0
      );
  const money = (value) => (value === null ? null : (value / 100).toFixed(2));
  const month = forecast.months[0];
  const before = Math.round(Number(month.forecastRemaining) * 100) + 15000;
  const afterPlanned = before - planned;
  const afterRequired = required === null ? null : before - required;
  return {
    from: forecast.from,
    currency: forecast.currency,
    referenceDate: forecast.referenceDate,
    totalPlannedMonthlyContribution: money(planned),
    totalRequiredMonthlyContribution: money(required),
    unassessableCount: unknown.length,
    goals: active.map((goal) => ({
      id: goal.id,
      title: goal.title,
      targetDate: goal.targetDate,
      plannedMonthlyContribution: goal.monthlyContribution,
      requiredMonthlyContribution: goal.forecast.requiredMonthlyContribution,
      monthlyContributionGap:
        goal.forecast.requiredMonthlyContribution === null
          ? null
          : money(
              Math.round(
                Number(goal.forecast.requiredMonthlyContribution) * 100
              ) - Math.round(Number(goal.monthlyContribution) * 100)
            ),
      includedInTotals: Number(goal.monthlyContribution) > 0,
      status: goal.forecast.status,
    })),
    months: [
      {
        month: month.month,
        beforeGoals: money(before),
        afterPlanned: money(afterPlanned),
        afterRequired: money(afterRequired),
        sustainability:
          afterPlanned < 0 || (afterRequired !== null && afterRequired < 0)
            ? "NON_TENABLE"
            : afterRequired === null
            ? "INDETERMINE"
            : afterPlanned === 0 || afterRequired === 0
            ? "TENDU"
            : "TENABLE",
      },
    ],
  };
};
