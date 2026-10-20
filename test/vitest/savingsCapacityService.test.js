import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiPrivate } from "../../src/utils/axiosHelper";
import {
  savingsCapacityService,
  parseSavingsCapacity,
} from "../../src/js/services/savingsCapacityService";
import { budgetForecast, forecastMonth } from "./fixtures/budgetForecast";
import {
  savingsCapacity,
  savingsGoal,
  savingsOverview,
} from "./fixtures/savingsCapacity";

vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn() },
}));
const query = { from: "2026-10", currency: "EUR" };
const forecast = () => budgetForecast({ months: [forecastMonth()] });
beforeEach(() => vi.resetAllMocks());
const respond = (capacity = savingsCapacity(), projection = forecast()) => {
  apiPrivate.get.mockImplementation((url) =>
    Promise.resolve({
      data: { data: url === "/savings-capacity" ? capacity : projection },
    })
  );
};

describe("savings capacity boundary", () => {
  it("preserves nullable effort and signed gaps, excludes private fields", () => {
    const data = savingsCapacity({
      goals: [
        savingsGoal({ ownerId: 9, monthlyContributionGap: "-30.00" }),
        savingsGoal({
          id: 4,
          title: "Voyage",
          targetDate: null,
          requiredMonthlyContribution: null,
          monthlyContributionGap: null,
          includedInTotals: false,
          status: "NO_DEADLINE",
        }),
      ],
    });
    const parsed = parseSavingsCapacity({ ...data, ownerId: 9 });
    expect(parsed.goals[0].monthlyContributionGap).toBe("-30.00");
    expect(parsed.goals[1].monthlyContributionGap).toBeNull();
    expect(JSON.stringify(parsed)).not.toMatch(/ownerId/);
  });

  it.each([
    { totalPlannedMonthlyContribution: 150 },
    { totalRequiredMonthlyContribution: "NaN" },
    { unassessableCount: -1 },
    { goals: [savingsGoal({ requiredMonthlyContribution: "-1.00" })] },
    { goals: [savingsGoal(), savingsGoal()] },
    { goals: [savingsGoal({ targetDate: "2026-02-30" })] },
    { months: [{ ...savingsCapacity().months[0], sustainability: "SAFE" }] },
    {
      months: [
        { ...savingsCapacity().months[0], afterPlanned: "90071992547410.00" },
      ],
    },
    { months: [] },
  ])("rejects malformed financial data %#", (overrides) => {
    expect(() => parseSavingsCapacity(savingsCapacity(overrides))).toThrow();
  });

  it("joins authoritative allowances with capacity for the same current snapshot", async () => {
    respond();
    await expect(savingsCapacityService.overview(query)).resolves.toEqual(
      savingsOverview()
    );
    expect(apiPrivate.get).toHaveBeenCalledWith("/savings-capacity", {
      params: { ...query, months: 1 },
      withCredentials: true,
    });
    expect(apiPrivate.get).toHaveBeenCalledWith("/budget-forecast", {
      params: { ...query, months: 1 },
      withCredentials: true,
    });
  });

  it.each([
    { referenceDate: "2026-10-20" },
    {
      from: "2026-11",
      months: [{ ...savingsCapacity().months[0], month: "2026-11" }],
    },
    { currency: "USD" },
    { months: [{ ...savingsCapacity().months[0], afterPlanned: "701.00" }] },
  ])("refuses to mix inconsistent snapshots %#", async (overrides) => {
    respond(savingsCapacity(overrides));
    await expect(savingsCapacityService.overview(query)).rejects.toThrow();
  });
});
