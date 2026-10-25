import { apiPrivate } from "../../utils/axiosHelper";
import { isForecastAmount, isForecastDate } from "./budgetForecastService";
import { parseGoal } from "./goalsService";
import { isForecastMonth, shiftForecastMonth } from "../utils/budgetForecast";

const invalid = () => {
  throw new Error("Invalid savings trajectory response");
};
const money = (value) => (isForecastAmount(value) ? value : invalid());
const positive = (value) =>
  isForecastAmount(value) && !value.startsWith("-") ? value : invalid();
const bool = (value) => (typeof value === "boolean" ? value : invalid());
const id = (value) =>
  Number.isSafeInteger(value) && value > 0 ? value : invalid();
const month = (value) => (isForecastMonth(value) ? value : invalid());
const nullableMonth = (value) => (value === null ? null : month(value));
const fields = (value, shape) =>
  Object.fromEntries(
    Object.entries(shape).map(([key, read]) => [key, read(value?.[key])])
  );
const currentShape = {
  month,
  serverRemaining: money,
  reservedContributions: positive,
  additionalVariableExpense: positive,
  safetyMargin: positive,
  remainingUnderAssumptions: money,
  cashBalance: money,
  protectedBalance: positive,
  fundable: bool,
};
const monthlyShape = {
  month,
  knownFlowBeforeGoals: money,
  carryIn: money,
  additionalVariableExpense: positive,
  safetyMargin: positive,
  capacityBeforeGoals: money,
  existingReservedContributions: positive,
  freeSupplement: money,
  allocatedSupplement: positive,
  selectedPossibleContribution: positive,
  totalPossibleContributions: positive,
  totalReservedContributions: positive,
  selectedTotalContribution: positive,
  carryOut: money,
  protectedBalance: positive,
  fundable: bool,
};
const reasons = [
  "REACHED",
  "PROJECTED",
  "NO_CONTRIBUTION",
  "OUTSIDE_HORIZON",
  "BUDGET_DEFICIT",
];
const assumptionKeys = [
  "currentRemainingVariableExpense",
  "futureAdditionalVariableExpense",
  "monthlySafetyMargin",
];

export const parseSavingsTrajectories = (data, request, expectedGoal) => {
  if (
    !isForecastDate(data?.referenceDate) ||
    data.currency !== request.currency ||
    data.scenario !== request.scenario ||
    data.selectedGoalId !== request.selectedGoalId ||
    !Array.isArray(data.goals) ||
    !data.goals.length
  )
    invalid();
  const assumptions = fields(
    data.assumptions,
    Object.fromEntries(assumptionKeys.map((key) => [key, positive]))
  );
  if (assumptionKeys.some((key) => assumptions[key] !== request[key]))
    invalid();
  const goals = data.goals.map((goal) =>
    parseGoal({
      ...goal,
      currency: data.currency,
      forecast: { ...goal?.forecast, remainingAmount: goal?.remainingAmount },
    })
  );
  const ids = goals.map((goal) => goal.id);
  if (new Set(ids).size !== ids.length) invalid();
  const selected = goals.find((goal) => goal.id === request.selectedGoalId);
  if (!selected) invalid();
  if (
    expectedGoal &&
    (expectedGoal.forecast.referenceMonth !== data.referenceDate.slice(0, 7) ||
      [
        "targetAmount",
        "savedAmount",
        "monthlyContribution",
        "targetDate",
        "title",
      ].some((key) => selected[key] !== expectedGoal[key]))
  ) {
    const error = new Error("Goal snapshot changed");
    error.code = "STALE_GOAL";
    throw error;
  }
  const referenceMonth = data.referenceDate.slice(0, 7);
  const projections = Object.fromEntries(
    ["planned", "maximum", "reasonable"].map((key) => {
      const source = data.projections?.[key];
      if (
        !source ||
        !Array.isArray(source.points) ||
        source.points.length !== request.months ||
        !Array.isArray(source.months) ||
        source.months.length !== request.months - 1 ||
        !reasons.includes(source.reachReason)
      )
        invalid();
      const current = fields(source.current, currentShape);
      if (current.month !== referenceMonth) invalid();
      const points = source.points.map((point, index) => {
        const parsed = fields(point, {
          month,
          savedAmount: positive,
          fundable: bool,
        });
        if (
          parsed.month !== shiftForecastMonth(referenceMonth, index) ||
          point.kind !== (index === 0 ? "DECLARED" : "PROJECTED") ||
          (index === 0 &&
            (parsed.savedAmount !== selected.savedAmount || !parsed.fundable))
        )
          invalid();
        return { ...parsed, kind: point.kind };
      });
      const months = source.months.map((row, index) => {
        const parsed = fields(row, monthlyShape);
        if (
          parsed.month !== points[index + 1].month ||
          !Array.isArray(row.allocations) ||
          row.allocations.length !== ids.length
        )
          invalid();
        const allocations = row.allocations.map((item) =>
          fields(item, {
            goalId: id,
            reservedContribution: positive,
            projectedContribution: positive,
            projectedSavedAmount: positive,
          })
        );
        if (
          new Set(allocations.map((item) => item.goalId)).size !== ids.length ||
          allocations.some((item) => !ids.includes(item.goalId))
        )
          invalid();
        const selectedAllocation = allocations.find(
          (item) => item.goalId === request.selectedGoalId
        );
        if (
          selectedAllocation.projectedSavedAmount !==
            points[index + 1].savedAmount ||
          selectedAllocation.projectedContribution !==
            parsed.selectedTotalContribution ||
          parsed.fundable !== points[index + 1].fundable
        )
          invalid();
        return { ...parsed, allocations };
      });
      const estimatedReachMonth = nullableMonth(source.estimatedReachMonth);
      const scheduledReachMonth = nullableMonth(source.scheduledReachMonth);
      for (const date of [estimatedReachMonth, scheduledReachMonth])
        if (date !== null && !points.some((point) => point.month === date))
          invalid();
      if (
        estimatedReachMonth &&
        !points.find((point) => point.month === estimatedReachMonth).fundable
      )
        invalid();
      if (
        ["REACHED", "PROJECTED"].includes(source.reachReason) !==
        (estimatedReachMonth !== null)
      )
        invalid();
      return [
        key,
        {
          current,
          points,
          months,
          estimatedReachMonth,
          scheduledReachMonth,
          reachReason: source.reachReason,
        },
      ];
    })
  );
  return {
    referenceDate: data.referenceDate,
    currency: data.currency,
    scenario: data.scenario,
    selectedGoalId: data.selectedGoalId,
    assumptions,
    goals,
    projections,
  };
};

export const savingsTrajectoryService = {
  async simulate(request, expectedGoal) {
    const body = {
      currency: request.currency,
      scenario: request.scenario,
      months: request.months,
      selectedGoalId: request.selectedGoalId,
      ...Object.fromEntries(assumptionKeys.map((key) => [key, request[key]])),
    };
    if (
      !/^[A-Z]{3}$/.test(body.currency) ||
      !["standard", "simulation"].includes(body.scenario) ||
      !Number.isInteger(body.months) ||
      body.months < 1 ||
      body.months > 24
    )
      invalid();
    id(body.selectedGoalId);
    if (
      assumptionKeys.some(
        (key) =>
          typeof body[key] !== "string" ||
          !/^(0|[1-9]\d{0,7})\.\d{2}$/.test(body[key])
      )
    )
      invalid();
    const response = await apiPrivate.post(
      "/savings-capacity/trajectories",
      body,
      { withCredentials: true }
    );
    return parseSavingsTrajectories(response.data?.data, body, expectedGoal);
  },
};
