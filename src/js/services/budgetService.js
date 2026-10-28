import { apiPrivate } from "../../utils/axiosHelper";
import { scenarioParams } from "../utils/budgetSimulation";

export const PENDING_PAGE_LIMIT = 100;

const signedAmount = /^-?(0|[1-9]\d{0,9})\.\d{2}$/;
const isAmount = (value) =>
  typeof value === "string" && signedAmount.test(value);
const isOptionalAmount = (value) => value === null || isAmount(value);
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
const isMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
const isCount = (value) => Number.isInteger(value) && value >= 0;
const isTimestamp = (value) =>
  value === null ||
  (typeof value === "string" && !Number.isNaN(Date.parse(value)));
const isPaginationMeta = (meta) =>
  Number.isInteger(meta?.limit) &&
  typeof meta?.hasNext === "boolean" &&
  (typeof meta?.nextCursor === "string" || meta?.nextCursor === null);

const invalid = (name) => {
  throw new Error(`Invalid ${name} response`);
};

const parseForecast = (forecast) => {
  if (forecast === null) return null;
  if (
    ![
      forecast?.plannedIncome,
      forecast?.plannedExpense,
      forecast?.goalSavings,
      forecast?.forecastRemaining,
    ].every(isAmount) ||
    !isOptionalAmount(forecast?.prudentDailyAllowance) ||
    !isCount(forecast?.unresolvedCount) ||
    !isCount(forecast?.overdueCount)
  ) {
    invalid("budget forecast");
  }
  return {
    plannedIncome: forecast.plannedIncome,
    plannedExpense: forecast.plannedExpense,
    goalSavings: forecast.goalSavings,
    forecastRemaining: forecast.forecastRemaining,
    prudentDailyAllowance: forecast.prudentDailyAllowance,
    unresolvedCount: forecast.unresolvedCount,
    overdueCount: forecast.overdueCount,
  };
};

const parseDay = (day) => {
  if (
    !isDate(day?.date) ||
    ![day?.income, day?.expense, day?.realRemaining].every(isAmount) ||
    ![day?.plannedIncome, day?.plannedExpense, day?.forecastRemaining].every(
      isOptionalAmount
    ) ||
    !(day?.plannedCount === null || isCount(day?.plannedCount))
  ) {
    invalid("budget day");
  }
  return {
    date: day.date,
    income: day.income,
    expense: day.expense,
    realRemaining: day.realRemaining,
    plannedIncome: day.plannedIncome,
    plannedExpense: day.plannedExpense,
    plannedCount: day.plannedCount,
    forecastRemaining: day.forecastRemaining,
  };
};

export const parseBudgetSummary = (summary) => {
  if (
    !isMonth(summary?.month) ||
    !/^[A-Z]{3}$/.test(summary?.currency || "") ||
    !["OPEN", "CLOSED"].includes(summary?.status) ||
    !["POSITIVE", "BALANCED", "NEGATIVE"].includes(summary?.balanceStatus) ||
    !Number.isInteger(summary?.revision) ||
    !isTimestamp(summary?.correctedAt) ||
    ![
      summary?.fixedIncome,
      summary?.fixedExpense,
      summary?.base,
      summary?.carryIn,
      summary?.actualIncome,
      summary?.actualExpense,
      summary?.monthResult,
      summary?.realRemaining,
    ].every(isAmount) ||
    !(summary?.carryFromMonth === null || isMonth(summary?.carryFromMonth)) ||
    !isCount(summary?.remainingDays) ||
    !isOptionalAmount(summary?.realDailyAllowance) ||
    !isCount(summary?.unresolvedEvents) ||
    !Array.isArray(summary?.days) ||
    summary.days.length > 31 ||
    (summary.reconciliationAdjustment !== undefined &&
      !isAmount(summary.reconciliationAdjustment))
  ) {
    invalid("budget summary");
  }
  return {
    month: summary.month,
    currency: summary.currency,
    status: summary.status,
    revision: summary.revision,
    correctedAt: summary.correctedAt,
    balanceStatus: summary.balanceStatus,
    fixedIncome: summary.fixedIncome,
    fixedExpense: summary.fixedExpense,
    base: summary.base,
    carryIn: summary.carryIn,
    carryFromMonth: summary.carryFromMonth,
    actualIncome: summary.actualIncome,
    actualExpense: summary.actualExpense,
    monthResult: summary.monthResult,
    realRemaining: summary.realRemaining,
    ...(summary.reconciliationAdjustment === undefined
      ? {}
      : { reconciliationAdjustment: summary.reconciliationAdjustment }),
    remainingDays: summary.remainingDays,
    realDailyAllowance: summary.realDailyAllowance,
    unresolvedEvents: summary.unresolvedEvents,
    forecast: parseForecast(summary.forecast),
    days: summary.days.map(parseDay),
  };
};

