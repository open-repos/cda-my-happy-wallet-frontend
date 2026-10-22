import { describe, expect, it } from "vitest";

import {
  GoalDraft,
  GOAL_STATUS_LABELS,
  forecastMessage,
  goalPercent,
  parseFinancialGoal,
  toGoalPayload,
  validateGoalDraft,
} from "@/src/features/goals/domain/financialGoal";

const forecast = {
  referenceMonth: "2026-10",
  status: "ON_TRACK" as const,
  remainingAmount: "750.00",
  contributionsNeeded: 5,
  estimatedReachMonth: "2027-03",
  requiredMonthlyContribution: "150.00",
};
const goal = {
  id: 3,
  title: "Vélo",
  targetAmount: "1000.00",
  savedAmount: "250.00",
  monthlyContribution: "150.00",
  currency: "EUR",
  targetDate: "2027-06-30",
  forecast,
};
const draft = (overrides: Partial<GoalDraft> = {}): GoalDraft => ({
  title: "Vélo",
  targetAmount: "1000",
  savedAmount: "250,5",
  monthlyContribution: "150",
  targetDate: null,
  ...overrides,
});

describe("financial goal domain (#226)", () => {
  it("keeps only the public goal fields and its backend forecast", () => {
    expect(parseFinancialGoal({ ...goal, ownerId: 9 })).toEqual(goal);
    expect(
      parseFinancialGoal({
        ...goal,
        targetDate: null,
        forecast: {
          ...forecast,
          status: "NO_DEADLINE",
          contributionsNeeded: null,
          estimatedReachMonth: null,
          requiredMonthlyContribution: null,
        },
      }).forecast.status,
    ).toBe("NO_DEADLINE");
  });

  it("rejects malformed goals and forecasts", () => {
    expect(() => parseFinancialGoal({ ...goal, targetAmount: 1000 })).toThrow();
    expect(() =>
      parseFinancialGoal({ ...goal, forecast: undefined }),
    ).toThrow();
    expect(() =>
      parseFinancialGoal({
        ...goal,
        forecast: { ...forecast, status: "LATE" },
      }),
    ).toThrow();
    expect(() =>
      parseFinancialGoal({
        ...goal,
        forecast: { ...forecast, estimatedReachMonth: "2027-13" },
      }),
    ).toThrow();
  });

  it("rounds the reached share down and caps it at 100", () => {
    expect(goalPercent(goal)).toBe(25);
    expect(goalPercent({ ...goal, savedAmount: "999.99" })).toBe(99);
    expect(goalPercent({ ...goal, savedAmount: "1500.00" })).toBe(100);
  });

  it("explains the forecast like the Web", () => {
    expect(GOAL_STATUS_LABELS.BEHIND).toBe("En retard");
    expect(forecastMessage(goal)).toBe(
      "À ce rythme, objectif atteint en mars 2027, avant la date souhaitée.",
    );
    expect(
      forecastMessage({
        ...goal,
        forecast: { ...forecast, status: "BEHIND" },
      }).replace(/\s/g, " "),
    ).toBe("Le versement mensuel calculé pour tenir la date est de 150,00 €.");
    expect(
      forecastMessage({
        ...goal,
        forecast: {
          ...forecast,
          status: "NO_DEADLINE",
          estimatedReachMonth: null,
        },
      }),
    ).toBe("Ajoutez un versement mensuel pour estimer la date d’atteinte.");
  });

  it("validates with the Web rules and messages", () => {
    expect(validateGoalDraft(draft())).toEqual({});
    expect(
      validateGoalDraft(
        draft({
          title: "A",
          targetAmount: "0",
          savedAmount: "-1",
          monthlyContribution: "1.234",
          targetDate: "2026-02-30",
        }),
      ),
    ).toEqual({
      title: "Le titre doit contenir entre 2 et 50 caractères.",
      targetAmount:
        "Saisissez un montant cible positif, par exemple 1200 ou 1200,50.",
      savedAmount:
        "Saisissez un montant positif ou nul, par exemple 0 ou 150,50.",
      monthlyContribution:
        "Saisissez un versement positif ou nul, par exemple 0 ou 75,50.",
      targetDate: "Choisissez une date valide.",
    });
  });

  it("builds the API payload", () => {
    expect(toGoalPayload(draft({ title: " Vélo " }))).toEqual({
      title: "Vélo",
      targetAmount: "1000.00",
      savedAmount: "250.50",
      monthlyContribution: "150.00",
      currency: "EUR",
      targetDate: null,
    });
    expect(toGoalPayload(draft({ targetDate: "2027-06-30" })).targetDate).toBe(
      "2027-06-30",
    );
  });
});
