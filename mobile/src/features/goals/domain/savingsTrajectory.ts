import {
  FinancialGoal,
  parseFinancialGoal,
} from "@/src/features/goals/domain/financialGoal";
import {
  isForecastAmount,
  isForecastDate,
  isForecastMonth,
  shiftMonth,
} from "@/src/features/forecast/domain/budgetForecast";

/**
 * Comparaison des trajectoires d'épargne sous hypothèses (#285), contrat
 * `POST /v1/savings-capacity/trajectories` (backend #132) partagé avec le Web
 * #284 (`src/js/services/savingsTrajectoryService.js`). Le serveur calcule
 * allocations, capacités, cumuls et dates ; rien n'est recalculé ici.
 */
export type TrajectoryScenario = "standard" | "simulation";
export type ProjectionKey = "planned" | "maximum" | "reasonable";
export const PROJECTION_KEYS: readonly ProjectionKey[] = [
  "planned",
  "maximum",
  "reasonable",
];
export const ASSUMPTION_KEYS = [
  "currentRemainingVariableExpense",
  "futureAdditionalVariableExpense",
  "monthlySafetyMargin",
] as const;
export type AssumptionKey = (typeof ASSUMPTION_KEYS)[number];
export type Assumptions = Record<AssumptionKey, string>;
export const ZERO_ASSUMPTIONS: Assumptions = {
  currentRemainingVariableExpense: "0.00",
  futureAdditionalVariableExpense: "0.00",
  monthlySafetyMargin: "0.00",
};
export const REACH_REASONS = [
  "REACHED",
  "PROJECTED",
  "NO_CONTRIBUTION",
  "OUTSIDE_HORIZON",
  "BUDGET_DEFICIT",
] as const;
export type ReachReason = (typeof REACH_REASONS)[number];

export interface TrajectoryRequest extends Assumptions {
  currency: string;
  scenario: TrajectoryScenario;
  /** Mois courant inclus : 12 ou 24 sur l'écran, 1 à 24 pour le serveur. */
  months: number;
  selectedGoalId: number;
}

export interface CurrentMonth {
  month: string;
  serverRemaining: string;
  reservedContributions: string;
  additionalVariableExpense: string;
  safetyMargin: string;
  remainingUnderAssumptions: string;
  cashBalance: string;
  protectedBalance: string;
  fundable: boolean;
}

export interface Allocation {
  goalId: number;
  reservedContribution: string;
  projectedContribution: string;
  projectedSavedAmount: string;
}

export interface ProjectedMonth {
  month: string;
  knownFlowBeforeGoals: string;
  carryIn: string;
  additionalVariableExpense: string;
  safetyMargin: string;
  capacityBeforeGoals: string;
  existingReservedContributions: string;
  freeSupplement: string;
  allocatedSupplement: string;
  selectedPossibleContribution: string;
  totalPossibleContributions: string;
  totalReservedContributions: string;
  selectedTotalContribution: string;
  carryOut: string;
  protectedBalance: string;
  fundable: boolean;
  allocations: Allocation[];
}

export interface TrajectoryPoint {
  month: string;
  savedAmount: string;
  fundable: boolean;
  kind: "DECLARED" | "PROJECTED";
}

export interface Projection {
  current: CurrentMonth;
  points: TrajectoryPoint[];
  months: ProjectedMonth[];
  estimatedReachMonth: string | null;
  scheduledReachMonth: string | null;
  reachReason: ReachReason;
}

export interface SavingsTrajectories {
  referenceDate: string;
  currency: string;
  scenario: TrajectoryScenario;
  selectedGoalId: number;
  assumptions: Assumptions;
  goals: FinancialGoal[];
  projections: Record<ProjectionKey, Projection>;
}

/** Objectif modifié pendant la lecture : ne pas le mêler à la jauge. */
export class StaleGoalError extends Error {
  public readonly code = "STALE_GOAL";
  public constructor() {
    super("Goal snapshot changed");
    this.name = "StaleGoalError";
  }
}

type Fields = Record<string, unknown>;
type Reader<T> = (value: unknown) => T;

const invalid = (): never => {
  throw new Error("Invalid savings trajectory response");
};
const record = (value: unknown): Fields =>
  typeof value === "object" && value !== null ? (value as Fields) : {};
const money: Reader<string> = (value) =>
  isForecastAmount(value) ? value : invalid();
const positive: Reader<string> = (value) =>
  isForecastAmount(value) && !value.startsWith("-") ? value : invalid();
const bool: Reader<boolean> = (value) =>
  typeof value === "boolean" ? value : invalid();
