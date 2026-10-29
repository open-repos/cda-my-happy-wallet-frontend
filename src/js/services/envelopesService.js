import { apiPrivate } from "../../utils/axiosHelper";
import { parseCategory, parseOperation } from "./oneOffOperationsService";

const invalid = () => {
  throw new Error("Invalid envelope API response");
};
const id = (v) => Number.isSafeInteger(v) && v > 0;
const count = (v) => Number.isSafeInteger(v) && v >= 0;
const amount = (v) =>
  typeof v === "string" && /^-?(0|[1-9]\d{0,11})\.\d{2}$/.test(v);
const month = (v) =>
  typeof v === "string" && /^(19[7-9]\d|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(v);
const currency = (v) => typeof v === "string" && /^[A-Z]{3}$/.test(v);
const optionalAmount = (v) => v === null || amount(v);
export const parseEnvelopeMetrics = (v) => {
  if (
    !v ||
    ![v.planned, v.actual, v.remaining, v.overrun, v.projected].every(amount) ||
    !["AVAILABLE", "REACHED", "EXCEEDED"].includes(v.status) ||
    !(v.progress === null || (Number.isFinite(v.progress) && v.progress >= 0))
  )
    invalid();
  return {
    planned: v.planned,
    actual: v.actual,
    remaining: v.remaining,
    overrun: v.overrun,
    projected: v.projected,
    progress: v.progress,
    status: v.status,
  };
};
export const parseEnvelopeStatistics = (v) => {
  if (
    !v ||
    ![
      v.sampleMonths,
      v.completedMonthsObserved,
      v.unreconciledMonthsExcluded,
      v.incompleteMonthsExcluded,
      v.exceededMonths,
    ].every(count) ||
    ![v.meanActual, v.meanPlanned, v.meanVariance, v.meanOverrun].every(
      optionalAmount
    ) ||
    !(
      v.overrunRate === null ||
      (Number.isFinite(v.overrunRate) &&
        v.overrunRate >= 0 &&
        v.overrunRate <= 100)
    ) ||
    v.samplePolicy !== "COMPLETED_MONTHS_WITH_LINKED_OPERATIONS"
  )
    invalid();
  return { ...v };
};
export const parseEnvelopeOccurrence = (v) => {
  if (
    !id(v?.id) ||
    !id(v.sourceId) ||
    !month(v.month) ||
    !currency(v.currency) ||
    v.sourceType !== "ENVELOPE" ||
    v.kind !== "DEPENSE" ||
    typeof v.title !== "string" ||
    typeof v.closed !== "boolean" ||
    !count(v.operationCount) ||
    !(v.categoryId === null || id(v.categoryId))
  )
    invalid();
  return { ...v, metrics: parseEnvelopeMetrics(v.metrics) };
};
export const parseEnvelopeOverview = (v) => {
  if (
    !id(v?.id) ||
    typeof v.title !== "string" ||
    !currency(v.currency) ||
    !Array.isArray(v.months) ||
    v.months.length > 12 ||
    !count(v.totals?.observedMonths) ||
    !count(v.totals?.operationCount) ||
    !amount(v.totals?.sumMonthlyOverrun)
  )
    invalid();
  return {
    id: v.id,
    title: v.title,
    currency: v.currency,
    category: v.category === null ? null : parseCategory(v.category),
    totals: {
      ...parseEnvelopeMetrics(v.totals),
      observedMonths: v.totals.observedMonths,
      operationCount: v.totals.operationCount,
      sumMonthlyOverrun: v.totals.sumMonthlyOverrun,
    },
    statistics: parseEnvelopeStatistics(v.statistics),
    months: v.months.map((m) => {
      if (
        !id(m.occurrenceId) ||
        !month(m.month) ||
        !count(m.operationCount) ||
        !Array.isArray(m.paymentsPreview) ||
        m.paymentsPreview.length > 3
      )
        invalid();
      return {
        ...parseEnvelopeMetrics(m),
        occurrenceId: m.occurrenceId,
        month: m.month,
        operationCount: m.operationCount,
        paymentsPreview: m.paymentsPreview.map((p) => {
          if (
            !id(p.id) ||
            typeof p.title !== "string" ||
            !amount(p.amount) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(p.operationDate ?? "")
          )
            invalid();
          return {
            id: p.id,
            title: p.title,
            amount: p.amount,
            operationDate: p.operationDate,
          };
        }),
      };
    }),
  };
};
export const parseEnvelopeCategory = (v) => {
  if (!count(v?.id) || !Array.isArray(v.months) || v.months.length > 12)
    invalid();
  return {
    id: v.id,
    category: v.category === null ? null : parseCategory(v.category),
    statistics: parseEnvelopeStatistics(v.statistics),
    months: v.months.map((m) => {
      if (
        !month(m.month) ||
        ![m.planned, m.actual].every(amount) ||
        !count(m.operationCount) ||
        !count(m.unreconciledEnvelopes)
      )
        invalid();
      return { ...m };
    }),
  };
};
export const parseEnvelopePage = (v, parse) => {
  if (
    !Array.isArray(v?.data) ||
    !Number.isInteger(v.meta?.limit) ||
    v.meta.limit < 1 ||
    v.meta.limit > 100 ||
    typeof v.meta?.hasNext !== "boolean" ||
    !(v.meta.nextCursor === null || typeof v.meta.nextCursor === "string") ||
    (v.meta.hasNext && !v.meta.nextCursor)
  )
    invalid();
  return { data: v.data.map(parse), meta: v.meta };
};
const get = async (path, params = {}) =>
  (await apiPrivate.get(path, { params, withCredentials: true })).data;
const page = async (path, params, cursor, parse) =>
  parseEnvelopePage(
    await get(path, { ...params, limit: 20, ...(cursor ? { cursor } : {}) }),
    parse
  );
export const envelopesService = {
  overview: (params, cursor = null) =>
    page("/envelope-overview", params, cursor, parseEnvelopeOverview),
  analytics: (params, cursor = null) =>
    page("/envelope-analytics", params, cursor, parseEnvelopeCategory),
  occurrences: async (params, cursor = null) => {
    const { month, ...query } = params;
    const payload = await get(`/reconciliation/months/${month}/occurrences`, {
      ...query,
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    if (
      payload.integration?.mode !== "INTEGRATED" ||
      payload.integration?.globalBudgetAdjusted !== true
    )
      invalid();
    return parseEnvelopePage(payload, parseEnvelopeOccurrence);
  },
  async allOccurrences(params) {
    const rows = [],
      seen = new Set();
    let cursor = null;
    do {
      const p = await this.occurrences(params, cursor);
      rows.push(...p.data);
      cursor = p.meta.hasNext ? p.meta.nextCursor : null;
      if (cursor && seen.has(cursor)) invalid();
      if (cursor) seen.add(cursor);
    } while (cursor);
    return rows;
  },
  async occurrence(id) {
    return parseEnvelopeOccurrence(
      (await get(`/reconciliation/occurrences/${id}`)).data
    );
  },
  async link(id) {
    const v = (await get(`/operations/${id}/reconciliation`)).data;
    if (
      v?.operationId !== id ||
      !(
        v.occurrenceId === null ||
        (Number.isSafeInteger(v.occurrenceId) && v.occurrenceId > 0)
      )
    )
      invalid();
    return v;
  },
  payments: ({ occurrenceId, unassociated = false }, cursor = null) =>
    page(
      `/reconciliation/occurrences/${occurrenceId}/operations`,
      { unassociated },
      cursor,
      (v) => {
        if (!(v?.occurrenceId === null || id(v?.occurrenceId))) invalid();
        return { ...parseOperation(v), occurrenceId: v.occurrenceId };
      }
    ),
  async setLink(operationId, occurrenceId, expectedOccurrenceId) {
    await apiPrivate.put(
      `/operations/${operationId}/reconciliation`,
      { occurrenceId, expectedOccurrenceId },
      { withCredentials: true }
    );
  },
  async archive(id) {
    await apiPrivate.delete(`/budget-envelopes/${id}`, {
      withCredentials: true,
    });
  },
};
const errors = {
  PERIOD_CLOSED:
    "Ce mois est clôturé : ses rattachements ne sont plus modifiables.",
  ASSOCIATION_CONFLICT:
    "Le rattachement a changé entre-temps. Actualisez avant de réessayer.",
  CURRENCY_MISMATCH: "La dépense et l’enveloppe doivent avoir la même devise.",
  TYPE_MISMATCH: "Seule une dépense peut être rattachée à une enveloppe.",
  PERIOD_MISMATCH: "Choisissez une enveloppe du même mois que la dépense.",
  LINKED_OPERATION_INCOMPATIBLE:
    "Le rattachement est incompatible : dissociez ou choisissez une enveloppe de la nouvelle période.",
  NOT_BUDGET_ENVELOPE: "Cette charge n’est pas une enveloppe budgétaire.",
  INVALID_BUDGET_ENVELOPE: "Une enveloppe doit être une charge mensuelle.",
  ENVELOPE_IN_USE:
    "Cette enveloppe contient des dépenses liées. Préparez sa modification pour un mois sans rattachement incompatible.",
  INVALID_EFFECTIVE_MONTH:
    "Choisissez le mois courant ou l’un des 23 mois suivants.",
};
export const envelopeErrorMessage = (
  error,
  fallback = "Impossible de charger les enveloppes. Réessayez."
) => errors[error?.response?.data?.error?.details?.code] ?? fallback;
