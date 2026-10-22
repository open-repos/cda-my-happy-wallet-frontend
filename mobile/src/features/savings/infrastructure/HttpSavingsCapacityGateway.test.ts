import { describe, expect, it, vi } from "vitest";

import { HttpSavingsCapacityGateway } from "@/src/features/savings/infrastructure/HttpSavingsCapacityGateway";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const capacity = (afterPlanned = "700.00", referenceDate = "2026-10-19") => ({
  data: {
    from: "2026-10",
    currency: "EUR",
    referenceDate,
    totalPlannedMonthlyContribution: "150.00",
    totalRequiredMonthlyContribution: "180.00",
    unassessableCount: 0,
    goals: [],
    months: [
      {
        month: "2026-10",
        beforeGoals: "850.00",
        afterPlanned,
        afterRequired: "670.00",
        sustainability: "TENABLE",
      },
    ],
  },
});
const forecast = {
  data: {
    from: "2026-10",
    currency: "EUR",
    referenceDate: "2026-10-19",
    currentRealRemaining: "850.00",
    months: [
      {
        month: "2026-10",
        fixedIncome: "2500.00",
        fixedExpense: "1200.00",
        base: "1300.00",
        carryIn: "0.00",
        plannedIncome: "0.00",
        plannedExpense: "450.00",
        goalSavings: "150.00",
        forecastResult: "700.00",
        forecastRemaining: "700.00",
        prudentDailyAllowance: "53.85",
        prudentWeeklyAllowance: "376.92",
        prudentMonthlyAllowance: "700.00",
        remainingDays: 13,
      },
    ],
  },
};
const route = (capacityBody: unknown) =>
  vi.fn((path: string) =>
    Promise.resolve(
      json(path.startsWith("/savings-capacity") ? capacityBody : forecast),
    ),
  );

describe("HttpSavingsCapacityGateway (#217)", () => {
  it("combines the capacity with the matching forecast allowances", async () => {
    const request = route(capacity());
    await expect(
      new HttpSavingsCapacityGateway({ request }).overview("2026-10"),
    ).resolves.toMatchObject({
      allowances: {
        monthly: "700.00",
        weekly: "376.92",
        daily: "53.85",
        remainingDays: 13,
      },
    });
    expect(request).toHaveBeenCalledWith(
      "/savings-capacity?from=2026-10&months=1&currency=EUR",
    );
    expect(request).toHaveBeenCalledWith(
      "/budget-forecast?from=2026-10&months=1&currency=EUR",
    );
  });

  it("reads both sources in the simulation scenario (#240)", async () => {
    const request = route(capacity());
    await new HttpSavingsCapacityGateway({ request }).overview(
      "2026-10",
      "simulation",
    );
    expect(request.mock.calls.map(([path]) => path).sort()).toEqual([
      "/budget-forecast?from=2026-10&months=1&currency=EUR&scenario=simulation",
      "/savings-capacity?from=2026-10&months=1&currency=EUR&scenario=simulation",
    ]);
  });

  it("never combines two reads that straddle an edit", async () => {
    await expect(
      new HttpSavingsCapacityGateway({
        request: route(capacity("690.00")),
      }).overview("2026-10"),
    ).rejects.toThrow("Invalid savings capacity response");
    await expect(
      new HttpSavingsCapacityGateway({
        request: route(capacity("700.00", "2026-10-20")),
      }).overview("2026-10"),
    ).rejects.toThrow("Invalid savings capacity response");
  });
});
