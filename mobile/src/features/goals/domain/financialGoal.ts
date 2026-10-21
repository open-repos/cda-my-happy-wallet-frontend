import { isCalendarDate } from "@/src/features/operations/domain/oneOffOperation";

export const GOAL_STATUSES = [
  "REACHED",
  "NO_DEADLINE",
  "ON_TRACK",
  "BEHIND",
  "MISSED",
] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  REACHED: "Atteint",
  NO_DEADLINE: "Sans échéance",
  ON_TRACK: "Dans les temps",
  BEHIND: "En retard",
  MISSED: "Échéance dépassée",
};

/** Prévision calculée par l'API (backend #21), jamais recalculée ici. */
export interface GoalForecast {
  referenceMonth: string;
  status: GoalStatus;
  remainingAmount: string;
  contributionsNeeded: number | null;
  estimatedReachMonth: string | null;
  requiredMonthlyContribution: string | null;
}

/** Objectif financier, contrat `GET /v1/goals` partagé avec le Web. */
export interface FinancialGoal {
  id: number;
  title: string;
  targetAmount: string;
  savedAmount: string;
  monthlyContribution: string;
  currency: string;
  targetDate: string | null;
  forecast: GoalForecast;
}

export interface GoalDraft {
  title: string;
  targetAmount: string;
  savedAmount: string;
  monthlyContribution: string;
  /** Date souhaitée, facultative. */
  targetDate: string | null;
}

export type GoalDraftErrors = Partial<Record<keyof GoalDraft, string>>;

const API_AMOUNT = /^(0|[1-9]\d{0,9})\.\d{2}$/;
const DRAFT_AMOUNT = /^(0|[1-9]\d{0,7})(?:\.\d{1,2})?$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isAmount = (value: unknown): value is string =>
  typeof value === "string" && API_AMOUNT.test(value);
const isMonth = (value: unknown): value is string =>
  typeof value === "string" && MONTH.test(value);
const isStatus = (value: unknown): value is GoalStatus =>
  GOAL_STATUSES.includes(value as GoalStatus);

const parseForecast = (value: unknown): GoalForecast => {
  if (
    !isRecord(value) ||
    !isMonth(value.referenceMonth) ||
    !isStatus(value.status) ||
    !isAmount(value.remainingAmount) ||
    !(
      value.contributionsNeeded === null ||
      (Number.isInteger(value.contributionsNeeded) &&
        Number(value.contributionsNeeded) >= 0)
    ) ||
    !(
      value.estimatedReachMonth === null || isMonth(value.estimatedReachMonth)
    ) ||
    !(
      value.requiredMonthlyContribution === null ||
      isAmount(value.requiredMonthlyContribution)
    )
  ) {
    throw new Error("Invalid goal response");
  }
  return {
    referenceMonth: value.referenceMonth,
    status: value.status,
    remainingAmount: value.remainingAmount,
    contributionsNeeded:
      value.contributionsNeeded === null
        ? null
        : Number(value.contributionsNeeded),
    estimatedReachMonth: value.estimatedReachMonth,
    requiredMonthlyContribution: value.requiredMonthlyContribution,
  };
};

export const parseFinancialGoal = (value: unknown): FinancialGoal => {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    Number(value.id) <= 0 ||
    typeof value.title !== "string" ||
    value.title.length < 2 ||
    value.title.length > 50 ||
    !isAmount(value.targetAmount) ||
    !isAmount(value.savedAmount) ||
    !isAmount(value.monthlyContribution) ||
    typeof value.currency !== "string" ||
    !/^[A-Z]{3}$/.test(value.currency) ||
    !(
      value.targetDate === null ||
      (typeof value.targetDate === "string" && isCalendarDate(value.targetDate))
    )
  ) {
    throw new Error("Invalid goal response");
  }
  return {
    id: Number(value.id),
    title: value.title,
    targetAmount: value.targetAmount,
    savedAmount: value.savedAmount,
    monthlyContribution: value.monthlyContribution,
    currency: value.currency,
    targetDate: value.targetDate,
    forecast: parseForecast(value.forecast),
  };
};

/** Pourcentage atteint, plafonné à 100 et arrondi à l'inférieur. */
export const goalPercent = (
  goal: Pick<FinancialGoal, "targetAmount" | "savedAmount">,
) => {
  const toCents = (amount: string) => Math.round(Number(amount) * 100);
  const target = toCents(goal.targetAmount);
  return target > 0
    ? Math.min(100, Math.floor((toCents(goal.savedAmount) * 100) / target))
    : 0;
};

export const formatGoalMoney = (amount: string, currency: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    Number(amount),
  );

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));

/** Phrase explicative de la prévision, identique au Web. */
export const forecastMessage = ({
  forecast,
  currency,
}: Pick<FinancialGoal, "forecast" | "currency">): string => {
  const reach = forecast.estimatedReachMonth
    ? monthLabel(forecast.estimatedReachMonth)
    : null;
  switch (forecast.status) {
    case "REACHED":
      return "Objectif atteint : votre épargne couvre le montant visé.";
    case "ON_TRACK":
      return reach
        ? `À ce rythme, objectif atteint en ${reach}, avant la date souhaitée.`
        : "À ce rythme, objectif atteint avant la date souhaitée.";
    case "BEHIND":
      return forecast.requiredMonthlyContribution
        ? `Le versement mensuel calculé pour tenir la date est de ${formatGoalMoney(
            forecast.requiredMonthlyContribution,
            currency,
          )}.`
        : "Le versement prévu ne suffit pas pour tenir la date.";
    case "MISSED":
      return "La date souhaitée est passée ou tombe ce mois-ci : plus aucun versement n’est possible avant elle.";
    default:
      return reach
        ? `À ce rythme, objectif atteint en ${reach}.`
        : "Ajoutez un versement mensuel pour estimer la date d’atteinte.";
  }
};

/** Accepte la virgule décimale saisie sur un clavier français. */
const decimal = (value: string) => value.trim().replace(",", ".");

/** Mêmes règles et messages que le formulaire Web des objectifs. */
export const validateGoalDraft = (draft: GoalDraft): GoalDraftErrors => {
  const errors: GoalDraftErrors = {};
  const title = draft.title.trim();
  if (title.length < 2 || title.length > 50) {
    errors.title = "Le titre doit contenir entre 2 et 50 caractères.";
  }
  const target = decimal(draft.targetAmount);
  if (!DRAFT_AMOUNT.test(target) || Number(target) <= 0) {
    errors.targetAmount =
      "Saisissez un montant cible positif, par exemple 1200 ou 1200,50.";
  }
  if (!DRAFT_AMOUNT.test(decimal(draft.savedAmount))) {
    errors.savedAmount =
      "Saisissez un montant positif ou nul, par exemple 0 ou 150,50.";
  }
  if (!DRAFT_AMOUNT.test(decimal(draft.monthlyContribution))) {
    errors.monthlyContribution =
      "Saisissez un versement positif ou nul, par exemple 0 ou 75,50.";
  }
  if (draft.targetDate != null && !isCalendarDate(draft.targetDate)) {
    errors.targetDate = "Choisissez une date valide.";
  }
  return errors;
};

export const toGoalPayload = (draft: GoalDraft) => ({
  title: draft.title.trim(),
  targetAmount: Number(decimal(draft.targetAmount)).toFixed(2),
  savedAmount: Number(decimal(draft.savedAmount)).toFixed(2),
  monthlyContribution: Number(decimal(draft.monthlyContribution)).toFixed(2),
  currency: "EUR",
  targetDate: draft.targetDate,
});
