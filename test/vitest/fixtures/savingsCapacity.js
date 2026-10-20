export const savingsGoal = (overrides = {}) => ({
  id: 3,
  title: "Vélo",
  targetDate: "2027-03-15",
  plannedMonthlyContribution: "150.00",
  requiredMonthlyContribution: "180.00",
  monthlyContributionGap: "30.00",
  includedInTotals: true,
  status: "BEHIND",
  ...overrides,
});

export const savingsCapacity = (overrides = {}) => ({
  from: "2026-10",
  currency: "EUR",
  referenceDate: "2026-10-19",
  totalPlannedMonthlyContribution: "150.00",
  totalRequiredMonthlyContribution: "180.00",
  unassessableCount: 0,
  goals: [savingsGoal()],
  months: [
    {
      month: "2026-10",
      beforeGoals: "850.00",
      afterPlanned: "700.00",
      afterRequired: "670.00",
      sustainability: "TENABLE",
    },
  ],
  ...overrides,
});

export const savingsOverview = (overrides = {}) => ({
  ...savingsCapacity(),
  allowances: {
    monthly: "700.00",
    weekly: "376.92",
    daily: "53.85",
    remainingDays: 13,
  },
  ...overrides,
});
