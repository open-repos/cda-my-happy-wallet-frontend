import { describe, expect, it, vi } from "vitest";

import {
  ForecastRequestError,
  HttpBudgetForecastGateway,
} from "@/src/features/forecast/infrastructure/HttpBudgetForecastGateway";

const month = (value: string) => ({
  month: value,
  fixedIncome: "2500.00",
  fixedExpense: "1200.00",
  base: "1300.00",
  carryIn: "0.00",
  plannedIncome: "0.00",
  plannedExpense: "0.00",
  goalSavings: "0.00",
  forecastResult: "1300.00",
  forecastRemaining: "1300.00",
  prudentDailyAllowance: "41.93",
  prudentWeeklyAllowance: "293.54",
  prudentMonthlyAllowance: "1300.00",
  remainingDays: 31,
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const body = (months: unknown[], from = "2026-10") => ({
  data: {
    from,
    currency: "EUR",
    referenceDate: "2026-10-22",
    currentRealRemaining: "0.00",
    months,
  },
});

describe("HttpBudgetForecastGateway (#214)", () => {
  it("requests the Web query and checks the answer matches it", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        json(body([month("2026-10"), month("2026-11"), month("2026-12")])),
      );
    const gateway = new HttpBudgetForecastGateway({ request });
    await expect(
      gateway.forecast({ from: "2026-10", months: 3 }),
    ).resolves.toMatchObject({ from: "2026-10", months: expect.any(Array) });
    expect(request).toHaveBeenCalledWith(
      "/budget-forecast?from=2026-10&months=3&currency=EUR",
    );
  });

  it("accepts an empty forecast but rejects a partial or foreign one", async () => {
    const empty = vi.fn().mockResolvedValue(json(body([])));
    await expect(
      new HttpBudgetForecastGateway({ request: empty }).forecast({
        from: "2026-10",
        months: 3,
      }),
    ).resolves.toMatchObject({ months: [] });

    const partial = vi.fn().mockResolvedValue(json(body([month("2026-10")])));
    await expect(
      new HttpBudgetForecastGateway({ request: partial }).forecast({
        from: "2026-10",
        months: 3,
      }),
    ).rejects.toThrow("Invalid budget forecast response");

    const foreign = vi
      .fn()
      .mockResolvedValue(json(body([month("2026-11")], "2026-11")));
    await expect(
      new HttpBudgetForecastGateway({ request: foreign }).forecast({
        from: "2026-10",
        months: 1,
      }),
    ).rejects.toThrow("Invalid budget forecast response");
  });

  it("refuses an invalid query before calling the API", async () => {
    const request = vi.fn();
    const gateway = new HttpBudgetForecastGateway({ request });
    await expect(
      gateway.forecast({ from: "2026-13", months: 3 }),
    ).rejects.toThrow();
    await expect(
      gateway.forecast({ from: "2026-10", months: 25 }),
    ).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects an answer without data", async () => {
    const request = vi.fn().mockResolvedValue(json({}));
    await expect(
      new HttpBudgetForecastGateway({ request }).forecast({
        from: "2026-10",
        months: 3,
      }),
    ).rejects.toThrow("Invalid budget forecast response");
  });

  it("exposes the HTTP status of a failed request", async () => {
    const request = vi.fn().mockResolvedValue(json({}, 503));
    await expect(
      new HttpBudgetForecastGateway({ request }).forecast({
        from: "2026-10",
        months: 3,
      }),
    ).rejects.toEqual(new ForecastRequestError(503));
  });
});
