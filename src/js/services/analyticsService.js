import { apiPrivate } from "../../utils/axiosHelper";

const amount = /^-?(0|[1-9]\d{0,11})\.\d{2}$/;
const isAmount = (value) => typeof value === "string" && amount.test(value);
const isOptionalText = (value) => value === null || typeof value === "string";
const isColor = (value) =>
  value === null ||
  (typeof value === "string" && /^#[0-9A-F]{6}$/i.test(value));

const invalid = () => {
  throw new Error("Invalid analytics response");
};

const parseTotals = (totals) => {
  if (
    typeof totals?.key !== "string" ||
    !isOptionalText(totals.label) ||
    !isColor(totals.color) ||
    ![totals.income, totals.expense, totals.net].every(isAmount) ||
    !Number.isInteger(totals.count) ||
    totals.count < 0
  ) {
    invalid();
  }
  return {
    key: totals.key,
    label: totals.label,
    color: totals.color,
    income: totals.income,
    expense: totals.expense,
    net: totals.net,
    count: totals.count,
  };
};

const parseBucket = (bucket) => ({
  ...parseTotals(bucket),
  ...(bucket.series === undefined
    ? {}
    : Array.isArray(bucket.series)
    ? { series: bucket.series.map(parseTotals) }
    : invalid()),
});

/** Agrégat `GET /v1/analytics/operations`; au plus 500 points. */
export const parseAnalytics = (data) => {
  if (
    !/^[A-Z]{3}$/.test(data?.currency || "") ||
    typeof data?.groupBy !== "string" ||
    !Array.isArray(data?.buckets) ||
    data.buckets.length > 500
  ) {
    invalid();
  }
  return {
    currency: data.currency,
    from: data.from,
    to: data.to,
    groupBy: data.groupBy,
    splitBy: data.splitBy ?? null,
    kind: data.kind ?? null,
    buckets: data.buckets.map(parseBucket),
  };
};

const KNOWN_CODES = new Set([
  "ANALYTICS_RANGE_TOO_LARGE",
  "ANALYTICS_QUERY_INVALID",
]);

/** Code métier stable de `error.details.code`, ou `null`. */
export const analyticsErrorCode = (error) => {
  const code = error?.response?.data?.error?.details?.code;
  return KNOWN_CODES.has(code) ? code : null;
};

export const analyticsService = {
  async operations(query) {
    const response = await apiPrivate.get("/analytics/operations", {
      params: query,
      withCredentials: true,
    });
    return parseAnalytics(response.data?.data);
  },
};
