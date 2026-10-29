import { parseAcknowledgedWrite } from "../utils/acknowledgedWrite";
import { apiPrivate } from "../../utils/axiosHelper";

export const GOALS_PAGE_LIMIT = 100;

const amount = /^(0|[1-9]\d{0,9})\.\d{2}$/;
const isAmount = (value) => typeof value === "string" && amount.test(value);
const isPaginationMeta = (meta) =>
  Number.isInteger(meta?.limit) &&
  typeof meta?.hasNext === "boolean" &&
  (typeof meta?.nextCursor === "string" || meta?.nextCursor === null);

const isOptionalAmount = (value) => value === null || isAmount(value);
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
const isMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
const isOptionalCount = (value) =>
  value === null || (Number.isInteger(value) && value >= 0);

export const GOAL_STATUSES = [
  "REACHED",
  "NO_DEADLINE",
  "ON_TRACK",
  "BEHIND",
  "MISSED",
];

const parseForecast = (forecast) => {
  if (
    !isMonth(forecast?.referenceMonth) ||
    !GOAL_STATUSES.includes(forecast?.status) ||
    !isAmount(forecast?.remainingAmount) ||
    !isOptionalCount(forecast?.contributionsNeeded) ||
    !(
      forecast?.estimatedReachMonth === null ||
      isMonth(forecast?.estimatedReachMonth)
    ) ||
    !isOptionalAmount(forecast?.requiredMonthlyContribution)
  ) {
    throw new Error("Invalid goal response");
  }
  return {
    referenceMonth: forecast.referenceMonth,
    status: forecast.status,
    remainingAmount: forecast.remainingAmount,
    contributionsNeeded: forecast.contributionsNeeded,
    estimatedReachMonth: forecast.estimatedReachMonth,
    requiredMonthlyContribution: forecast.requiredMonthlyContribution,
  };
};

/** DTO objectif financier (`docs/financial-goals.md` du backend). */
export const parseGoal = (goal) => {
  if (
    !Number.isInteger(goal?.id) ||
    goal.id <= 0 ||
    typeof goal?.title !== "string" ||
    goal.title.length < 2 ||
    goal.title.length > 50 ||
    !isAmount(goal?.targetAmount) ||
    !isAmount(goal?.savedAmount) ||
    !isAmount(goal?.monthlyContribution) ||
    !/^[A-Z]{3}$/.test(goal?.currency || "") ||
    !(goal?.targetDate === null || isDate(goal?.targetDate))
  ) {
    throw new Error("Invalid goal response");
  }
  return {
    id: goal.id,
    title: goal.title,
    targetAmount: goal.targetAmount,
    savedAmount: goal.savedAmount,
    monthlyContribution: goal.monthlyContribution,
    currency: goal.currency,
    targetDate: goal.targetDate,
    forecast: parseForecast(goal.forecast),
  };
};

/** Corps d'écriture : seuls les champs du contrat, jamais de propriétaire. */
const toBody = (goal) => ({
  title: goal.title,
  targetAmount: goal.targetAmount,
  savedAmount: goal.savedAmount,
  monthlyContribution: goal.monthlyContribution,
  currency: goal.currency,
  targetDate: goal.targetDate,
});

export const goalsService = {
  async listAllGoals() {
    const goals = [];
    const visitedCursors = new Set();
    let cursor = null;
    do {
      const response = await apiPrivate.get("/goals", {
        params: { limit: GOALS_PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
        withCredentials: true,
      });
      if (
        !Array.isArray(response.data?.data) ||
        !isPaginationMeta(response.data?.meta)
      ) {
        throw new Error("Invalid goal collection response");
      }
      goals.push(...response.data.data.map(parseGoal));
      cursor = response.data.meta.hasNext
        ? response.data.meta.nextCursor
        : null;
      if (cursor && visitedCursors.has(cursor)) {
        throw new Error("Repeated goal cursor");
      }
      if (cursor) visitedCursors.add(cursor);
    } while (cursor);
    return goals;
  },

  async createGoal(goal) {
    const response = await apiPrivate.post("/goals", toBody(goal), {
      withCredentials: true,
    });
    return parseAcknowledgedWrite(parseGoal, response.data?.data);
  },

  async updateGoal(id, goal) {
    const response = await apiPrivate.put(`/goals/${id}`, toBody(goal), {
      withCredentials: true,
    });
    return parseAcknowledgedWrite(parseGoal, response.data?.data);
  },

  async deleteGoal(id) {
    await apiPrivate.delete(`/goals/${id}`, { withCredentials: true });
  },
};
