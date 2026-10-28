// Contract of backend #140 (ef263fca): amounts and statistics are API values,
// not financial formulas reimplemented by a component or the mock server.
export const envelopeCategory = {
  id: 4,
  name: "Alimentation",
  color: "#43553A",
  icon: "solid:utensils",
  fixedKind: "CHARGE",
};
export const envelopeIntegration = {
  mode: "INTEGRATED",
  globalBudgetAdjusted: true,
  policy: "OPEN_RESERVED_CLOSED_MATCHED_ACTUAL",
};
export const envelopeMeta = { limit: 20, hasNext: false, nextCursor: null };
export const envelopeMetrics = {
  "0.00": {
    planned: "300.00",
    actual: "0.00",
    remaining: "300.00",
    overrun: "0.00",
    projected: "300.00",
    progress: 0,
    status: "AVAILABLE",
  },
  "223.00": {
    planned: "300.00",
    actual: "223.00",
    remaining: "77.00",
    overrun: "0.00",
    projected: "300.00",
    progress: 74.33,
    status: "AVAILABLE",
  },
  "333.00": {
    planned: "300.00",
    actual: "333.00",
    remaining: "0.00",
    overrun: "33.00",
    projected: "333.00",
    progress: 111,
    status: "EXCEEDED",
  },
  "400.00": {
    planned: "300.00",
    actual: "400.00",
    remaining: "0.00",
    overrun: "100.00",
    projected: "400.00",
    progress: 133.33,
    status: "EXCEEDED",
  },
};
export const emptyEnvelopeStatistics = {
  sampleMonths: 0,
  completedMonthsObserved: 0,
  unreconciledMonthsExcluded: 0,
  incompleteMonthsExcluded: 1,
  meanActual: null,
  meanPlanned: null,
  meanVariance: null,
  meanOverrun: null,
  exceededMonths: 0,
  overrunRate: null,
  samplePolicy: "COMPLETED_MONTHS_WITH_LINKED_OPERATIONS",
};
export const envelopeStatistics = {
  sampleMonths: 6,
  completedMonthsObserved: 6,
  unreconciledMonthsExcluded: 0,
  incompleteMonthsExcluded: 0,
  meanActual: "325.00",
  meanPlanned: "300.00",
  meanVariance: "25.00",
  meanOverrun: "30.00",
  exceededMonths: 4,
  overrunRate: 66.67,
  samplePolicy: "COMPLETED_MONTHS_WITH_LINKED_OPERATIONS",
};
export const envelopePayments = (month = "2026-10") => [
  {
    id: 1,
    title: "Carrefour",
    amount: "85.00",
    currency: "EUR",
    type: "DEPENSE",
    operationDate: `${month}-05`,
    categoryId: 4,
    occurrenceId: 41,
  },
  {
    id: 2,
    title: "Lidl",
    amount: "42.00",
    currency: "EUR",
    type: "DEPENSE",
    operationDate: `${month}-12`,
    categoryId: 4,
    occurrenceId: 41,
  },
  {
    id: 3,
    title: "Intermarché",
    amount: "96.00",
    currency: "EUR",
    type: "DEPENSE",
    operationDate: `${month}-18`,
    categoryId: 4,
    occurrenceId: 41,
  },
];
export const envelopeOccurrence = ({
  actual = "223.00",
  month = "2026-10",
  id = 41,
  sourceId = 7,
  closed = false,
} = {}) => ({
  id,
  sourceId,
  title: "Alimentation",
  month,
  currency: "EUR",
  kind: "DEPENSE",
  sourceType: "ENVELOPE",
  categoryId: 4,
  referenceTotal: "300.00",
  personalShare: "100.00",
  closed,
  operationCount: actual === "0.00" ? 0 : actual === "223.00" ? 3 : 4,
  metrics: { ...envelopeMetrics[actual] },
});
export const envelopeOverview = ({
  actual = "223.00",
  month = "2026-10",
  id = 7,
} = {}) => {
  const o = envelopeOccurrence({ actual, month, sourceId: id });
  return {
    id,
    title: "Alimentation",
    currency: "EUR",
    category: { ...envelopeCategory },
    totals: {
      ...o.metrics,
      observedMonths: 1,
      operationCount: o.operationCount,
      sumMonthlyOverrun: o.metrics.overrun,
    },
    statistics: { ...emptyEnvelopeStatistics },
    months: [
      {
        ...o.metrics,
        occurrenceId: o.id,
        month,
        categoryId: 4,
        operationCount: o.operationCount,
        paymentsPreview:
          actual === "0.00"
            ? []
            : envelopePayments(month).map(
                ({ id, title, amount, operationDate }) => ({
                  id,
                  title,
                  amount,
                  operationDate,
                })
              ),
        paymentsPath: "/reconciliation/occurrences/41/operations",
      },
    ],
  };
};
export const envelopeCategoryAnalysis = {
  id: 4,
  category: { ...envelopeCategory },
  statistics: { ...envelopeStatistics },
  months: ["280.00", "290.00", "320.00", "380.00", "350.00", "330.00"].map(
    (actual, i) => ({
      month: `2026-${String(i + 4).padStart(2, "0")}`,
      planned: "300.00",
      actual,
      operationCount: 2,
      unreconciledEnvelopes: 0,
    })
  ),
};
