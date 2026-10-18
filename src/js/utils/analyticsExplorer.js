/**
 * État de l'explorateur de graphiques : choix conservés dans l'URL, presets
 * de période en dates civiles et bornes identiques à celles de l'API
 * `GET /v1/analytics/operations`.
 */

export const ANALYTICS_CURRENCY = "EUR";

export const METRICS = [
  { value: "expense", label: "Dépenses" },
  { value: "income", label: "Entrées" },
  { value: "net", label: "Solde net" },
];

export const GROUPINGS = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Année" },
  { value: "category", label: "Catégorie" },
  { value: "kind", label: "Type d’opération" },
];

export const SPLITS = [
  { value: "none", label: "Aucune" },
  { value: "category", label: "Par catégorie" },
  { value: "kind", label: "Par type" },
];

export const CHART_TYPES = [
  { value: "bar", label: "Barres" },
  { value: "stacked", label: "Barres empilées" },
  { value: "line", label: "Lignes" },
  { value: "area", label: "Aires" },
  { value: "pie", label: "Secteurs" },
];

export const PERIODS = [
  { value: "month", label: "Ce mois" },
  { value: "3m", label: "3 derniers mois" },
  { value: "12m", label: "12 derniers mois" },
  { value: "year", label: "Année civile" },
  { value: "custom", label: "Personnalisée" },
];

const TEMPORAL = ["day", "week", "month", "year"];
const MAX_POINTS = 500;
const DAY_MS = 86400000;

export const isTemporal = (groupBy) => TEMPORAL.includes(groupBy);

const valuesOf = (options) => options.map((option) => option.value);
const pick = (value, options, fallback) =>
  valuesOf(options).includes(value) ? value : fallback;

const pad = (value) => String(value).padStart(2, "0");
const toTime = (date) => Date.parse(`${date}T00:00:00.000Z`);
const monthIndex = (date) =>
  Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
const monthStart = (index) =>
  `${Math.floor(index / 12)}-${pad((index % 12) + 1)}-01`;
const monthEnd = (index) => {
  const year = Math.floor(index / 12);
  const month = index % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${pad(month + 1)}-${pad(last)}`;
};

export const isCivilDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(toTime(value)) &&
  new Date(toTime(value)).toISOString().slice(0, 10) === value;

/** Date civile du jour, alignée sur l'horloge `Europe/Paris` du backend. */
export const parisToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

/** Bornes d'un preset; les mois sont toujours complets. */
export const resolvePeriod = (preset, today) => {
  const current = monthIndex(today);
  switch (preset) {
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

/**
 * Types de graphique pertinents. Les secteurs ne représentent pas un solde
 * net, qui peut être négatif.
 */
export const allowedChartTypes = (groupBy, splitBy, metric) => {
  if (!isTemporal(groupBy)) return metric === "net" ? ["bar"] : ["pie", "bar"];
  return splitBy === "none"
    ? ["bar", "line", "area"]
    : ["stacked", "line", "area"];
};

const weekStart = (date) => {
  const time = toTime(date);
  return time - ((new Date(time).getUTCDay() + 6) % 7) * DAY_MS;
};

const bucketCount = (from, to, groupBy) => {
  switch (groupBy) {
    case "day":
      return (toTime(to) - toTime(from)) / DAY_MS + 1;
    case "week":
      return (weekStart(to) - weekStart(from)) / (7 * DAY_MS) + 1;
    case "year":
      return Number(to.slice(0, 4)) - Number(from.slice(0, 4)) + 1;
    default:
      return monthIndex(to) - monthIndex(from) + 1;
  }
};

const LIMITS = {
  day: [366, "366 jours"],
  week: [156, "156 semaines"],
  month: [120, "120 mois"],
  category: [120, "120 mois"],
  kind: [120, "120 mois"],
  year: [30, "30 ans"],
};

/**
 * Explique pourquoi une période ne peut pas être demandée, ou `null`. Les
 * catégories d'une ventilation dépendent des données : seule l'API tranche.
 */
export const rangeProblem = (from, to, groupBy, splitBy) => {
  if (toTime(from) > toTime(to)) {
    return "La date de début doit précéder la date de fin.";
  }
  const [limit, label] = LIMITS[groupBy];
  const count = bucketCount(from, to, groupBy);
  if (count > limit) {
    return `Cette période est trop longue pour ce regroupement : ${label} au plus.`;
  }
  if (splitBy === "kind" && isTemporal(groupBy) && count * 2 > MAX_POINTS) {
    return "La ventilation par type dépasserait 500 points : réduisez la période ou choisissez un regroupement plus large.";
  }
  return null;
};

/** État normalisé depuis l'URL : toute valeur invalide prend sa valeur par défaut. */
export const parseExplorerParams = (params, today) => {
  const metric = pick(params.get("metric"), METRICS, "expense");
  // Le type d'opération n'apporte rien quand l'indicateur filtre déjà un sens.
  const requestedGroup = pick(params.get("groupBy"), GROUPINGS, "category");
  const groupBy =
    requestedGroup === "kind" && metric !== "net" ? "category" : requestedGroup;
  const requestedSplit = pick(params.get("splitBy"), SPLITS, "none");
  const splitBy =
    !isTemporal(groupBy) || (requestedSplit === "kind" && metric !== "net")
      ? "none"
      : requestedSplit;
  const allowed = allowedChartTypes(groupBy, splitBy, metric);
  const requestedChart = params.get("chart");
  const chart = allowed.includes(requestedChart) ? requestedChart : allowed[0];
  let period = pick(params.get("period"), PERIODS, "month");
  let range = resolvePeriod(period, today);
  if (period === "custom") {
    const from = params.get("from");
    const to = params.get("to");
    if (isCivilDate(from) && isCivilDate(to)) range = { from, to };
    else {
      period = "month";
      range = resolvePeriod(period, today);
    }
  }
  return { metric, groupBy, splitBy, chart, period, ...range };
};

export const toSearchParams = (state) => {
  const params = new URLSearchParams({
    metric: state.metric,
    groupBy: state.groupBy,
    splitBy: state.splitBy,
    chart: state.chart,
    period: state.period,
  });
  if (state.period === "custom") {
    params.set("from", state.from);
    params.set("to", state.to);
  }
  return params;
};

const KIND_OF_METRIC = { expense: "DEPENSE", income: "ENTREE" };

export const toApiQuery = (state) => ({
  from: state.from,
  to: state.to,
  currency: ANALYTICS_CURRENCY,
  groupBy: state.groupBy,
  ...(state.splitBy === "none" ? {} : { splitBy: state.splitBy }),
  ...(KIND_OF_METRIC[state.metric]
    ? { kind: KIND_OF_METRIC[state.metric] }
    : {}),
});

const KIND_LABELS = { DEPENSE: "Dépenses", ENTREE: "Entrées" };

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

/** Libellé français d'un seau ou d'une série. */
export const bucketLabel = ({ key, label }, dimension) => {
  switch (dimension) {
    case "day":
      return dateLabel.format(new Date(toTime(key)));
    case "week":
      return `Sem. du ${dateLabel.format(new Date(toTime(key)))}`;
    case "month":
      return monthLabel.format(new Date(toTime(`${key}-01`)));
    case "year":
      return key;
    case "kind":
      return KIND_LABELS[key] ?? key;
    default:
      return label ?? "Catégorie supprimée";
  }
};
