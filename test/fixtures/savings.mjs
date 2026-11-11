export const savingsAccount = {
  id: 1,
  name: "Voyage au Japon",
  currency: "EUR",
  initialBalanceMinorUnits: 150000,
  balanceMinorUnits: 243000,
  archived: false,
  goalId: 3,
};
export const savingsGoal = {
  id: 3,
  title: "Voyage au Japon",
  targetAmount: "4000.00",
  savedAmount: "2430.00",
  monthlyContribution: "120.00",
  currency: "EUR",
  targetDate: null,
  savingsAccountId: 1,
  forecast: {
    referenceMonth: "2026-11",
    status: "NO_DEADLINE",
    remainingAmount: "1570.00",
    contributionsNeeded: 14,
    estimatedReachMonth: "2028-01",
    requiredMonthlyContribution: null,
  },
};
export const savingsMovement = {
  id: 10,
  accountId: 1,
  currency: "EUR",
  type: "VIREMENT",
  direction: "TO_SAVINGS",
  amountMinorUnits: 25000,
  operationDate: "2026-11-07",
  reason: "MANUAL",
  idempotencyKey: "fixture-transfer-10",
};
export const currentAccount = {
  type: "CURRENT",
  month: "2026-11",
  currency: "EUR",
  balanceMinorUnits: 124760,
  balanceBasis: "AVAILABLE_BUDGET",
  carryFromMonth: "2026-10",
  budget: {
    baseMinorUnits: 200000,
    carryInMinorUnits: 5000,
    actualIncomeMinorUnits: 0,
    actualExpenseMinorUnits: 80240,
  },
};
export const savingsPage = (data, nextCursor = null) => ({
  data,
  meta: { limit: 20, hasNext: nextCursor !== null, nextCursor },
});
