/** Réponses du contrat `savings-accounts.md` (backend #183), pour les tests. */
export const savingsAccount = () => ({
  id: 1,
  name: "Voyage au Japon",
  currency: "EUR",
  initialBalanceMinorUnits: 150000,
  balanceMinorUnits: 243000,
  archived: false,
  goalId: 3 as number | null,
});

export const savingsMovement = () => ({
  id: 10,
  accountId: 1,
  currency: "EUR",
  type: "VIREMENT",
  direction: "TO_SAVINGS",
  amountMinorUnits: 25000,
  operationDate: "2026-11-07",
  reason: "MANUAL",
  idempotencyKey: "fixture-transfer-10",
});

export const currentAccount = () => ({
  type: "CURRENT",
  month: "2026-11",
  currency: "EUR",
  balanceMinorUnits: 124760,
  balanceBasis: "AVAILABLE_BUDGET",
  budget: {
    baseMinorUnits: 200000,
    carryInMinorUnits: 5000,
    actualIncomeMinorUnits: 0,
    actualExpenseMinorUnits: 80240,
  },
});

export const currentMovement = () => ({
  id: 7,
  source: "OPERATION",
  kind: "DEPENSE",
  title: "Courses",
  signedAmountMinorUnits: -6240,
  operationDate: "2026-11-09",
  currency: "EUR",
  accountId: null as number | null,
});

export const vaultPage = (
  data: unknown[],
  nextCursor: string | null = null,
) => ({
  data,
  meta: { limit: 20, hasNext: nextCursor !== null, nextCursor },
});
