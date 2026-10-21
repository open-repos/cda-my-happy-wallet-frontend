import { apiPrivate } from "../../utils/axiosHelper";
import { isForecastMonth, shiftForecastMonth } from "../utils/budgetForecast";
import { scenarioParams } from "../utils/budgetSimulation";

const amountFields = [
  "fixedIncome",
  "fixedExpense",
  "base",
  "carryIn",
  "plannedIncome",
  "plannedExpense",
  "goalSavings",
  "forecastResult",
  "forecastRemaining",
  "prudentDailyAllowance",
  "prudentWeeklyAllowance",
  "prudentMonthlyAllowance",
];
const invalid = () => {
  throw new Error("Invalid budget forecast response");
};
export const isForecastAmount = (value) => {
  if (typeof value !== "string" || !/^-?(0|[1-9]\d{0,13})\.\d{2}$/.test(value))
    return false;
  const [whole, fraction] = value.replace(/^-/, "").split(".");
  return Number.isSafeInteger(Number(whole) * 100 + Number(fraction));
};
export const isForecastDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

export const parseBudgetForecast = (data) => {
  if (
    !isForecastMonth(data?.from) ||
    !/^[A-Z]{3}$/.test(data?.currency || "") ||
    !isForecastDate(data?.referenceDate) ||
    !isForecastAmount(data?.currentRealRemaining) ||
    !Array.isArray(data?.months) ||
    data.months.length > 24
  )
    invalid();
  const months = data.months.map((month, index) => {
    if (
      month?.month !== shiftForecastMonth(data.from, index) ||
      !amountFields.every((field) => isForecastAmount(month[field])) ||
      !Number.isInteger(month.remainingDays) ||
      month.remainingDays < 1 ||
      month.remainingDays > 31
    )
      invalid();
    return {
      month: month.month,
      ...Object.fromEntries(amountFields.map((field) => [field, month[field]])),
      remainingDays: month.remainingDays,
    };
  });
  return {
    from: data.from,
    currency: data.currency,
    referenceDate: data.referenceDate,
    currentRealRemaining: data.currentRealRemaining,
    months,
  };
};

export const budgetForecastService = {
  async forecast({
    from,
    months = 12,
    currency = "EUR",
    scenario = "standard",
  }) {
    if (
      !isForecastMonth(from) ||
      !Number.isInteger(months) ||
      months < 1 ||
      months > 24 ||
      !/^[A-Z]{3}$/.test(currency)
    )
      invalid();
    const response = await apiPrivate.get("/budget-forecast", {
      params: { from, months, currency, ...scenarioParams(scenario) },
      withCredentials: true,
    });
    const forecast = parseBudgetForecast(response.data?.data);
    if (
      forecast.from !== from ||
      forecast.currency !== currency ||
      (forecast.months.length !== 0 && forecast.months.length !== months)
    )
      invalid();
    return forecast;
  },
};
