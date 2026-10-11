import { apiPrivate } from "../../utils/axiosHelper";

export const GOALS_PAGE_LIMIT = 100;

const amount = /^(0|[1-9]\d{0,9})\.\d{2}$/;
const isAmount = (value) => typeof value === "string" && amount.test(value);
const isPaginationMeta = (meta) =>
  Number.isInteger(meta?.limit) &&
  typeof meta?.hasNext === "boolean" &&
  (typeof meta?.nextCursor === "string" || meta?.nextCursor === null);

/** Lecture du DTO objectif limitée aux champs affichés par l'accueil. */
export const parseGoal = (goal) => {
  if (
    !Number.isInteger(goal?.id) ||
    goal.id <= 0 ||
    typeof goal?.title !== "string" ||
    goal.title.length < 2 ||
    goal.title.length > 50 ||
    !isAmount(goal?.targetAmount) ||
    !isAmount(goal?.savedAmount) ||
    !/^[A-Z]{3}$/.test(goal?.currency || "")
  ) {
    throw new Error("Invalid goal response");
  }
  return {
    id: goal.id,
    title: goal.title,
    targetAmount: goal.targetAmount,
    savedAmount: goal.savedAmount,
    currency: goal.currency,
  };
};

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
};
