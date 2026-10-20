import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiPrivate } from "../../src/utils/axiosHelper";
import {
  budgetForecastService,
  parseBudgetForecast,
} from "../../src/js/services/budgetForecastService";
import { budgetForecast, forecastMonth } from "./fixtures/budgetForecast";

vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn() },
}));
beforeEach(() => vi.resetAllMocks());

describe("multi-month forecast API boundary", () => {
  it("preserves signed amounts and every allowance while removing private fields", () => {
    const result = parseBudgetForecast({
      ...budgetForecast(),
      userId: 99,
      months: budgetForecast().months.map((month) => ({
        ...month,
        ownerId: 99,
      })),
    });
    expect(result).toEqual(budgetForecast());
    expect(JSON.stringify(result)).not.toMatch(/ownerId|userId/);
  });

  it.each([
    { months: [forecastMonth({ forecastRemaining: 700 })] },
    { months: [forecastMonth({ prudentWeeklyAllowance: "Infinity" })] },
    { months: [forecastMonth({ remainingDays: 0 })] },
    { months: [forecastMonth({ month: "2026-11" })] },
    { months: [forecastMonth(), forecastMonth({ month: "2026-12" })] },
    { months: [forecastMonth(), forecastMonth()] },
    { months: Array(25).fill(forecastMonth()) },
    { currency: "EU" },
    { referenceDate: "2026-02-30" },
  ])("rejects a malformed or inconsistent response %#", (overrides) => {
    expect(() => parseBudgetForecast(budgetForecast(overrides))).toThrow(
      "Invalid budget forecast response"
    );
  });

  it("uses the authenticated read route with a bounded explicit window", async () => {
    apiPrivate.get.mockResolvedValue({ data: { data: budgetForecast() } });
    await expect(
      budgetForecastService.forecast({
        from: "2026-10",
        months: 2,
        currency: "EUR",
      })
    ).resolves.toEqual(budgetForecast());
    expect(apiPrivate.get).toHaveBeenCalledWith("/budget-forecast", {
      params: { from: "2026-10", months: 2, currency: "EUR" },
      withCredentials: true,
    });
  });

  it("rejects a response belonging to another window or currency", async () => {
    apiPrivate.get.mockResolvedValue({
      data: { data: budgetForecast({ currency: "USD" }) },
    });
    await expect(
      budgetForecastService.forecast({
        from: "2026-10",
        months: 2,
        currency: "EUR",
      })
    ).rejects.toThrow();
    apiPrivate.get.mockResolvedValue({ data: { data: budgetForecast() } });
    await expect(
      budgetForecastService.forecast({
        from: "2026-11",
        months: 2,
        currency: "EUR",
      })
    ).rejects.toThrow();
  });

  it("preserves an explicitly empty forecast for the empty UI state", () => {
    expect(parseBudgetForecast(budgetForecast({ months: [] })).months).toEqual(
      []
    );
  });
});
