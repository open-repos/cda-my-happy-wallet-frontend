import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiPrivate } from "../../src/utils/axiosHelper";
import {
  budgetErrorCode,
  budgetService,
  parseBudgetSummary,
} from "../../src/js/services/budgetService";
import { oneOffOperationsService } from "../../src/js/services/oneOffOperationsService";

vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

export const summaryFixture = (overrides = {}) => ({
  month: "2026-10",
  currency: "EUR",
  status: "OPEN",
  revision: 1,
  correctedAt: null,
  balanceStatus: "POSITIVE",
  fixedIncome: "2000.00",
  fixedExpense: "800.00",
  base: "1200.00",
  carryIn: "-120.00",
  carryFromMonth: "2026-09",
  actualIncome: "0.00",
  actualExpense: "40.00",
  monthResult: "1160.00",
  realRemaining: "1040.00",
  remainingDays: 21,
  realDailyAllowance: "49.52",
  unresolvedEvents: 1,
  forecast: {
    plannedIncome: "0.00",
    plannedExpense: "300.00",
    goalSavings: "150.00",
    forecastRemaining: "590.00",
    prudentDailyAllowance: "28.10",
    unresolvedCount: 1,
    overdueCount: 1,
  },
  days: [
    {
      date: "2026-10-01",
      income: "0.00",
      expense: "40.00",
      realRemaining: "1040.00",
      plannedIncome: "0.00",
      plannedExpense: "0.00",
      plannedCount: 0,
      forecastRemaining: "890.00",
    },
  ],
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe("budgetService", () => {
  it("validates the summary contract, including a signed carry", async () => {
    apiPrivate.get.mockResolvedValueOnce({ data: { data: summaryFixture() } });
    const summary = await budgetService.getSummary("2026-10");
    expect(apiPrivate.get).toHaveBeenCalledWith(
      "/budget-periods/2026-10/summary",
      { params: { currency: "EUR" }, withCredentials: true }
    );
    expect(summary.carryIn).toBe("-120.00");
    expect(summary.forecast.goalSavings).toBe("150.00");
  });

  it("accepts a closed month without forecast and rejects malformed data", () => {
    expect(
      parseBudgetSummary(
        summaryFixture({
          status: "CLOSED",
          forecast: null,
          carryFromMonth: null,
          correctedAt: "2026-10-11T08:00:00.000Z",
        })
      ).forecast
    ).toBeNull();
    expect(() =>
      parseBudgetSummary(summaryFixture({ carryIn: "-1,20" }))
    ).toThrow();
    expect(() =>
      parseBudgetSummary(summaryFixture({ carryFromMonth: "2026-13" }))
    ).toThrow();
    expect(() =>
      parseBudgetSummary(
        summaryFixture({ days: Array.from({ length: 32 }, () => ({})) })
      )
    ).toThrow();
  });

  it("reads stable business error codes only", () => {
    const error = (code) => ({
      response: { data: { error: { details: { code } } } },
    });
    expect(budgetErrorCode(error("FUTURE_PERIOD"))).toBe("FUTURE_PERIOD");
    expect(budgetErrorCode(error("PERIOD_CLOSED"))).toBe("PERIOD_CLOSED");
    expect(budgetErrorCode(error("SOMETHING_ELSE"))).toBeNull();
    expect(budgetErrorCode(new Error("network"))).toBeNull();
  });

  it("follows pending cursors and sends occurrence commands", async () => {
    const item = {
      eventId: 8,
      occurrenceDate: "2026-10-05",
      title: "Loyer",
      amount: "300.00",
      currency: "EUR",
      kind: "DEPENSE",
      overdue: true,
    };
    apiPrivate.get
      .mockResolvedValueOnce({
        data: {
          data: [item],
          meta: { limit: 100, hasNext: true, nextCursor: "opaque" },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ ...item, occurrenceDate: "2026-10-20", overdue: false }],
          meta: { limit: 100, hasNext: false, nextCursor: null },
        },
      });
    await expect(budgetService.listPending("2026-10-31")).resolves.toHaveLength(
      2
    );
    expect(apiPrivate.get.mock.calls[1][1].params).toMatchObject({
      through: "2026-10-31",
      cursor: "opaque",
    });

    await budgetService.realizeOccurrence(8, "2026-10-05", { categoryId: 3 });
    expect(apiPrivate.post).toHaveBeenCalledWith(
      "/event-occurrences/8/2026-10-05/realize",
      { categoryId: 3 },
      { withCredentials: true }
    );
    await budgetService.cancelOccurrence(8, "2026-10-20");
    expect(apiPrivate.post).toHaveBeenLastCalledWith(
      "/event-occurrences/8/2026-10-20/cancel",
      {},
      { withCredentials: true }
    );
  });

  it("passes date and currency filters to the operation list", async () => {
    apiPrivate.get.mockResolvedValueOnce({
      data: { data: [], meta: { limit: 20, hasNext: false, nextCursor: null } },
    });
    await oneOffOperationsService.listOperations(null, {
      from: "2026-10-05",
      to: "2026-10-05",
      currency: "EUR",
    });
    expect(apiPrivate.get.mock.calls[0][1].params).toEqual({
      from: "2026-10-05",
      to: "2026-10-05",
      currency: "EUR",
      limit: 20,
    });
  });
});