const id: Reader<number> = (value) =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : invalid();
const month: Reader<string> = (value) =>
  isForecastMonth(value) ? value : invalid();
const nullableMonth = (value: unknown) =>
  value === null ? null : month(value);

/** Lit uniquement les champs connus : les champs privés sont écartés. */
const fields = <T>(value: unknown, shape: { [K in keyof T]: Reader<T[K]> }) => {
  const source = record(value);
  return Object.fromEntries(
    Object.entries(shape).map(([key, read]) => [
      key,
      (read as Reader<unknown>)(source[key]),
    ]),
  ) as T;
};

const currentShape: { [K in keyof CurrentMonth]: Reader<CurrentMonth[K]> } = {
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
type MonthFields = Omit<ProjectedMonth, "allocations">;
const monthlyShape: { [K in keyof MonthFields]: Reader<MonthFields[K]> } = {
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
const allocationShape: { [K in keyof Allocation]: Reader<Allocation[K]> } = {
  goalId: id,
  reservedContribution: positive,
  projectedContribution: positive,
  projectedSavedAmount: positive,
};

const SNAPSHOT_KEYS = [
  "targetAmount",
  "savedAmount",
  "monthlyContribution",
  "targetDate",
  "title",
] as const;

const parseProjection = (
  value: unknown,
  request: TrajectoryRequest,
  referenceMonth: string,
  selected: FinancialGoal,
  ids: number[],
): Projection => {
  const source = record(value);
  if (
    !Array.isArray(source.points) ||
    source.points.length !== request.months ||
    !Array.isArray(source.months) ||
    source.months.length !== request.months - 1 ||
    !REACH_REASONS.includes(source.reachReason as ReachReason)
  ) {
    invalid();
  }
  const current = fields<CurrentMonth>(source.current, currentShape);
  if (current.month !== referenceMonth) invalid();
  const points = (source.points as unknown[]).map((raw, index) => {
    const point = record(raw);
    const parsed = fields<Omit<TrajectoryPoint, "kind">>(point, {
      month,
      savedAmount: positive,
      fundable: bool,
    });
    const kind = index === 0 ? "DECLARED" : "PROJECTED";
    if (
      parsed.month !== shiftMonth(referenceMonth, index) ||
      point.kind !== kind ||
      (index === 0 &&
        (parsed.savedAmount !== selected.savedAmount || !parsed.fundable))
    ) {
      invalid();
    }
    return { ...parsed, kind } as TrajectoryPoint;
  });
  const months = (source.months as unknown[]).map((raw, index) => {
    const row = record(raw);
    const parsed = fields<MonthFields>(row, monthlyShape);
    if (
      parsed.month !== points[index + 1].month ||
      !Array.isArray(row.allocations) ||
      row.allocations.length !== ids.length
    ) {
      invalid();
    }
    const allocations = (row.allocations as unknown[]).map((item) =>
      fields<Allocation>(item, allocationShape),
    );
    if (
      new Set(allocations.map((item) => item.goalId)).size !== ids.length ||
      allocations.some((item) => !ids.includes(item.goalId))
    ) {
      invalid();
    }
    const mine = allocations.find(
      (item) => item.goalId === request.selectedGoalId,
    )!;
    if (
      mine.projectedSavedAmount !== points[index + 1].savedAmount ||
      mine.projectedContribution !== parsed.selectedTotalContribution ||
      parsed.fundable !== points[index + 1].fundable
    ) {
      invalid();
    }
    return { ...parsed, allocations };
  });
  const estimatedReachMonth = nullableMonth(source.estimatedReachMonth);
  const scheduledReachMonth = nullableMonth(source.scheduledReachMonth);
  for (const date of [estimatedReachMonth, scheduledReachMonth]) {
    if (date !== null && !points.some((point) => point.month === date)) {
      invalid();
    }
  }
  if (
    estimatedReachMonth !== null &&
    !points.find((point) => point.month === estimatedReachMonth)!.fundable
  ) {
    invalid();
  }
  const reachReason = source.reachReason as ReachReason;
  if (
    (reachReason === "REACHED" || reachReason === "PROJECTED") !==
    (estimatedReachMonth !== null)
  ) {
    invalid();
  }
  return {
    current,
    points,
    months,
    estimatedReachMonth,
    scheduledReachMonth,
    reachReason,
  };
};

/**
 * Réponse cohérente avec la requête et, si fourni, avec l'objectif affiché :
 * un instantané différent lève `StaleGoalError`.
 */
export const parseSavingsTrajectories = (
  value: unknown,
  request: TrajectoryRequest,
  expectedGoal?: FinancialGoal,
): SavingsTrajectories => {
  const data = record(value);
  if (
    !isForecastDate(data.referenceDate) ||
    data.currency !== request.currency ||
    data.scenario !== request.scenario ||
    data.selectedGoalId !== request.selectedGoalId ||
    !Array.isArray(data.goals) ||
    data.goals.length === 0
  ) {
    invalid();
  }
  const referenceDate = data.referenceDate as string;
  const assumptions = fields<Assumptions>(data.assumptions, {
    currentRemainingVariableExpense: positive,
    futureAdditionalVariableExpense: positive,
    monthlySafetyMargin: positive,
  });
  if (ASSUMPTION_KEYS.some((key) => assumptions[key] !== request[key])) {
    invalid();
  }
  const goals = (data.goals as unknown[]).map((raw) => {
    const goal = record(raw);
    return parseFinancialGoal({
      ...goal,
      currency: data.currency,
      forecast: {
        ...record(goal.forecast),
        remainingAmount: goal.remainingAmount,
      },
    });
  });
  const ids = goals.map((goal) => goal.id);
  if (new Set(ids).size !== ids.length) invalid();
  const selected =
    goals.find((goal) => goal.id === request.selectedGoalId) ?? invalid();
  if (
    expectedGoal &&
    (expectedGoal.forecast.referenceMonth !== referenceDate.slice(0, 7) ||
      SNAPSHOT_KEYS.some((key) => selected[key] !== expectedGoal[key]))
  ) {
    throw new StaleGoalError();
  }
  const referenceMonth = referenceDate.slice(0, 7);
  const projections = record(data.projections);
  return {
    referenceDate,
    currency: data.currency as string,
    scenario: data.scenario as TrajectoryScenario,
    selectedGoalId: request.selectedGoalId,
    assumptions,
    goals,
    projections: {
      planned: parseProjection(
        projections.planned,
        request,
        referenceMonth,
        selected,
        ids,
      ),
      maximum: parseProjection(
        projections.maximum,
        request,
        referenceMonth,
        selected,
        ids,
      ),
      reasonable: parseProjection(
        projections.reasonable,
        request,
        referenceMonth,
        selected,
        ids,
      ),
    },
  };
};

/** Corps envoyé, identique au Web ; une requête invalide n'est pas émise. */
export const toTrajectoryBody = (request: TrajectoryRequest) => {
  const body: TrajectoryRequest = {
    currency: request.currency,
    scenario: request.scenario,
    months: request.months,
    selectedGoalId: request.selectedGoalId,
    currentRemainingVariableExpense: request.currentRemainingVariableExpense,
    futureAdditionalVariableExpense: request.futureAdditionalVariableExpense,
    monthlySafetyMargin: request.monthlySafetyMargin,
  };
  if (
    !/^[A-Z]{3}$/.test(body.currency) ||
    !["standard", "simulation"].includes(body.scenario) ||
    !Number.isInteger(body.months) ||
    body.months < 1 ||
    body.months > 24 ||
    !Number.isSafeInteger(body.selectedGoalId) ||
    body.selectedGoalId <= 0 ||
    ASSUMPTION_KEYS.some(
      (key) =>
        typeof body[key] !== "string" ||
        !/^(0|[1-9]\d{0,7})\.\d{2}$/.test(body[key]),
    )
  ) {
    throw new Error("Invalid savings trajectory request");
  }
  return body;
};

const DECIMAL = /^(\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:[.,](\d{1,2}))?$/;

/**
 * Saisie normalisée comme le Web (`parseHundredths`) : virgule ou point,
 * deux décimales au plus, espaces de groupement ; « 12,5 » → « 12.50 ».
 * `null` si négative, invalide ou au-delà de 99 999 999,99.
 */
export const normalizedAssumption = (value: string): string | null => {
  const match = DECIMAL.exec(value.trim());
  if (match == null) return null;
  const hundredths =
    Number(match[1].replace(/[ \u00a0\u202f]/g, "")) * 100 +
    Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(hundredths) || hundredths > 9999999999) return null;
  return `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`;
};

const monthName = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00.000Z`));

/** Date d'atteinte écrite comme le Web ; jamais une date non finançable. */
export const reachText = (projection: Projection): string => {
  if (projection.reachReason === "REACHED") return "Objectif déjà atteint";
  if (projection.estimatedReachMonth) {
    return monthName(projection.estimatedReachMonth);
  }
  return {
    NO_CONTRIBUTION: "Sans versement dans cette période",
    OUTSIDE_HORIZON: "Non atteint dans cet horizon",
    BUDGET_DEFICIT: "Budget déficitaire dans cet horizon",
    PROJECTED: "",
  }[projection.reachReason];
};

export const trajectoryMonthLabel = monthName;
