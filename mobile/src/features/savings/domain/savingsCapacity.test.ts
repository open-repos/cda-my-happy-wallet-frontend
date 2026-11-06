import { describe, expect, it } from "vitest";

import {
  SUSTAINABILITY,
  parseSavingsCapacity,
} from "@/src/features/savings/domain/savingsCapacity";

const goal = (overrides: Record<string, unknown> = {}) => ({
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
const capacity = (overrides: Record<string, unknown> = {}) => ({
  from: "2026-10",
  currency: "EUR",
  referenceDate: "2026-10-19",
  totalPlannedMonthlyContribution: "150.00",
  totalRequiredMonthlyContribution: "180.00",
  unassessableCount: 0,
  goals: [goal()],
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

describe("savings capacity domain (#217)", () => {
  it("keeps the public fields computed by the API", () => {
    const parsed = parseSavingsCapacity({
      ...capacity(),
      goals: [goal({ ownerId: 9 })],
    });
    expect(parsed.goals[0]).not.toHaveProperty("ownerId");
    expect(parsed.months[0].sustainability).toBe("TENABLE");
    expect(
      parseSavingsCapacity(
        capacity({
          totalRequiredMonthlyContribution: null,
          unassessableCount: 1,
          goals: [
            goal({
              targetDate: null,
              requiredMonthlyContribution: null,
              monthlyContributionGap: null,
              status: "NO_DEADLINE",
            }),
          ],
        }),
      ).goals[0].requiredMonthlyContribution,
    ).toBeNull();
  });

  it("rejects what the Web rejects", () => {
    expect(() =>
      parseSavingsCapacity(
        capacity({ totalPlannedMonthlyContribution: "-1.00" }),
      ),
    ).toThrow();
    expect(() =>
      parseSavingsCapacity(capacity({ goals: [goal(), goal()] })),
    ).toThrow();
    expect(() =>
      parseSavingsCapacity(capacity({ goals: [goal({ status: "REACHED" })] })),
    ).toThrow();
    expect(() =>
      parseSavingsCapacity(capacity({ unassessableCount: 2 })),
    ).toThrow();
    expect(() =>
      parseSavingsCapacity(
        capacity({
          months: [{ ...capacity().months[0], month: "2026-11" }],
        }),
      ),
    ).toThrow();
  });

  it("explains each sustainability indicator like the Web", () => {
    expect(SUSTAINABILITY.TENDU).toEqual([
      "Tendu",
      "Au moins un des soldes après versements prévus ou requis est nul, sans solde négatif.",
    ]);
    expect(Object.keys(SUSTAINABILITY)).toEqual([
      "TENABLE",
      "TENDU",
      "NON_TENABLE",
      "INDETERMINE",
    ]);
  });
});
