/**
 * Explorateur d'analyses mobile (#215) : choix réduits du Web
 * (`src/js/utils/analyticsExplorer.js`), mêmes bornes que l'API
 * `GET /v1/analytics/operations`, vérifiées avant l'appel.
 */

export const ANALYTICS_CURRENCY = "EUR";

export type Metric = "expense" | "income" | "net";
export type Grouping = "day" | "week" | "month" | "category";
export type Period = "month" | "3m" | "12m" | "year";

export const METRICS: { value: Metric; label: string }[] = [
  { value: "expense", label: "Dépenses" },
  { value: "income", label: "Entrées" },
  { value: "net", label: "Solde net" },
];
export const GROUPINGS: { value: Grouping; label: string }[] = [
  { value: "category", label: "Catégorie" },
  { value: "month", label: "Mois" },
  { value: "week", label: "Semaine" },
  { value: "day", label: "Jour" },
];
export const PERIODS: { value: Period; label: string }[] = [
  { value: "month", label: "Ce mois" },
  { value: "3m", label: "3 derniers mois" },
  { value: "12m", label: "12 derniers mois" },
  { value: "year", label: "Année civile" },
];

export interface AnalyticsBucket {
  key: string;
  label: string | null;
  color: string | null;
  income: string;
  expense: string;
  net: string;
  count: number;
}

export interface Analytics {
  currency: string;
  from: string;
  to: string;
  groupBy: string;
  buckets: AnalyticsBucket[];
}

export interface AnalyticsQuery {
  from: string;
  to: string;
  currency: string;
  groupBy: Grouping;
  kind?: "DEPENSE" | "ENTREE";
}

const MAX_POINTS = 500;
const DAY_MS = 86_400_000;
const AMOUNT = /^-?(0|[1-9]\d{0,11})\.\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isAmount = (value: unknown): value is string =>
  typeof value === "string" && AMOUNT.test(value);
const isColor = (value: unknown): value is string | null =>
  value === null ||
  (typeof value === "string" && /^#[0-9A-F]{6}$/i.test(value));

const invalid = (): never => {
  throw new Error("Invalid analytics response");
};

const parseBucket = (value: unknown): AnalyticsBucket => {
  if (
    !isRecord(value) ||
    typeof value.key !== "string" ||
    !(value.label === null || typeof value.label === "string") ||
    !isColor(value.color) ||
    ![value.income, value.expense, value.net].every(isAmount) ||
    !Number.isInteger(value.count) ||
    Number(value.count) < 0
  ) {
    return invalid();
  }
  return {
    key: value.key,
    label: value.label,
    color: value.color,
    income: value.income as string,
    expense: value.expense as string,
    net: value.net as string,
    count: Number(value.count),
  };
};

/** Agrégat de l'API ; au plus 500 points, comme sur le Web. */
export const parseAnalytics = (value: unknown): Analytics => {
  if (
    !isRecord(value) ||
    typeof value.currency !== "string" ||
    !/^[A-Z]{3}$/.test(value.currency) ||
    typeof value.groupBy !== "string" ||
    typeof value.from !== "string" ||
    typeof value.to !== "string" ||
    !Array.isArray(value.buckets) ||
    value.buckets.length > MAX_POINTS
  ) {
    return invalid();
  }
  return {
    currency: value.currency,
    from: value.from,
    to: value.to,
    groupBy: value.groupBy,
    buckets: value.buckets.map(parseBucket),
  };
};

const pad = (value: number) => String(value).padStart(2, "0");
const toTime = (date: string) => Date.parse(`${date}T00:00:00.000Z`);
const monthIndex = (date: string) =>
  Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
const monthStart = (index: number) =>
  `${Math.floor(index / 12)}-${pad((index % 12) + 1)}-01`;
const monthEnd = (index: number) => {
  const year = Math.floor(index / 12);
  const month = index % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${pad(month + 1)}-${pad(last)}`;
};

/** Date civile du jour, alignée sur l'horloge `Europe/Paris` du backend. */
export const parisToday = (now: Date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

/** Bornes d'un preset ; les mois sont toujours complets. */
export const resolvePeriod = (period: Period, today: string) => {
  const current = monthIndex(today);
  switch (period) {
    case "3m":
      return { from: monthStart(current - 2), to: monthEnd(current) };
    case "12m":
      return { from: monthStart(current - 11), to: monthEnd(current) };
    case "year":
      return {
        from: `${today.slice(0, 4)}-01-01`,
        to: `${today.slice(0, 4)}-12-31`,
      };
    default:
      return { from: monthStart(current), to: monthEnd(current) };
  }
};

const weekStart = (date: string) => {
  const time = toTime(date);
  return time - ((new Date(time).getUTCDay() + 6) % 7) * DAY_MS;
};

const bucketCount = (from: string, to: string, groupBy: Grouping) => {
  switch (groupBy) {
    case "day":
      return (toTime(to) - toTime(from)) / DAY_MS + 1;
    case "week":
      return (weekStart(to) - weekStart(from)) / (7 * DAY_MS) + 1;
    default:
      return monthIndex(to) - monthIndex(from) + 1;
  }
};

const LIMITS: Record<Grouping, [number, string]> = {
  day: [366, "366 jours"],
  week: [156, "156 semaines"],
  month: [120, "120 mois"],
  category: [120, "120 mois"],
};

/** Explique pourquoi une période ne peut pas être demandée, ou `null`. */
export const rangeProblem = (
  from: string,
  to: string,
  groupBy: Grouping,
): string | null => {
  if (toTime(from) > toTime(to)) {
    return "La date de début doit précéder la date de fin.";
  }
  const [limit, label] = LIMITS[groupBy];
  if (bucketCount(from, to, groupBy) > limit) {
    return `Cette période est trop longue pour ce regroupement : ${label} au plus.`;
  }
  return null;
};

const KIND_OF_METRIC: Partial<Record<Metric, "DEPENSE" | "ENTREE">> = {
  expense: "DEPENSE",
  income: "ENTREE",
};

export const toApiQuery = (
  metric: Metric,
  groupBy: Grouping,
  range: { from: string; to: string },
): AnalyticsQuery => ({
  from: range.from,
  to: range.to,
  currency: ANALYTICS_CURRENCY,
  groupBy,
  ...(KIND_OF_METRIC[metric] ? { kind: KIND_OF_METRIC[metric] } : {}),
});

/** Valeur de l'indicateur en centimes signés, sans arrondi flottant. */
export const metricCents = (bucket: AnalyticsBucket, metric: Metric) => {
  const amount = bucket[metric];
  const [whole, fraction] = amount.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number(fraction);
  return amount.startsWith("-") ? -cents : cents;
};

const dateLabel = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const monthLabel = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Libellé français d'un seau, identique au Web. */
export const bucketLabel = (
  { key, label }: Pick<AnalyticsBucket, "key" | "label">,
  groupBy: Grouping,
): string => {
  switch (groupBy) {
    case "day":
      return dateLabel.format(new Date(toTime(key)));
    case "week":
      return `Sem. du ${dateLabel.format(new Date(toTime(key)))}`;
    case "month":
      return monthLabel.format(new Date(toTime(`${key}-01`)));
    default:
      return label ?? "Catégorie supprimée";
  }
};
