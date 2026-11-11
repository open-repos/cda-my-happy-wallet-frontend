// Fixtures de test reprises de `test/fixtures/envelopes.mjs` (Web #314) :
// valeurs serveur, jamais recalculées.
export const metrics = {
  available: {
    planned: "300.00",
    actual: "223.00",
    remaining: "77.00",
    overrun: "0.00",
    projected: "300.00",
    progress: 74.33,
    status: "AVAILABLE" as const,
  },
  exceeded: {
    planned: "300.00",
    actual: "333.00",
    remaining: "0.00",
    overrun: "33.00",
    projected: "333.00",
    progress: 111,
    status: "EXCEEDED" as const,
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

export const envelopeCategory = {
  id: 4,
  name: "Alimentation",
  color: "#43553A",
  icon: "solid:utensils",
  fixedKind: "CHARGE",
};

export const envelopePayment = (id = 1, month = "2026-10") => ({
  id,
  title: "Carrefour",
  amount: "85.00",
  currency: "EUR",
  type: "DEPENSE",
  operationDate: `${month}-05`,
  categoryId: 4,
  occurrenceId: 41,
});

export const envelopeOccurrence = (month = "2026-10") => ({
  id: 41,
  sourceId: 7,
  title: "Alimentation",
  month,
  currency: "EUR",
  kind: "DEPENSE",
  sourceType: "ENVELOPE",
  categoryId: 4,
  referenceTotal: "300.00",
  personalShare: "100.00",
  closed: false,
  operationCount: 3,
  metrics: { ...metrics.available },
});

export const envelopeOverview = (month = "2026-10") => ({
  id: 7,
  title: "Alimentation",
  currency: "EUR",
  category: { ...envelopeCategory },
  totals: {
    ...metrics.available,
    observedMonths: 1,
    operationCount: 3,
    sumMonthlyOverrun: "0.00",
  },
  statistics: { ...emptyEnvelopeStatistics },
  months: [
    {
      ...metrics.available,
      occurrenceId: 41,
      month,
      categoryId: 4,
      operationCount: 3,
      paymentsPreview: [1, 2, 3].map((id) => ({
        id,
        title: "Carrefour",
        amount: "85.00",
        operationDate: `${month}-0${id}`,
      })),
      paymentsPath: "/reconciliation/occurrences/41/operations",
    },
  ],
});
