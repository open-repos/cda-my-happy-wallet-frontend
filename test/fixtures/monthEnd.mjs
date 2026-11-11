/** Contrat `GET/PUT /budget-periods/:month/decision` (backend #184). */
export const pendingDecision = (overrides = {}) => ({
  month: "2026-10",
  currency: "EUR",
  status: "PENDING",
  revision: 0,
  savings: [],
  coverage: [],
  exceptionalIncomeMinorUnits: 0,
  savingsMinorUnits: 0,
  coverageMinorUnits: 0,
  resultBeforeDecisionMinorUnits: 15000,
  referenceResultMinorUnits: 15000,
  carryMinorUnits: 15000,
  requiresReview: false,
  correctionDeltaMinorUnits: 0,
  ...overrides,
});

/** 150 € disponibles, 100 € épargnés → 50 € reportés. */
export const decidedDecision = (overrides = {}) =>
  pendingDecision({
    status: "DECIDED",
    revision: 1,
    savings: [{ accountId: 1, amountMinorUnits: 10000 }],
    savingsMinorUnits: 10000,
    carryMinorUnits: 5000,
    ...overrides,
  });

/** Dépense oubliée de 30 € : épargne inchangée, report 20 €. */
export const reviewDecision = () =>
  decidedDecision({
    resultBeforeDecisionMinorUnits: 12000,
    referenceResultMinorUnits: 15000,
    carryMinorUnits: 2000,
    requiresReview: true,
    correctionDeltaMinorUnits: -3000,
  });

/** Déficit 150 €, 50 € d'épargne et 70 € exceptionnels → −30 € reportés. */
export const deficitDecision = () =>
  pendingDecision({
    status: "DECIDED",
    revision: 1,
    coverage: [{ accountId: 2, amountMinorUnits: 5000 }],
    coverageMinorUnits: 5000,
    exceptionalIncomeMinorUnits: 7000,
    resultBeforeDecisionMinorUnits: -15000,
    referenceResultMinorUnits: -15000,
    carryMinorUnits: -3000,
  });

export const savingsOccurrence = (overrides = {}) => ({
  accountId: 1,
  goalId: 3,
  month: "2026-11",
  operationDate: "2026-11-01",
  title: "Voyage au Japon",
  amountMinorUnits: 12000,
  currency: "EUR",
  ...overrides,
});
