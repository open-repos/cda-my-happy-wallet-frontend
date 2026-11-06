import {
  isForecastAmount,
  isForecastDate,
  isForecastMonth,
} from "@/src/features/forecast/domain/budgetForecast";

export type Sustainability =
  | "TENABLE"
  | "TENDU"
  | "NON_TENABLE"
  | "INDETERMINE";

/** Indicateur et explication, mêmes phrases que le Web. */
export const SUSTAINABILITY: Record<Sustainability, [string, string]> = {
  TENABLE: [
    "Tenable",
    "Les soldes après versements prévus et requis sont tous deux strictement positifs.",
  ],
  TENDU: [
    "Tendu",
    "Au moins un des soldes après versements prévus ou requis est nul, sans solde négatif.",
  ],
  NON_TENABLE: [
    "Non tenable",
    "Au moins un solde après versements prévus ou requis est négatif.",
  ],
  INDETERMINE: [
    "Indéterminé",
    "Au moins une échéance absente ou déjà atteinte empêche le calcul du versement requis, sans déficit déjà établi.",
  ],
};

export interface SavingsGoal {
  id: number;
  title: string;
  targetDate: string | null;
  plannedMonthlyContribution: string;
  requiredMonthlyContribution: string | null;
  monthlyContributionGap: string | null;
  includedInTotals: boolean;
  status: "NO_DEADLINE" | "ON_TRACK" | "BEHIND" | "MISSED";
}

export interface SavingsMonth {
  month: string;
  beforeGoals: string;
  afterPlanned: string;
  afterRequired: string | null;
  sustainability: Sustainability;
}

/** Capacité d'épargne, contrat `GET /v1/savings-capacity` partagé avec le Web. */
export interface SavingsCapacity {
  from: string;
  currency: string;
  referenceDate: string;
  totalPlannedMonthlyContribution: string;
  totalRequiredMonthlyContribution: string | null;
  unassessableCount: number;
  goals: SavingsGoal[];
  months: [SavingsMonth];
}

/** Capacité et disponibles de la prévision du même mois (#110). */
export interface SavingsOverview extends SavingsCapacity {
  allowances: {
    monthly: string;
    weekly: string;
    daily: string;
    remainingDays: number;
  };
}

const GOAL_STATUSES = ["NO_DEADLINE", "ON_TRACK", "BEHIND", "MISSED"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const positive = (value: unknown): value is string =>
  isForecastAmount(value) && !value.startsWith("-");
const optional = (
  value: unknown,
  validator: (value: unknown) => boolean = isForecastAmount,
) => value === null || validator(value);

const invalid = (): never => {
  throw new Error("Invalid savings capacity response");
};

/** Lecture stricte : montants, écarts et indicateur sont calculés par l'API. */
export const parseSavingsCapacity = (value: unknown): SavingsCapacity => {
  if (
    !isRecord(value) ||
    !isForecastMonth(value.from) ||
    typeof value.currency !== "string" ||
    !/^[A-Z]{3}$/.test(value.currency) ||
    !isForecastDate(value.referenceDate) ||
    !positive(value.totalPlannedMonthlyContribution) ||
    !optional(value.totalRequiredMonthlyContribution, positive) ||
    !Number.isInteger(value.unassessableCount) ||
    Number(value.unassessableCount) < 0 ||
    !Array.isArray(value.goals) ||
    !Array.isArray(value.months) ||
    value.months.length !== 1
  ) {
    return invalid();
  }
  const ids = new Set<number>();
  const goals = value.goals.map((goal: unknown): SavingsGoal => {
    if (
      !isRecord(goal) ||
      !Number.isSafeInteger(goal.id) ||
      Number(goal.id) <= 0 ||
      ids.has(Number(goal.id)) ||
      typeof goal.title !== "string" ||
      goal.title.length < 2 ||
      goal.title.length > 50 ||
      !optional(goal.targetDate, isForecastDate) ||
      !positive(goal.plannedMonthlyContribution) ||
      !optional(goal.requiredMonthlyContribution, positive) ||
      !optional(goal.monthlyContributionGap) ||
      typeof goal.includedInTotals !== "boolean" ||
      !GOAL_STATUSES.includes(goal.status as string)
    ) {
      return invalid();
    }
    ids.add(Number(goal.id));
    return {
      id: Number(goal.id),
      title: goal.title,
      targetDate: goal.targetDate as string | null,
      plannedMonthlyContribution: goal.plannedMonthlyContribution,
      requiredMonthlyContribution: goal.requiredMonthlyContribution as
        | string
        | null,
      monthlyContributionGap: goal.monthlyContributionGap as string | null,
      includedInTotals: goal.includedInTotals,
      status: goal.status as SavingsGoal["status"],
    };
  });
  const month: unknown = value.months[0];
  if (
    !isRecord(month) ||
    month.month !== value.from ||
    !isForecastAmount(month.beforeGoals) ||
    !isForecastAmount(month.afterPlanned) ||
    !optional(month.afterRequired) ||
    !Object.keys(SUSTAINABILITY).includes(month.sustainability as string) ||
    Number(value.unassessableCount) > goals.length
  ) {
    return invalid();
  }
  return {
    from: value.from,
    currency: value.currency,
    referenceDate: value.referenceDate,
    totalPlannedMonthlyContribution: value.totalPlannedMonthlyContribution,
    totalRequiredMonthlyContribution: value.totalRequiredMonthlyContribution as
      | string
      | null,
    unassessableCount: Number(value.unassessableCount),
    goals,
    months: [
      {
        month: month.month,
        beforeGoals: month.beforeGoals,
        afterPlanned: month.afterPlanned,
        afterRequired: month.afterRequired as string | null,
        sustainability: month.sustainability as Sustainability,
      },
    ],
  };
};
