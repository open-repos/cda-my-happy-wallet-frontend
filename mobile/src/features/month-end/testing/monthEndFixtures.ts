/**
 * Réponses du contrat `month-end-decisions.md` (backend #184), pour les
 * tests. Exemple de référence de #396 : octobre se termine à 150 €.
 */
export const pendingDecision = () => ({
  month: "2026-10",
  currency: "EUR",
  status: "PENDING",
  revision: 0,
  savings: [] as { accountId: number; amountMinorUnits: number }[],
  coverage: [] as { accountId: number; amountMinorUnits: number }[],
  exceptionalIncomeMinorUnits: 0,
  savingsMinorUnits: 0,
  coverageMinorUnits: 0,
  referenceResultMinorUnits: 15000,
  resultBeforeDecisionMinorUnits: 15000,
  carryMinorUnits: 15000,
  requiresReview: false,
  correctionDeltaMinorUnits: 0,
});

/** 150 € dont 100 € épargnés sur le compte 12 : 50 € reportés. */
export const decidedDecision = () => ({
  ...pendingDecision(),
  status: "DECIDED",
  revision: 1,
  savings: [{ accountId: 12, amountMinorUnits: 10000 }],
  savingsMinorUnits: 10000,
  carryMinorUnits: 5000,
});

/** Dépense oubliée de 30 € après la décision : épargne 100 €, report 20 €. */
export const correctedDecision = () => ({
  ...decidedDecision(),
  resultBeforeDecisionMinorUnits: 12000,
  carryMinorUnits: 2000,
  requiresReview: true,
  correctionDeltaMinorUnits: -3000,
});

/** Déficit de 150 € couvert par 50 € d'épargne et 70 € exceptionnels. */
export const coveredDeficit = () => ({
  ...pendingDecision(),
  status: "DECIDED",
  revision: 1,
  coverage: [{ accountId: 15, amountMinorUnits: 5000 }],
  coverageMinorUnits: 5000,
  exceptionalIncomeMinorUnits: 7000,
  referenceResultMinorUnits: -15000,
  resultBeforeDecisionMinorUnits: -15000,
  carryMinorUnits: -3000,
});

export const decisionAccount = (
  id: number,
  name: string,
  balanceMinorUnits: number,
  archived = false,
) => ({
  id,
  name,
  currency: "EUR",
  initialBalanceMinorUnits: 0,
  balanceMinorUnits,
  archived,
  goalId: null,
});
