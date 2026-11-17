import {
  BudgetSummary,
  money,
  toCents,
} from "@/src/features/budget/domain/budgetSummary";

/**
 * Reste à vivre actualisé comparé au théorique (#393, équivalent mobile de
 * #392, `src/js/utils/homeBudget.js` du Web). Tous les montants viennent du
 * résumé du serveur ; les seuls calculs sont les proratas Jour et Semaine,
 * en centimes entiers, avec la règle serveur de `dailyRemaining`.
 */
export type RemainingPeriod = "month" | "week" | "day";

export const REMAINING_PERIODS: { value: RemainingPeriod; label: string }[] = [
  { value: "month", label: "Mois" },
  { value: "week", label: "Semaine" },
  { value: "day", label: "Jour" },
];

const WEEK_DAYS = 7;

export const daysInMonth = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
};

const dayCount = (days: number) => `${days} jour${days > 1 ? "s" : ""}`;

/**
 * Part quotidienne du théorique en centimes, comme `dailyRemaining`
 * (BudgetForecast, backend) : `base ÷ jours du mois` tronqué vers zéro.
 */
export const theoreticalDailyShare = (summary: BudgetSummary) =>
  Math.trunc(toCents(summary.base) / daysInMonth(summary.month));

/** Jours couverts par la période : la semaine s'arrête à la fin du mois. */
const periodDays = (summary: BudgetSummary, period: RemainingPeriod) =>
  period === "week"
    ? Math.min(WEEK_DAYS, summary.remainingDays)
    : Math.min(1, summary.remainingDays);

/** Actualisé de la période en centimes, et la base qui l'explique. */
const actualOf = (summary: BudgetSummary, period: RemainingPeriod) => {
  const prudent = summary.forecast?.prudentDailyAllowance ?? null;
  const basis = prudent === null ? ("real" as const) : ("prudent" as const);
  if (period === "month") {
    return {
      cents: toCents(
        summary.forecast?.forecastRemaining ?? summary.realRemaining,
      ),
      basis,
      days: null,
      daily: null,
    };
  }
  const daily = prudent ?? summary.realDailyAllowance;
  const days = periodDays(summary, period);
  return {
    cents: daily === null || days === 0 ? null : toCents(daily) * days,
    basis,
    days,
    daily: daily === null ? null : toCents(daily),
  };
};

const theoreticalOf = (summary: BudgetSummary, period: RemainingPeriod) => {
  if (period === "month") return toCents(summary.base);
  const days = periodDays(summary, period);
  return days === 0 ? null : theoreticalDailyShare(summary) * days;
};

const captionOf = (period: RemainingPeriod, days: number | null) =>
  period === "month"
    ? "Reste à vivre du mois"
    : period === "day"
      ? "Reste à vivre aujourd’hui"
      : `Reste à vivre sur ${dayCount(
          days !== null && days > 0 && days < WEEK_DAYS ? days : WEEK_DAYS,
        )}`;

const differenceOf = (
  cents: number,
  period: RemainingPeriod,
  days: number | null,
  currency: string,
) => {
  const suffix =
    period === "day"
      ? "par jour"
      : period === "week"
        ? `sur ${dayCount(days ?? WEEK_DAYS)}`
        : "ce mois-ci";
  if (cents === 0) return `Égal à votre part théorique ${suffix}.`;
  return `${money(Math.abs(cents), currency)} ${
    cents < 0 ? "de moins" : "de plus"
  } ${suffix} que votre part théorique.`;
};

/** Mêmes phrases que le Web pour la part hebdomadaire ou journalière. */
const shareHelp = (
  summary: BudgetSummary,
  period: RemainingPeriod,
  actual: ReturnType<typeof actualOf>,
) => {
  const { currency } = summary;
  if (actual.cents === null || actual.daily === null || actual.days === null)
    return "Le mois est terminé : il ne reste aucun jour à répartir.";
  const spread =
    actual.basis === "prudent"
      ? `Le disponible prudent répartit votre reste prévisionnel (${money(
          toCents(summary.forecast!.forecastRemaining),
          currency,
        )}), qui tient compte des événements prévus et de l’épargne des objectifs,`
      : `Le disponible réel répartit votre reste réel (${money(
          toCents(summary.realRemaining),
          currency,
        )})`;
  return [
    `${money(actual.daily, currency)} par jour × ${dayCount(actual.days)}.`,
    `${spread} sur les ${dayCount(summary.remainingDays)} restants du mois, jour courant inclus.`,
    period === "week" && actual.days < WEEK_DAYS
      ? "La semaine est limitée aux jours restants du mois."
      : "",
    actual.cents < 0
      ? "Un montant négatif indique l’effort nécessaire pour finir le mois à l’équilibre."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
};

/**
 * Relie le reste réel au montant actualisé du mois. Le Web l'écrit sous le
 * détail du reste réel ; le mobile, qui garde la carte « Reste réel »
 * séparée, nomme ce montant.
 */
const monthHelp = (summary: BudgetSummary) => {
  const { forecast, currency } = summary;
  if (forecast === null) return "";
  return `Le reste à vivre actualisé (${money(
    toCents(forecast.forecastRemaining),
    currency,
  )}) part du reste réel (${money(
    toCents(summary.realRemaining),
    currency,
  )}), ajoute les entrées prévues et retire les dépenses prévues${
    forecast.envelopeReserve === undefined ? "" : ", la réserve des enveloppes"
  } et l’épargne des objectifs. Le détail du calcul donne chaque montant.`;
};

export interface RemainingComparison {
  caption: string;
  /** Montants formatés ; `null` sans jour restant à répartir. */
  actual: string | null;
  actualCents: number | null;
  theoretical: string | null;
  /** Remplissage de la barre, 0 à 100 ; `null` sans comparaison. */
  progress: number | null;
  progressLabel: string | null;
  difference: string | null;
  help: string;
}

export const remainingComparison = (
  summary: BudgetSummary,
  period: RemainingPeriod,
): RemainingComparison => {
  const { currency } = summary;
  const actual = actualOf(summary, period);
  const theoretical = theoreticalOf(summary, period);
  const compared = actual.cents !== null && theoretical !== null;
  const actualText =
    actual.cents === null ? null : money(actual.cents, currency);
  const theoreticalText =
    theoretical === null ? null : money(theoretical, currency);
  return {
    caption: captionOf(period, actual.days),
    actual: actualText,
    actualCents: actual.cents,
    theoretical: theoreticalText,
    progress: compared
      ? theoretical > 0
        ? Math.max(
            0,
            Math.min(100, Math.round((actual.cents! * 100) / theoretical)),
          )
        : 0
      : null,
    progressLabel: compared
      ? `Reste à vivre actualisé ${actualText} sur ${theoreticalText} théorique`
      : null,
    difference: compared
      ? differenceOf(actual.cents! - theoretical, period, actual.days, currency)
      : null,
    help:
      period === "month"
        ? monthHelp(summary)
        : shareHelp(summary, period, actual),
  };
};
