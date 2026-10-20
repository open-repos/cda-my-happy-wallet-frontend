import { apiPrivate } from "../../utils/axiosHelper";
import { isForecastMonth } from "../utils/budgetForecast";
import { scenarioParams } from "../utils/budgetSimulation";
import {
  budgetForecastService,
  isForecastAmount,
  isForecastDate,
} from "./budgetForecastService";

const invalid = () => {
  throw new Error("Invalid savings capacity response");
};
const positive = (value) => isForecastAmount(value) && !value.startsWith("-");
const optional = (value, validator = isForecastAmount) =>
  value === null || validator(value);
const statuses = ["TENABLE", "TENDU", "NON_TENABLE", "INDETERMINE"];

/** Boundary DTO only: amounts, gaps and sustainability are calculated by the API. */
export const parseSavingsCapacity = (data) => {
  if (
    !isForecastMonth(data?.from) ||
    !/^[A-Z]{3}$/.test(data?.currency || "") ||
    !isForecastDate(data?.referenceDate) ||
    !positive(data?.totalPlannedMonthlyContribution) ||
    !optional(data?.totalRequiredMonthlyContribution, positive) ||
    !Number.isInteger(data?.unassessableCount) ||
    data.unassessableCount < 0 ||
    !Array.isArray(data?.goals) ||
    !Array.isArray(data?.months) ||
    data.months.length !== 1
  )
    invalid();
  const ids = new Set();
  const goals = data.goals.map((goal) => {
    if (
      !Number.isSafeInteger(goal?.id) ||
      goal.id <= 0 ||
      ids.has(goal.id) ||
      typeof goal.title !== "string" ||
      goal.title.length < 2 ||
      goal.title.length > 50 ||
      !optional(goal.targetDate, isForecastDate) ||
      !positive(goal.plannedMonthlyContribution) ||
      !optional(goal.requiredMonthlyContribution, positive) ||
      !optional(goal.monthlyContributionGap) ||
      typeof goal.includedInTotals !== "boolean" ||
      !["NO_DEADLINE", "ON_TRACK", "BEHIND", "MISSED"].includes(goal.status)
    )
      invalid();
    ids.add(goal.id);
    return Object.fromEntries(
      [
        "id",
        "title",
        "targetDate",
        "plannedMonthlyContribution",
        "requiredMonthlyContribution",
        "monthlyContributionGap",
        "includedInTotals",
        "status",
      ].map((key) => [key, goal[key]])
    );
  });
  const month = data.months[0];
  if (
    month?.month !== data.from ||
    !isForecastAmount(month.beforeGoals) ||
    !isForecastAmount(month.afterPlanned) ||
    !optional(month.afterRequired) ||
    !statuses.includes(month.sustainability) ||
    data.unassessableCount > goals.length
  )
    invalid();
  return {
    from: data.from,
    currency: data.currency,
    referenceDate: data.referenceDate,
    totalPlannedMonthlyContribution: data.totalPlannedMonthlyContribution,
    totalRequiredMonthlyContribution: data.totalRequiredMonthlyContribution,
    unassessableCount: data.unassessableCount,
    goals,
    months: [
      Object.fromEntries(
        [
          "month",
          "beforeGoals",
          "afterPlanned",
          "afterRequired",
          "sustainability",
        ].map((key) => [key, month[key]])
      ),
    ],
  };
};

export const savingsCapacityService = {
  async overview({ from, currency = "EUR", scenario = "standard" }) {
    if (!isForecastMonth(from) || !/^[A-Z]{3}$/.test(currency)) invalid();
    const query = { from, months: 1, currency, ...scenarioParams(scenario) };
    const [response, projection] = await Promise.all([
      apiPrivate.get("/savings-capacity", {
        params: query,
        withCredentials: true,
      }),
      budgetForecastService.forecast(query),
    ]);
    const capacity = parseSavingsCapacity(response.data?.data);
    const forecast = projection.months[0];
    // Two reads may straddle a concurrent edit: never combine mismatched money.
    if (
      !forecast ||
      capacity.from !== from ||
      capacity.currency !== currency ||
      capacity.referenceDate !== projection.referenceDate ||
      capacity.months[0].afterPlanned !== forecast.forecastRemaining
    )
      invalid();
    return {
      ...capacity,
      allowances: {
        monthly: forecast.prudentMonthlyAllowance,
        weekly: forecast.prudentWeeklyAllowance,
        daily: forecast.prudentDailyAllowance,
        remainingDays: forecast.remainingDays,
      },
    };
  },
};
