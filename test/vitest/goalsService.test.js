import { beforeEach, describe, expect, it, vi } from "vitest";
import { goalsService, parseGoal } from "../../src/js/services/goalsService";
import { apiPrivate } from "../../src/utils/axiosHelper";

vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const goal = {
  id: 3,
  title: "Vélo",
  targetAmount: "1200.00",
  savedAmount: "300.00",
  monthlyContribution: "150.00",
  currency: "EUR",
  targetDate: null,
  forecast: {
    referenceMonth: "2026-10",
    status: "NO_DEADLINE",
    remainingAmount: "900.00",
    contributionsNeeded: 6,
    estimatedReachMonth: "2027-04",
    requiredMonthlyContribution: null,
  },
};

const page = (
  data,
  meta = { limit: 100, hasNext: false, nextCursor: null }
) => ({
  data: { data, meta },
});

beforeEach(() => vi.clearAllMocks());

describe("goalsService", () => {
  it("parses the goal and its forecast without extra fields", () => {
    expect(parseGoal({ ...goal, ownerId: 9 })).toEqual({
      id: 3,
      title: "Vélo",
      targetAmount: "1200.00",
      savedAmount: "300.00",
      monthlyContribution: "150.00",
      currency: "EUR",
      targetDate: null,
      forecast: goal.forecast,
    });
  });

  it.each([
    { ...goal, id: 0 },
    { ...goal, targetAmount: "-1.00" },
    { ...goal, savedAmount: 300 },
    { ...goal, currency: "eur" },
    { ...goal, targetDate: "15/03/2027" },
    { ...goal, forecast: { ...goal.forecast, status: "LATE" } },
    { ...goal, forecast: { ...goal.forecast, estimatedReachMonth: "2027-13" } },
  ])("rejects an invalid goal %#", (invalid) => {
    expect(() => parseGoal(invalid)).toThrow("Invalid goal response");
  });

  it("loads every page of goals", async () => {
    apiPrivate.get
      .mockResolvedValueOnce(
        page([goal], { limit: 100, hasNext: true, nextCursor: "next" })
      )
      .mockResolvedValueOnce(page([{ ...goal, id: 4 }]));

    const goals = await goalsService.listAllGoals();

    expect(goals.map((item) => item.id)).toEqual([3, 4]);
    expect(apiPrivate.get).toHaveBeenLastCalledWith("/goals", {
      params: { limit: 100, cursor: "next" },
      withCredentials: true,
    });
  });

  it("rejects an invalid collection and a repeated cursor", async () => {
    apiPrivate.get.mockResolvedValueOnce({ data: { data: [] } });
    await expect(goalsService.listAllGoals()).rejects.toThrow(
      "Invalid goal collection response"
    );

    apiPrivate.get.mockResolvedValue(
      page([goal], { limit: 100, hasNext: true, nextCursor: "loop" })
    );
    await expect(goalsService.listAllGoals()).rejects.toThrow(
      "Repeated goal cursor"
    );
  });

  it("writes only contract fields and reads the saved goal", async () => {
    const draft = {
      title: "Vélo",
      targetAmount: "1200.00",
      savedAmount: "300.00",
      monthlyContribution: "150.00",
      currency: "EUR",
      targetDate: null,
      ownerId: 9,
    };
    apiPrivate.post.mockResolvedValue({ data: { data: goal } });
    apiPrivate.put.mockResolvedValue({ data: { data: goal } });

    await goalsService.createGoal(draft);
    await goalsService.updateGoal(3, draft);
    await goalsService.deleteGoal(3);

    const { ownerId, ...body } = draft;
    expect(ownerId).toBe(9);
    expect(apiPrivate.post).toHaveBeenCalledWith("/goals", body, {
      withCredentials: true,
    });
    expect(apiPrivate.put).toHaveBeenCalledWith("/goals/3", body, {
      withCredentials: true,
    });
    expect(apiPrivate.delete).toHaveBeenCalledWith("/goals/3", {
      withCredentials: true,
    });
  });
});