export const parsePendingOccurrence = (item) => {
  if (
    !Number.isInteger(item?.eventId) ||
    item.eventId <= 0 ||
    !isDate(item?.occurrenceDate) ||
    typeof item?.title !== "string" ||
    !isAmount(item?.amount) ||
    !/^[A-Z]{3}$/.test(item?.currency || "") ||
    !["DEPENSE", "ENTREE"].includes(item?.kind) ||
    typeof item?.overdue !== "boolean"
  ) {
    invalid("pending occurrence");
  }
  return {
    eventId: item.eventId,
    occurrenceDate: item.occurrenceDate,
    title: item.title,
    amount: item.amount,
    currency: item.currency,
    kind: item.kind,
    overdue: item.overdue,
  };
};

const KNOWN_ERROR_CODES = new Set([
  "FUTURE_PERIOD",
  "PERIOD_CLOSED",
  "OCCURRENCE_ALREADY_RESOLVED",
]);

/** Code métier stable porté par `error.details.code` dans une réponse d'erreur. */
export const budgetErrorCode = (error) => {
  const code = error?.response?.data?.error?.details?.code;
  return KNOWN_ERROR_CODES.has(code) ? code : null;
};

export const budgetService = {
  async getSummary(month, currency = "EUR", scenario = "standard") {
    const response = await apiPrivate.get(`/budget-periods/${month}/summary`, {
      params: { currency, ...scenarioParams(scenario) },
      withCredentials: true,
    });
    return parseBudgetSummary(response.data?.data);
  },

  /** Charge toute la file à traiter jusqu'à `through` (au plus 12 mois). */
  async listPending(through) {
    const items = [];
    const cursors = new Set();
    let cursor = null;
    do {
      const response = await apiPrivate.get("/event-occurrences/pending", {
        params: {
          through,
          limit: PENDING_PAGE_LIMIT,
          ...(cursor ? { cursor } : {}),
        },
        withCredentials: true,
      });
      if (
        !Array.isArray(response.data?.data) ||
        !isPaginationMeta(response.data?.meta)
      ) {
        invalid("pending occurrence collection");
      }
      items.push(...response.data.data.map(parsePendingOccurrence));
      cursor = response.data.meta.hasNext
        ? response.data.meta.nextCursor
        : null;
      if (cursor && cursors.has(cursor)) throw new Error("Repeated cursor");
      if (cursor) cursors.add(cursor);
    } while (cursor);
    return items;
  },

  async realizeOccurrence(eventId, occurrenceDate, body) {
    await apiPrivate.post(
      `/event-occurrences/${eventId}/${occurrenceDate}/realize`,
      body,
      { withCredentials: true }
    );
  },

  async cancelOccurrence(eventId, occurrenceDate) {
    await apiPrivate.post(
      `/event-occurrences/${eventId}/${occurrenceDate}/cancel`,
      {},
      { withCredentials: true }
    );
  },
};
